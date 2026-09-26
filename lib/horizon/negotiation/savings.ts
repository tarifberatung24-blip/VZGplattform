/**
 * HORIZON NEGOTIATION — savings engine.
 *
 * Deterministic and unit-tested. It never invents a target, a saving, or a
 * probability: if either side of the comparison is unevidenced the corresponding
 * figure is `null` and the caller shows "comparison data required".
 *
 * The four savings states are strictly separate and one is never presented as
 * another:
 *
 *   POTENTIAL  a real comparison offer exists, the provider has not accepted
 *   OFFERED    the provider proposed terms
 *   CONFIRMED  the provider confirmed the accepted terms
 *   VERIFIED   a later billing statement proves the lower recurring cost
 *
 * Temporary discounts, one-time credits, activation/hardware fees and a new
 * minimum term are all surfaced explicitly rather than folded into a single
 * flattering number.
 */

import type { SavingsState, VerificationResult } from "./contract"

export type OfferTerms = {
  newMonthly: number | null
  oneTimeCredit: number | null
  activationFee: number | null
  hardwareFee: number | null
  promotionDurationMonths: number | null
  /** What the monthly cost reverts to when a promotion ends, when stated. */
  postPromotionMonthly: number | null
  newContractDurationMonths: number | null
  includedServices: string[]
  removedServices: string[]
  addedServices: string[]
  effectiveDate: string | null
  expiryDate: string | null
  specialConditions: string[]
}

export const EMPTY_OFFER_TERMS: OfferTerms = {
  newMonthly: null,
  oneTimeCredit: null,
  activationFee: null,
  hardwareFee: null,
  promotionDurationMonths: null,
  postPromotionMonthly: null,
  newContractDurationMonths: null,
  includedServices: [],
  removedServices: [],
  addedServices: [],
  effectiveDate: null,
  expiryDate: null,
  specialConditions: [],
}

export type SavingsCalculation = {
  state: SavingsState
  oldMonthly: number | null
  newMonthly: number | null
  monthlyRecurringSaving: number | null
  annualizedRecurringSaving: number | null
  oneTimeCredit: number | null
  oneTimeFees: number | null
  netFirstYearEffect: number | null
  promotionMonths: number | null
  additionalBindingMonths: number | null
  /** Named unknowns that stop a figure from being complete. */
  warnings: SavingsWarning[]
}

export type SavingsWarning =
  | "MISSING_OLD_MONTHLY"
  | "MISSING_NEW_MONTHLY"
  | "TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN"
  | "NEW_MINIMUM_TERM"
  | "ADDED_SERVICES"
  | "REMOVED_SERVICES"
  | "ACTIVATION_FEE"
  | "HARDWARE_FEE"

const round = (value: number) => Math.round(value * 100) / 100

function positive(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return round(value)
}

function nonNegative(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null
  return round(value)
}

/**
 * Fills a partial terms object out to the full shape.
 *
 * Stored offer facts can predate a field or be written by an operator, so a
 * missing array must read as empty and a missing number as null rather than
 * crashing the calculation. An absent value stays absent — nothing is defaulted
 * to a number.
 */
export function normalizeOfferTerms(terms: Partial<OfferTerms> | null | undefined): OfferTerms {
  const source = terms ?? {}
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  return {
    newMonthly: source.newMonthly ?? null,
    oneTimeCredit: source.oneTimeCredit ?? null,
    activationFee: source.activationFee ?? null,
    hardwareFee: source.hardwareFee ?? null,
    promotionDurationMonths: source.promotionDurationMonths ?? null,
    postPromotionMonthly: source.postPromotionMonthly ?? null,
    newContractDurationMonths: source.newContractDurationMonths ?? null,
    includedServices: strings(source.includedServices),
    removedServices: strings(source.removedServices),
    addedServices: strings(source.addedServices),
    effectiveDate: source.effectiveDate ?? null,
    expiryDate: source.expiryDate ?? null,
    specialConditions: strings(source.specialConditions),
  }
}

/**
 * The state a saving is currently in. Derived from what actually happened rather
 * than stored twice: a bill result outranks a provider confirmation, which
 * outranks a mere proposal.
 */
export function savingsStateFor(input: {
  providerConfirmed: boolean
  offerAccepted: boolean
  verificationResult: VerificationResult | null
}): SavingsState {
  if (input.verificationResult === "VERIFIED") return "VERIFIED"
  if (input.providerConfirmed && input.offerAccepted) return "CONFIRMED"
  if (input.offerAccepted || input.providerConfirmed) return "OFFERED"
  return "POTENTIAL"
}

/**
 * The full deterministic calculation.
 *
 * `oldMonthly` is the contract's evidenced recurring cost. `newMonthly` is the
 * offered recurring cost. Both must be present for any saving to be reported.
 * `newContractDurationMonths` is compared against `currentRemainingMonths` to
 * expose how much extra binding time an offer buys.
 */
export function calculateSavings(input: {
  oldMonthly: number | null
  currentRemainingMonths: number | null
  terms: OfferTerms
  state?: SavingsState
}): SavingsCalculation {
  const warnings: SavingsWarning[] = []
  const oldMonthly = positive(input.oldMonthly)
  const newMonthly = positive(input.terms.newMonthly)

  if (oldMonthly == null) warnings.push("MISSING_OLD_MONTHLY")
  if (newMonthly == null) warnings.push("MISSING_NEW_MONTHLY")

  const monthlyRecurringSaving =
    oldMonthly != null && newMonthly != null ? round(oldMonthly - newMonthly) : null

  const promotionMonths = nonNegative(input.terms.promotionDurationMonths)
  const additionalBindingMonths =
    input.terms.newContractDurationMonths != null && input.currentRemainingMonths != null
      ? Math.max(0, input.terms.newContractDurationMonths - input.currentRemainingMonths)
      : null

  if (additionalBindingMonths != null && additionalBindingMonths > 0) warnings.push("NEW_MINIMUM_TERM")
  if (input.terms.addedServices.length > 0) warnings.push("ADDED_SERVICES")
  if (input.terms.removedServices.length > 0) warnings.push("REMOVED_SERVICES")
  if (positive(input.terms.activationFee) != null) warnings.push("ACTIVATION_FEE")
  if (positive(input.terms.hardwareFee) != null) warnings.push("HARDWARE_FEE")

  // A temporary discount whose post-promotion rate is unknown cannot yield an
  // honest full-year figure, so the affected window is reported as a warning
  // instead of being annualised at the promotional rate.
  const temporaryDiscount =
    promotionMonths != null && promotionMonths > 0 && promotionMonths < 12
  const postRate = positive(input.terms.postPromotionMonthly)
  if (temporaryDiscount && postRate == null) warnings.push("TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN")

  let annualizedRecurringSaving: number | null = null
  let firstYearSaving: number | null = null

  if (monthlyRecurringSaving != null) {
    annualizedRecurringSaving = round(monthlyRecurringSaving * 12)
    if (!temporaryDiscount) {
      firstYearSaving = round(monthlyRecurringSaving * 12)
    } else if (postRate != null) {
      const promotional = round(monthlyRecurringSaving * promotionMonths!)
      const postSaving = round((oldMonthly! - postRate) * (12 - promotionMonths!))
      firstYearSaving = round(promotional + postSaving)
    } else {
      // Only the promotional window is evidenced; the remainder is not claimed.
      firstYearSaving = round(monthlyRecurringSaving * promotionMonths!)
    }
  }

  const oneTimeCredit = nonNegative(input.terms.oneTimeCredit)
  const activationFee = positive(input.terms.activationFee) ?? 0
  const hardwareFee = positive(input.terms.hardwareFee) ?? 0
  const oneTimeFees = activationFee + hardwareFee > 0 ? round(activationFee + hardwareFee) : null

  const netFirstYearEffect =
    firstYearSaving != null
      ? round(firstYearSaving + (oneTimeCredit ?? 0) - (oneTimeFees ?? 0))
      : null

  return {
    state: input.state ?? "POTENTIAL",
    oldMonthly,
    newMonthly,
    monthlyRecurringSaving,
    annualizedRecurringSaving,
    oneTimeCredit,
    oneTimeFees,
    netFirstYearEffect,
    promotionMonths,
    additionalBindingMonths,
    warnings,
  }
}

/**
 * The one output HORIZON Capital may later consume. Only a VERIFIED saving is
 * trusted, so anything else returns nulls rather than a best guess.
 */
export function verifiedSavingsOutput(calculation: SavingsCalculation): {
  verifiedMonthlySaving: number | null
  verifiedAnnualSaving: number | null
} {
  if (calculation.state !== "VERIFIED") {
    return { verifiedMonthlySaving: null, verifiedAnnualSaving: null }
  }
  return {
    verifiedMonthlySaving: calculation.monthlyRecurringSaving,
    verifiedAnnualSaving: calculation.annualizedRecurringSaving,
  }
}
