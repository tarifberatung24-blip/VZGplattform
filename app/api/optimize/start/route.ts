import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { buildComparison, buildFilledData, criticalMissing, loadOptimizeInputs, partnerDetails, type OptimizeCategory } from "@/lib/optimize/flow"

const startSchema = z.object({ contractId: z.string().uuid().nullable().default(null), category: z.enum(["energy", "kfz"]) }).strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ code: "OPTIMIZE_NOT_AUTHENTICATED" }, { status: 401 })
    const parsed = startSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ code: "OPTIMIZE_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
    const householdId = await ensureHousehold(supabase)
    const { contractId, category } = parsed.data
    const { contract, profile } = await loadOptimizeInputs(supabase, user.id, householdId, contractId)
    const filledData = buildFilledData(contract, profile)
    const missingCritical = criticalMissing(filledData)
    const comparison = buildComparison(filledData)
    const partner = partnerDetails(category as OptimizeCategory)
    const status = missingCritical.length > 0 ? "needs_input" : "ready_for_review"
    const { data: session, error } = await supabase.from("optimize_sessions").insert({
      user_id: user.id,
      contract_id: contractId,
      category,
      status,
      filled_data: filledData,
      comparison,
      partner_id: partner.id,
      affiliate_url: partner.url,
      ai_explanation: partner.configured ? "Partner quote is required before a new monthly amount or savings can be shown." : "No approved partner quote is configured. No new price or saving is shown.",
    }).select("id,status,category,filled_data,comparison,partner_id,affiliate_url,ai_explanation,created_at,updated_at").single()
    if (error || !session) return NextResponse.json({ code: "OPTIMIZE_SESSION_CREATE_FAILED" }, { status: 502 })
    await supabase.from("audit_events").insert({ household_id: householdId, actor_user_id: user.id, entity_type: "optimize_session", entity_id: session.id, event_type: "optimize.started", event_summary: "Optimize flow started", metadata: { category, contract_id: contractId, missing_critical: missingCritical, partner_configured: partner.configured } })
    return NextResponse.json({ session, missing_critical: missingCritical, ready_for_review: status === "ready_for_review", partner_configured: partner.configured })
  } catch (error) {
    const code = error instanceof Error ? error.message : "OPTIMIZE_START_FAILED"
    const known = ["OPTIMIZE_INPUTS_UNAVAILABLE", "OPTIMIZE_CONTRACT_NOT_FOUND", "HOUSEHOLD_NOT_AVAILABLE"].includes(code)
    return NextResponse.json({ code: known ? code : "OPTIMIZE_START_FAILED" }, { status: known ? 422 : 502 })
  }
}
