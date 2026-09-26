import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { buildContractFacts, contractEligibility } from "@/lib/horizon/negotiation/facts"
import {
  isFailure,
  loadOwnedContract,
  requireEngine,
  upstreamFailed,
  validationFailed,
} from "@/lib/horizon/negotiation/route-support"
import { runAnalysisAndPersist, approvedAlternativeFromRegistry } from "@/lib/horizon/negotiation/service"
import { writeNegotiationAudit } from "@/lib/horizon/negotiation/audit"
import { emptyPreferences } from "@/lib/horizon/negotiation/preferences"

const startSchema = z
  .object({
    contractId: z.string().uuid(),
    executionMode: z.enum(["SELF", "ASSISTED"]).default("SELF"),
  })
  .strict()

/**
 * Starts a negotiation session for one owned contract.
 *
 * The analysis runs immediately so the user sees the recommended action rather
 * than an empty shell. A contract whose category is not enabled — including a
 * regulated product behind its compliance flag — is refused with the specific
 * reason, not a generic error.
 */
export async function POST(request: Request) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  try {
    const parsed = startSchema.safeParse(await request.json())
    if (!parsed.success) return validationFailed(parsed.error.flatten()).response

    const supabase = await createClient()
    const householdId = await ensureHousehold(supabase)
    const contract = await loadOwnedContract(supabase, householdId, parsed.data.contractId)
    if (!contract) return NextResponse.json({ code: "NEGOTIATION_CONTRACT_NOT_FOUND" }, { status: 404 })

    const eligibility = contractEligibility(contract)
    if (!eligibility.eligible) {
      return NextResponse.json(
        { code: "NEGOTIATION_CONTRACT_NOT_ELIGIBLE", reason: eligibility.reason },
        { status: 422 },
      )
    }

    const facts = buildContractFacts(contract)
    const { partner } = approvedAlternativeFromRegistry(facts.category)

    const created = await engine.repository!.createSession({
      householdId,
      contractId: contract.id,
      category: facts.category,
      state: "CONTRACT",
      analysis: {},
      currentMonthlyCost: facts.currentMonthlyCost,
      executionMode: parsed.data.executionMode,
    })
    if (created.error || !created.data) return upstreamFailed("NEGOTIATION_SESSION_CREATE_FAILED").response

    const analyzed = await runAnalysisAndPersist({
      repository: engine.repository!,
      session: created.data,
      contract,
      preferences: emptyPreferences(),
      today: new Date().toISOString().slice(0, 10),
      approvedAlternative: null,
    })
    if ("error" in analyzed) return upstreamFailed(analyzed.error).response

    await writeNegotiationAudit(supabase, {
      householdId,
      actorUserId: engine.userId!,
      sessionId: analyzed.session.id,
      eventType: "negotiation.started",
      summary: "Negotiation analysis started",
      metadata: {
        category: facts.category,
        contract_id: contract.id,
        action: analyzed.analysis.opportunity.action,
      },
    })

    const { opportunity } = analyzed.analysis
    return NextResponse.json(
      {
        session: analyzed.session,
        decision: {
          action: opportunity.action,
          reason_codes: opportunity.reasonCodes,
          missing_information: opportunity.missingInformation,
          opportunity_confidence: opportunity.opportunityConfidence,
          next_review_date: opportunity.nextReviewDate,
          current_monthly_cost: opportunity.currentMonthlyCost,
          target_monthly_cost: opportunity.targetMonthlyCost,
          potential_monthly_saving: opportunity.potentialMonthlySaving,
          potential_annual_saving: opportunity.potentialAnnualSaving,
          comparison_data_required: opportunity.targetMonthlyCost == null,
        },
        partner,
      },
      { status: 201 },
    )
  } catch {
    return upstreamFailed("NEGOTIATION_START_FAILED").response
  }
}
