import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"
import { sanitizeGroups } from "@/lib/inkasso/facts"

/**
 * The user's confirmation step. After extraction the wizard shows the facts and
 * this endpoint writes what the user actually agreed to — which is what the
 * evaluation runs on. Nothing extracted is trusted until it lands here.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id)) return NextResponse.json({ code: "INVALID_CASE_ID" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 })

  const { data: current, error } = await loadCase(supabase, user.id, id)
  if (error) return NextResponse.json({ code: "CASES_UNAVAILABLE" }, { status: 503 })
  if (!current) return NextResponse.json({ code: "CASE_NOT_FOUND" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ code: "INVALID_FACTS" }, { status: 400 })
  }

  const caseType =
    typeof body.caseType === "string" && ["mahnbescheid", "inkasso", "utility_dispute"].includes(body.caseType)
      ? body.caseType
      : current.case_type

  const { data, error: saveError } = await supabase
    .from("inkasso_cases")
    .update({ ...sanitizeGroups(body), case_type: caseType })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,locale,case_type,status,parties,claim,dates,evidence,updated_at")
    .maybeSingle()

  if (saveError || !data) {
    return NextResponse.json({ code: "FACTS_SAVE_FAILED" }, { status: 503 })
  }
  return NextResponse.json({ case: data })
}
