import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPdfReadiness } from "@/lib/tax-pipeline"
import { emptyCanonicalTaxReturn } from "@/lib/canonical-tax-model"

export const runtime = "nodejs"

/**
 * Readiness-only endpoint for the legacy Steuer PDF path.
 *
 * It reports whether the canonical tax return is ready and never returns bytes.
 * Real official-form generation lives on the HORIZON path (P9/P15) and is handed
 * out only through the owner-scoped, approval-gated
 * `/api/horizon/cases/{id}/tax-form` route. PDF export is out of v1 scope
 * (`docs/PDF_EXPORT_SCOPE.md`), so even a ready return answers `501
 * PDF_GENERATION_NOT_CONFIGURED` instead of a download — the caller must use the
 * HORIZON path. The endpoint still requires a session because it is a tax-data
 * surface, like every other `/api` route.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const canonical = body?.canonicalTaxReturn ?? emptyCanonicalTaxReturn()
  const readiness = getPdfReadiness(canonical)
  if (readiness.status !== "READY_FOR_USER_USE") {
    return NextResponse.json({ ok: false, code: readiness.issues[0]?.code ?? "FIELD_MAPPING_UNVERIFIED", status: readiness.status, issues: readiness.issues }, { status: 409 })
  }
  return NextResponse.json({ ok: false, code: "PDF_GENERATION_NOT_CONFIGURED", status: "BLOCKED" }, { status: 501 })
}
