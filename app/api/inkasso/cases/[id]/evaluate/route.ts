import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"
import { evaluate } from "@/lib/inkasso/rule-pack"

/**
 * Runs the deterministic rule pack over the confirmed facts and stores the
 * result. The pack version is persisted with it so an assessment can always be
 * traced back to the rules that produced it.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  const evaluation = evaluate({
    claim: current.claim,
    dates: current.dates,
    evidence: current.evidence,
  })

  const { error: saveError } = await supabase
    .from("inkasso_cases")
    .update({ evaluation, status: "evaluated" })
    .eq("id", id)
    .eq("user_id", user.id)

  if (saveError) return NextResponse.json({ code: "EVALUATION_SAVE_FAILED" }, { status: 503 })

  return NextResponse.json({ evaluation })
}
