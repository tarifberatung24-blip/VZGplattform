import { NextResponse } from "next/server"
import { z } from "zod"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — diagnosis.
 *
 * GET returns the latest live diagnosis. POST runs a new one.
 *
 * POST is rate-limited and bounded: it is the only path that calls a model, and a
 * repeated click must not become a repeated spend. The previous live diagnosis is
 * superseded, not deleted, so the history stays auditable.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

const runSchema = z.object({ locale: z.enum(["bg", "de"]).optional() }).strict()

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const diagnosis = await service.latestDiagnosis()
  if (diagnosis.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (diagnosis.error) return NextResponse.json({ code: diagnosis.code ?? "DIAGNOSIS_READ_FAILED" }, { status: 502 })

  return NextResponse.json({ diagnosis: diagnosis.data })
}

export async function POST(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`business-consultant:diagnosis:user:${userId}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = runSchema.safeParse((await request.json().catch(() => ({}))) ?? {})
  if (!parsed.success) return NextResponse.json({ code: "INVALID_DIAGNOSIS_REQUEST" }, { status: 400 })

  const result = await service.runDiagnosis({ locale: parsed.data.locale })
  if (result.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (result.error || !result.data) {
    const code = result.code ?? "DIAGNOSIS_FAILED"
    const status = code === "PROFILE_REQUIRED" ? 409 : code === "ENGINE_NOT_CONFIGURED" ? 503 : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json(
    { diagnosis: result.data.diagnosis, actions: result.data.actions },
    { status: 201, headers: { "x-horizon-business-consultant-version": "business-consultant-v1" } },
  )
}
