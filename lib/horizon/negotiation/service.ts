import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getAffiliateOffer, type AffiliateOfferId } from "@/lib/affiliate-offers"
import { buildContractFacts, type NegotiationContract } from "./facts"
import { evaluateOpportunity, type ApprovedAlternative, type OpportunityResult } from "./opportunity"
import { buildDossier, type NegotiationDossier } from "./dossier"
import { emptyPreferences, type NegotiationPreferences } from "./preferences"
import { getCategoryConfig } from "./categories"
import { applyTransition } from "./timeline"
import type { NegotiationRepository, NegotiationSessionRow } from "./repository"
import type { DecisionAction, NegotiationState } from "./contract"

/**
 * The analysis step, shared by the start route and the session refresh.
 *
 * It is deterministic: the contract facts and the caller's approved alternative
 * produce the opportunity, which produces the dossier. Nothing is inferred and
 * nothing is stored that was not derived from evidenced inputs.
 *
 * The approved alternative comes from the affiliate registry only when the
 * category has a configured partner offer. When no partner is configured the
 * alternative is `null`, which is exactly what forces the engine to report
 * "comparison data required" instead of a fabricated saving.
 */

/** Which affiliate offer backs a negotiation category, when one exists. */
function partnerOfferForCategory(category: string): AffiliateOfferId | null {
  const family = getCategoryConfig(category as never)?.family
  if (family === "energy") return "energy"
  if (family === "motor") return "kfz"
  return null
}

/**
 * Resolves an approved alternative from the affiliate registry.
 *
 * The registry supplies a URL, not a price, so this returns `null` until a
 * verified quote exists. That is deliberate: the registry cannot evidence a
 * monthly cost, and the engine must not treat a partner link as a price. A user
 * or operator may supply an evidenced alternative separately.
 */
export function approvedAlternativeFromRegistry(
  category: string,
): { alternative: ApprovedAlternative | null; partner: { id: string; url: string | null; configured: boolean } | null } {
  const offerId = partnerOfferForCategory(category)
  if (!offerId) return { alternative: null, partner: null }
  const offer = getAffiliateOffer(offerId)
  return {
    alternative: null,
    partner: { id: offer.id, url: offer.url ?? null, configured: offer.isConfigured },
  }
}

export type AnalysisResult = {
  opportunity: OpportunityResult
  dossier: NegotiationDossier
  nextState: NegotiationState
}

export function analyzeContract(input: {
  contract: NegotiationContract
  preferences: NegotiationPreferences
  today: string
  approvedAlternative: ApprovedAlternative | null
}): AnalysisResult {
  const facts = buildContractFacts(input.contract)
  const opportunity = evaluateOpportunity({
    facts,
    today: input.today,
    approvedAlternative: input.approvedAlternative,
  })
  const dossier = buildDossier({
    facts,
    preferences: input.preferences,
    opportunity,
    approvedAlternative: input.approvedAlternative,
    today: input.today,
  })
  return { opportunity, dossier, nextState: "OPPORTUNITY" }
}

/**
 * Runs the analysis and persists it, advancing the session through the declared
 * transitions. The state machine is consulted rather than assigned, so a session
 * cannot jump from an unexpected state to a later one.
 */
export async function runAnalysisAndPersist(input: {
  repository: NegotiationRepository
  session: NegotiationSessionRow
  contract: NegotiationContract
  preferences: NegotiationPreferences
  today: string
  approvedAlternative: ApprovedAlternative | null
}): Promise<{ session: NegotiationSessionRow; analysis: AnalysisResult } | { error: string }> {
  const analysis = analyzeContract({
    contract: input.contract,
    preferences: input.preferences,
    today: input.today,
    approvedAlternative: input.approvedAlternative,
  })

  // CONTRACT -> ANALYSIS -> OPPORTUNITY, using the declared transitions only.
  let state = input.session.state
  const steps: ("start_analysis" | "determine_opportunity")[] =
    state === "CONTRACT" ? ["start_analysis", "determine_opportunity"] : ["determine_opportunity"]

  for (const transition of steps) {
    const applied = applyTransition(state, transition)
    if (!applied) break
    state = applied.state
  }

  const { opportunity, dossier } = analysis
  const updated = await input.repository.updateSession(input.session.id, {
    state,
    decision_action: opportunity.action,
    reason_codes: opportunity.reasonCodes,
    missing_information: opportunity.missingInformation,
    opportunity_confidence: opportunity.opportunityConfidence,
    next_review_date: opportunity.nextReviewDate,
    analysis: {
      dossier,
      currentMonthlyCost: opportunity.currentMonthlyCost,
      targetMonthlyCost: opportunity.targetMonthlyCost,
      potentialMonthlySaving: opportunity.potentialMonthlySaving,
      potentialAnnualSaving: opportunity.potentialAnnualSaving,
      comparisonDataRequired: opportunity.targetMonthlyCost == null,
      daysUntilDeadline: opportunity.daysUntilDeadline,
      daysUntilPromotionExpiry: opportunity.daysUntilPromotionExpiry,
    },
    target_monthly_cost: opportunity.targetMonthlyCost,
    potential_monthly_saving: opportunity.potentialMonthlySaving,
    potential_annual_saving: opportunity.potentialAnnualSaving,
    promotion_expiry: input.contract.promotionExpiry,
  })
  if (updated.error || !updated.data) return { error: updated.error ?? "NEGOTIATION_SESSION_UPDATE_FAILED" }

  await input.repository.appendEvents(input.session.id, [
    { eventType: "started", detail: { contractId: input.contract.id } },
    {
      eventType: "strategy_created",
      detail: { action: opportunity.action, reasonCodes: opportunity.reasonCodes },
    },
  ])

  return { session: updated.data, analysis }
}

export { emptyPreferences }

/** Reads the household a contract belongs to, for the session's tenancy column. */
export async function householdIdForContract(
  supabase: SupabaseClient,
  householdId: string,
  contractId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select("household_id")
    .eq("id", contractId)
    .eq("household_id", householdId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { household_id: string }).household_id
}

export type { DecisionAction }
