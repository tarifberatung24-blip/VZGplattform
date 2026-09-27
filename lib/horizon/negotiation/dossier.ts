/**
 * HORIZON NEGOTIATION — negotiation dossier.
 *
 * A structured, deterministic document assembled from confirmed facts. It is the
 * input a human (the user in Mode A, a VZG operator in Mode B) uses to negotiate.
 *
 * The dossier does not use AI to invent anything. Every field is either taken
 * from the contract facts, from an approved alternative, or from the user's own
 * preferences. Where a fact is absent the dossier says so explicitly rather than
 * filling the gap.
 */

import type { ContractFacts } from "./facts"
import type { NegotiationPreferences } from "./preferences"
import type { ApprovedAlternative, OpportunityResult } from "./opportunity"

export type DossierSection<T> = {
  /** Values the dossier can rely on. */
  known: T
  /** Facts the negotiation needs that are not evidenced yet. */
  missing: string[]
}

export type NegotiationDossier = {
  currentContract: DossierSection<{
    provider: string | null
    title: string
    customerNumber: string | null
    monthlyCost: number | null
    services: string[]
    startDate: string | null
    endDate: string | null
    cancellationDeadline: string | null
    promotionExpiry: string | null
  }>
  target: DossierSection<{
    desiredMonthlyCost: number | null
    minAcceptableSaving: number | null
    requiredFeatures: string[]
  }>
  leverage: DossierSection<{
    alternativeMonthlyCost: number | null
    alternativeSource: ApprovedAlternative["source"] | null
    cancellationWindowOpen: boolean
    documentedPriceIncrease: boolean
    promotionExpiring: boolean
    tenureMonths: number | null
  }>
  plan: {
    primaryAsk: string | null
    fallbackAsk: string | null
    walkAwayCondition: string | null
    switchAlternative: string | null
  }
  /** The action the engine determined, carried through for the operator. */
  decisionAction: OpportunityResult["action"]
  reasonCodes: OpportunityResult["reasonCodes"]
}

export function buildDossier(input: {
  facts: ContractFacts
  preferences: NegotiationPreferences
  opportunity: OpportunityResult
  approvedAlternative: ApprovedAlternative | null
  today: string
}): NegotiationDossier {
  const { facts, preferences, opportunity, approvedAlternative } = input

  const contractMissing: string[] = []
  if (!facts.provider) contractMissing.push("provider")
  if (facts.currentMonthlyCost == null) contractMissing.push("monthly_cost")
  if (!facts.customerNumber) contractMissing.push("customer_number")
  if (!facts.endDate) contractMissing.push("end_date")
  if (!facts.cancellationDeadline) contractMissing.push("cancellation_deadline")

  const targetMissing: string[] = []
  if (opportunity.targetMonthlyCost == null) targetMissing.push("target_monthly_cost")

  const leverageMissing: string[] = []
  if (!approvedAlternative) leverageMissing.push("comparison_offer")

  const tenureMonths = monthsBetween(facts.startDate, input.today)

  const primaryAsk = buildPrimaryAsk(opportunity, approvedAlternative, preferences)
  const fallbackAsk = buildFallbackAsk(opportunity, preferences)
  const walkAway = buildWalkAway(opportunity, preferences)
  const switchAlternative = approvedAlternative
    ? `${approvedAlternative.monthlyCost.toFixed(2)} € / ${approvedAlternative.source}`
    : null

  return {
    currentContract: {
      known: {
        provider: facts.provider,
        title: facts.title,
        customerNumber: facts.customerNumber,
        monthlyCost: facts.currentMonthlyCost,
        services: facts.services,
        startDate: facts.startDate,
        endDate: facts.endDate,
        cancellationDeadline: facts.cancellationDeadline,
        promotionExpiry: facts.promotionExpiry,
      },
      missing: contractMissing,
    },
    target: {
      known: {
        desiredMonthlyCost: opportunity.targetMonthlyCost,
        minAcceptableSaving: preferences.minMonthlySaving,
        requiredFeatures: preferences.mustKeep,
      },
      missing: targetMissing,
    },
    leverage: {
      known: {
        alternativeMonthlyCost: approvedAlternative?.monthlyCost ?? null,
        alternativeSource: approvedAlternative?.source ?? null,
        cancellationWindowOpen: (opportunity.daysUntilDeadline ?? Number.POSITIVE_INFINITY) >= 0 &&
          (opportunity.daysUntilDeadline ?? Number.POSITIVE_INFINITY) <= 90,
        documentedPriceIncrease: opportunity.reasonCodes.includes("DOCUMENTED_PRICE_INCREASE"),
        promotionExpiring: opportunity.reasonCodes.includes("PROMOTION_EXPIRING_SOON"),
        tenureMonths,
      },
      missing: leverageMissing,
    },
    plan: {
      primaryAsk,
      fallbackAsk,
      walkAwayCondition: walkAway,
      switchAlternative,
    },
    decisionAction: opportunity.action,
    reasonCodes: opportunity.reasonCodes,
  }
}

/**
 * The primary ask is only produced when there is an evidenced target. Without
 * one the dossier states the comparison is required instead of proposing a
 * number — the engine does not manufacture an ask.
 */
function buildPrimaryAsk(
  opportunity: OpportunityResult,
  alternative: ApprovedAlternative | null,
  preferences: NegotiationPreferences,
): string | null {
  if (opportunity.targetMonthlyCost == null || alternative == null) return null
  const keep = preferences.mustKeep.length > 0 ? `, keeping ${preferences.mustKeep.join(", ")}` : ""
  return `ask_match_offer:${opportunity.targetMonthlyCost.toFixed(2)}${keep}`
}

function buildFallbackAsk(
  opportunity: OpportunityResult,
  preferences: NegotiationPreferences,
): string | null {
  if (opportunity.targetMonthlyCost == null) return null
  if (preferences.allowOneTimeCredit) return "ask_one_time_credit_or_temporary_discount"
  if (preferences.allowTemporaryDiscount) return "ask_temporary_discount"
  return null
}

function buildWalkAway(
  opportunity: OpportunityResult,
  preferences: NegotiationPreferences,
): string | null {
  if (opportunity.targetMonthlyCost == null) return null
  if (preferences.minMonthlySaving != null && preferences.minMonthlySaving > 0) {
    return `reject_below_monthly_saving:${preferences.minMonthlySaving.toFixed(2)}`
  }
  return `reject_above_target:${opportunity.targetMonthlyCost.toFixed(2)}`
}

function monthsBetween(startIso: string | null, endIso: string): number | null {
  if (!startIso) return null
  const start = new Date(`${startIso}T00:00:00.000Z`)
  const end = new Date(`${endIso}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
  return months >= 0 ? months : null
}
