import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, loadCase } from "@/lib/inkasso/case-access"
import { DRAFT_TEMPLATES, submissionGuidance } from "@/lib/inkasso/drafts"
import { renderDraft } from "@/lib/inkasso/drafts"
import type { Action, Evaluation } from "@/lib/inkasso/rule-pack"

/**
 * Produces the letters the evaluation calls for. Drafts are generated from the
 * confirmed facts and the stored evaluation, and are returned for the user to
 * edit — nothing is sent by this route.
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

  const evaluation = current.evaluation as Evaluation | null
  if (!evaluation) {
    return NextResponse.json({ code: "EVALUATION_REQUIRED" }, { status: 409 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // An empty body means "all actions the evaluation recommends".
  }

  const requested = Array.isArray(body.actions)
    ? (body.actions.filter((a) => typeof a === "string") as Action[])
    : evaluation.actions

  const locale = current.locale === "de" ? "de" : "bg"
  const reference = {
    caseNo: current.parties?.case_no ?? "",
    court: current.parties?.court ?? "",
    creditor: current.parties?.creditor ?? "",
    reducible: evaluation.reducible_total,
    deadline: current.dates?.widerspruch_deadline ?? null,
  }

  const drafts = DRAFT_TEMPLATES.filter((t) => requested.includes(t.action)).map((t) => ({
    action: t.action,
    title: t.title[locale],
    cost: t.cost,
    body: renderDraft(t.action, locale, {
      parties: current.parties,
      claim: current.claim,
      dates: current.dates,
      evidence: current.evidence,
    }, reference),
  }))

  await supabase
    .from("inkasso_cases")
    .update({ status: "drafted" })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({
    drafts,
    guidance: submissionGuidance(locale, reference.deadline),
    disclaimer: evaluation.disclaimer,
  })
}

const ACTIONS = new Set<string>([
  "WIDERSPRUCH",
  "ABTRETUNGSNACHWEIS",
  "VERGLEICH",
  "SCHUFA_UNTERLASSUNG",
])

/**
 * Saves the user's edited draft. Human review is the point of the product: the
 * generated letter is a suggestion until the user has edited and approved it,
 * so it is stored unapproved here and only clears review via /review.
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
    return NextResponse.json({ code: "INVALID_DRAFT" }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : ""
  if (!ACTIONS.has(action)) return NextResponse.json({ code: "INVALID_DRAFT" }, { status: 400 })

  // An edit may arrive as full text, or as a request to re-render the template
  // because the facts changed since the draft was first produced.
  let text = typeof body.text === "string" ? body.text : ""
  if (!text && body.render === true) {
    const evaluation = current.evaluation as Evaluation | null
    text = renderDraft(action as Action, current.locale === "de" ? "de" : "bg", {
      parties: current.parties,
      claim: current.claim,
      dates: current.dates,
      evidence: current.evidence,
    }, {
      caseNo: current.parties?.case_no ?? "",
      court: current.parties?.court ?? "",
      creditor: current.parties?.creditor ?? "",
      reducible: evaluation?.reducible_total ?? 0,
      deadline: current.dates?.widerspruch_deadline ?? null,
    })
  }

  if (!text.trim()) return NextResponse.json({ code: "INVALID_DRAFT" }, { status: 400 })

  const existing: Array<{ action: string }> = Array.isArray(current.drafts) ? current.drafts : []
  const drafts = [
    ...existing.filter((d) => d.action !== action),
    { action, text, approved: false, edited_at: new Date().toISOString() },
  ]

  const { error: saveError } = await supabase
    .from("inkasso_cases")
    .update({ drafts })
    .eq("id", id)
    .eq("user_id", user.id)

  if (saveError) {
    return NextResponse.json(
      { code: saveError.code === "42703" ? "DRAFTS_COLUMN_MISSING" : "DRAFT_SAVE_FAILED" },
      { status: 503 },
    )
  }
  return NextResponse.json({ drafts })
}
