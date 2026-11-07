import { NextResponse } from "next/server"
import { z } from "zod"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"
import { startSpecialistRun } from "@/lib/horizon/business-consultant/start-run"
import { BUSINESS_SPECIALISTS } from "@/lib/horizon/business-consultant/specialists"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — start a specialist run.
 *
 * POST opens (or reuses) the owner's canonical business case and creates a
 * specialist run through the merged Agent Runs Engine. This is the producer that
 * makes the run engine and the Run Console live.
 *
 * It is rate-limited and creates *work*, not effects: the run starts
 * `awaiting_approval`, so nothing is executed or spent here. Approval happens in
 * the Run Console and execution is performed by the bounded dispatcher.
 */

const startSchema = z
  .object({
    specialist: z.enum(BUSINESS_SPECIALISTS),
    focus: z.string().trim().max(200).optional(),
    locale: z.enum(["bg", "de"]).optional(),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export async function POST(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }

  const rate = checkRateLimit(`business-consultant:start-run:user:${userId}`, {
    limit: 20,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = startSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_RUN_REQUEST" }, { status: 400 })
  }

  const started = await startSpecialistRun({ service, ...parsed.data })
  if (started.error || !started.data) {
    const code = started.code ?? "RUN_CREATE_FAILED"
    const status =
      code === "AUTHENTICATION_REQUIRED" ? 401
      : code === "PROFILE_REQUIRED" ? 409
      : code === "AGENT_RUNS_SCHEMA_NOT_READY" ? 503
      : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json(
    { runId: started.data.runId, traceId: started.data.traceId, caseId: started.data.caseId, duplicate: started.data.duplicate },
    {
      status: started.data.duplicate ? 200 : 201,
      headers: {
        "x-horizon-agent-runs-version": "agent-runs-v1",
        "x-horizon-trace-id": started.data.traceId,
      },
    },
  )
}

