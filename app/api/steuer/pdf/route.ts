import { NextResponse } from "next/server"
import { getPdfReadiness } from "@/lib/tax-pipeline"
import { getAuthenticatedUser } from "@/lib/office/supabase/auth"

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const canonical = body?.canonicalTaxReturn
  if (
    !canonical ||
    typeof canonical !== "object" ||
    !Array.isArray(canonical.selectedForms) ||
    !Array.isArray(canonical.validationIssues)
  ) {
    return NextResponse.json({ code: "CANONICAL_TAX_RETURN_REQUIRED" }, { status: 400 })
  }
  const readiness = getPdfReadiness(canonical)

  if (readiness.status !== "READY_FOR_USER_USE") {
    return NextResponse.json(
      {
        ok: false,
        code: readiness.issues[0]?.code ?? "FIELD_MAPPING_UNVERIFIED",
        status: readiness.status,
        forms: readiness.forms,
        issues: readiness.issues,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({
    ok: true,
    status: readiness.status,
    forms: readiness.forms,
    issues: readiness.issues,
    generation: {
      mode: "CASE_BOUND",
      route: "/api/horizon/cases/{caseId}/tax-form",
    },
  })
}
