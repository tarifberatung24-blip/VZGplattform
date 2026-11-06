import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Agent Runs Engine — run collection.
 *
 * POST creates a run (or returns the existing one for a repeated request).
 * GET lists the caller's runs and a status summary.
 *
 * Both are owner-scoped: the service is built from the session and every query
 * filters on `owner_id`, so another user's run is indistinguishable from a
 * missing one. A caller-supplied case or document id is validated against rows
 * the user actually owns before anything is written.
 *
 * This route creates *work*, not effects. It never calls a model: execution is
 * performed by the bounded dispatcher, behind the approval boundary.
 */

const createSchema = z
  .object({
    objective: z.string().trim().min(1).max(2000),
    caseId: z.string().trim().uuid().optional(),
    documentIds: z.array(z.string().trim().uuid()).max(20).optional(),
    locale: z.enum(["bg", "de"]).optional(),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

const SCHEMA_MISSING = { code: "ENGINE_MIGRATION_NOT_APPLIED" } as const

const RUN_STATUS_FILTERS = [
  "queued",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "dead_letter",
] as const

export async function GET(request: Request) {
  const engine = await createAgentRunService()
  if (!engine.userId || !engine.service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }
  if (!engine.schemaReady) return NextResponse.json(SCHEMA_MISSING, { status: 503 })

  const status = new URL(request.url).searchParams.get("status")
  const parsedStatus = status ? z.enum(RUN_STATUS_FILTERS).safeParse(status) : null
  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ code: "INVALID_STATUS_FILTER" }, { status: 400 })
  }

  const [runs, summary] = await Promise.all([
    engine.service.runs.listRuns({ status: parsedStatus?.data, limit: 100 }),
    engine.service.runs.summarizeRuns(),
  ])
  if (runs.error) return NextResponse.json({ code: "RUN_LIST_UNAVAILABLE" }, { status: 502 })

  return NextResponse.json({ runs: runs.data ?? [], summary: summary.data ?? null })
}

export async function POST(request: Request) {
  const engine = await createAgentRunService()
  if (!engine.userId || !engine.service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }
  if (!engine.schemaReady) return NextResponse.json(SCHEMA_MISSING, { status: 503 })

  const rate = checkRateLimit(`agent-runs:create:user:${engine.userId}`, {
    limit: 20,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_RUN_REQUEST" }, { status: 400 })

  const created = await engine.service.createRun({
    objective: parsed.data.objective,
    caseId: parsed.data.caseId ?? null,
    documentIds: parsed.data.documentIds,
    locale: parsed.data.locale,
    idempotencyKey: parsed.data.idempotencyKey ?? null,
  })

  if (created.error || !created.data) {
    // A foreign or missing case/document is reported exactly like a missing one.
    const code = created.code ?? "ENGINE_UNAVAILABLE"
    const status =
      code === "CASE_NOT_FOUND" || code === "DOCUMENT_NOT_FOUND" ? 404
      : code === "INVALID_RUN_REQUEST" ? 400
      : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json(
    { run: created.data.run, duplicate: created.data.duplicate },
    {
      status: created.data.duplicate ? 200 : 201,
      headers: {
        "x-horizon-agent-runs-version": "agent-runs-v1",
        "x-horizon-trace-id": created.data.run.traceId,
      },
    },
  )
}
