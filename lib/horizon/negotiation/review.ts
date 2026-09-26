/**
 * HORIZON NEGOTIATION — offer review and approval binding.
 *
 * This is the module behind the "no auto-acceptance" guarantee. Nothing is
 * accepted automatically, not even a price decrease. Before an offer can be
 * accepted the caller renders a review that shows the current contract, the
 * provider's offer, and any approved alternative side by side, with the effect of
 * accepting laid out — including the costs a flattering summary would omit.
 *
 * The approval binds to the offer's exact content hash. If the content changes,
 * the hash changes and the approval no longer matches, so it is invalid without
 * any write. That is the same rule the case engine's draft approvals use.
 */

import { isApprovalValid } from "@/lib/horizon/case/approval"
import type { OfferTerms } from "./savings"
import { calculateSavings, type SavingsCalculation } from "./savings"
import type { ApprovedAlternative } from "./opportunity"
import { evaluatePreferences, offerShapeFromTerms, type NegotiationPreferences } from "./preferences"

export type OfferComparison = {
  current: {
    monthlyCost: number | null
    remainingMonths: number | null
  }
  providerOffer: {
    monthlyCost: number | null
    newContractDurationMonths: number | null
    activationFee: number | null
    hardwareFee: number | null
    oneTimeCredit: number | null
    promotionDurationMonths: number | null
    keptServices: string[]
    removedServices: string[]
    addedServices: string[]
  }
  approvedAlternative: {
    monthlyCost: number | null
    source: ApprovedAlternative["source"] | null
  }
  /** The deterministic effect of accepting. */
  savings: SavingsCalculation
  /** Preference evaluation against the offer's shape. */
  preferenceEvaluation: ReturnType<typeof evaluatePreferences>
  /** True when a hard preference is violated, so acceptance is blocked. */
  blockedByPreferences: boolean
  /** The exact content the approval must bind to. */
  contentHash: string
}

export function buildOfferComparison(input: {
  currentMonthly: number | null
  currentRemainingMonths: number | null
  terms: OfferTerms
  approvedAlternative: ApprovedAlternative | null
  preferences: NegotiationPreferences
  offerContentHash: string
  /** Items the offer preserves, supplied by the caller from the offer wording. */
  keptServices: string[]
}): OfferComparison {
  const savings = calculateSavings({
    oldMonthly: input.currentMonthly,
    currentRemainingMonths: input.currentRemainingMonths,
    terms: input.terms,
    state: "OFFERED",
  })

  const shape = offerShapeFromTerms(input.terms, {
    extendsContractMonths: input.terms.newContractDurationMonths,
    keeps: input.keptServices as NegotiationPreferences["mustKeep"],
  })
  const preferenceEvaluation = evaluatePreferences(
    input.preferences,
    shape,
    savings.monthlyRecurringSaving,
  )

  return {
    current: {
      monthlyCost: savings.oldMonthly,
      remainingMonths: input.currentRemainingMonths,
    },
    providerOffer: {
      monthlyCost: savings.newMonthly,
      newContractDurationMonths: input.terms.newContractDurationMonths,
      activationFee: input.terms.activationFee,
      hardwareFee: input.terms.hardwareFee,
      oneTimeCredit: input.terms.oneTimeCredit,
      promotionDurationMonths: input.terms.promotionDurationMonths,
      keptServices: input.keptServices,
      removedServices: input.terms.removedServices,
      addedServices: input.terms.addedServices,
    },
    approvedAlternative: {
      monthlyCost: input.approvedAlternative?.monthlyCost ?? null,
      source: input.approvedAlternative?.source ?? null,
    },
    savings,
    preferenceEvaluation,
    blockedByPreferences: !preferenceEvaluation.acceptable,
    contentHash: input.offerContentHash,
  }
}

export type OfferDecision = "ACCEPT" | "COUNTER" | "REJECT" | "COMPARE_SWITCH"

export const OFFER_DECISIONS: OfferDecision[] = ["ACCEPT", "COUNTER", "REJECT", "COMPARE_SWITCH"]

export function isOfferDecision(value: unknown): value is OfferDecision {
  return typeof value === "string" && (OFFER_DECISIONS as readonly string[]).includes(value)
}

/**
 * Whether a decision may proceed against an offer.
 *
 * ACCEPT is refused when a hard preference is violated, when the approved hash
 * does not match the offer's current content, or when the offer is not in a
 * reviewable state. This is where "never auto-accept" becomes enforced rather
 * than merely displayed.
 */
export function canDecideOffer(input: {
  decision: OfferDecision
  offerStatus: string
  approvedHash: string | null | undefined
  currentContentHash: string
  blockedByPreferences: boolean
}): { allowed: boolean; reason: string | null } {
  if (input.offerStatus !== "received" && input.offerStatus !== "under_review") {
    return { allowed: false, reason: "NEGOTIATION_OFFER_NOT_REVIEWABLE" }
  }
  if (input.decision === "ACCEPT") {
    if (input.blockedByPreferences) {
      return { allowed: false, reason: "NEGOTIATION_OFFER_VIOLATES_PREFERENCES" }
    }
    if (!isApprovalValid(input.approvedHash, input.currentContentHash)) {
      return { allowed: false, reason: "NEGOTIATION_APPROVAL_HASH_MISMATCH" }
    }
  }
  return { allowed: true, reason: null }
}
