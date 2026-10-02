import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"
import { recordAuditEvent } from "@/lib/office/supabase/record-audit-event"

const ACTIONS = new Set<string>([
  "WIDERSPRUCH",
  "ABTRETUNGSNACHWEIS",
  "VERGLEICH",
  "SCHUFA_UNTERLASSUNG",
])

/**
 * The explicit approval gate. A draft only counts as reviewed once the user
 * approves it here, and the approval is audited. This is the human-review
 * requirement: the product prepares, the person decides.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : ""
  if (!ACTIONS.has(action)) return NextResponse.json({ code: "INVALID_ACTION" }, { status: 400 })

  const existing: Array<{ action: string; approved?: boolean }> = Array.isArray(current.drafts)
    ? current.drafts
    : []
  const target = existing.find((d) => d.action === action)
  if (!target) return NextResponse.json({ code: "DRAFT_NOT_FOUND" }, { status: 404 })

  const drafts = existing.map((d) =>
    d.action === action
      ? { ...d, approved: true, approved_at: new Date().toISOString() }
      : d,
  )

  const { error: saveError } = await supabase
    .from("inkasso_cases")
    .update({ drafts, status: "in_review" })
    .eq("id", id)
    .eq("user_id", user.id)

  if (saveError) return NextResponse.json({ code: "REVIEW_SAVE_FAILED" }, { status: 503 })

  await recordAuditEvent(supabase, {
    actorId: user.id,
    action: "inkasso.draft.approved",
    metadata: {
      entityType: "inkasso_case",
      entityId: id,
      summary: `Draft approved: ${action}`,
      status: "in_review",
    },
  })

  return NextResponse.json({
    drafts,
    message:
      "Одобрено. HORIZON не подава документа — изпращаш го ти по Vordruck или online-mahnantrag.de. / Genehmigt. HORIZON versendet nichts — du reichst ein.",
  })
}
