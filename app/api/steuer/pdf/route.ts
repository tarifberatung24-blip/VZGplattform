import { NextResponse } from "next/server"
import { getPdfReadiness } from "@/lib/tax-pipeline"
import { emptyCanonicalTaxReturn } from "@/lib/canonical-tax-model"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const canonical = body?.canonicalTaxReturn ?? emptyCanonicalTaxReturn()
  const readiness = getPdfReadiness(canonical)
  if (readiness.status !== "READY_FOR_USER_USE") {
    return NextResponse.json({ ok: false, code: readiness.issues[0]?.code ?? "FIELD_MAPPING_UNVERIFIED", status: readiness.status, issues: readiness.issues }, { status: 409 })
  }
  return NextResponse.json({ ok: false, code: "PDF_GENERATION_NOT_CONFIGURED", status: "BLOCKED" }, { status: 501 })
}
