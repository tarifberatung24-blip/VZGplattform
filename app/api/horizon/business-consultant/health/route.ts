import { NextResponse } from "next/server"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — deterministic Business Health Score.
 *
 * GET returns the score computed from the owner's current evidence snapshot.
 * The computation is pure arithmetic in `lib/horizon/business-consultant/health-score`;
 * no model is called, so the endpoint answers even when the AI engine is
 * unconfigured. Every response carries the score version, the rubric version,
 * the evidence snapshot id, coverage and confidence, so a consumer can tell a
 * measured score from a blocked one.
 *
 * A thin evidence snapshot returns `blocked: true` with `refusalCode`, never a
 * low number presented as a measurement.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const result = await service.computeHealth()
  if (result.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (result.error || !result.data) {
    return NextResponse.json({ code: result.code ?? "HEALTH_SCORE_FAILED" }, { status: 502 })
  }

  return NextResponse.json(
    { health: result.data },
    { headers: { "x-horizon-business-health-score-version": result.data.scoreVersion } },
  )
}
