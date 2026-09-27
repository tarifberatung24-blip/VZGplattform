/**
 * HORIZON NEGOTIATION — user preferences and their enforcement.
 *
 * Preferences are constraints the user states before a negotiation begins. They
 * are persisted with provenance (who set the value and when), and every offer is
 * checked against them deterministically. An offer that violates a hard
 * constraint cannot be accepted, no matter how attractive its monthly saving is;
 * that is the whole point of collecting them before the negotiation rather than
 * after an offer arrives.
 *
 * `MUST_KEEP` / `MUST_NEVER_ACCEPT` are hard. `MAY_ACCEPT` is a permission, so an
 * offer using something outside it is not automatically a violation — it is
 * surfaced for review. The distinction matters because a negotiation commonly
 * produces an offer with a shape the user did not anticipate.
 */

import type { OfferTerms } from "./savings"

/** The feature/term vocabulary a preference can name. */
export const PREFERENCE_ITEMS = [
  "same_speed",
  "same_data_volume",
  "same_phone_number",
  "existing_hardware",
  "existing_tv_option",
  "new_minimum_term",
  "provider_credit",
  "temporary_promotion",
  "permanent_lower_fee",
  "plan_upgrade",
  "added_service",
  "longer_contract",
  "reduced_service",
  "activation_fee",
  "hardware_charge",
] as const

export type PreferenceItem = (typeof PREFERENCE_ITEMS)[number]

export type NegotiationPreferences = {
  mustKeep: PreferenceItem[]
  mayAccept: PreferenceItem[]
  mustNeverAccept: PreferenceItem[]
  maxContractExtensionMonths: number | null
  allowPlanChange: boolean
  allowAddons: boolean
  allowOneTimeCredit: boolean
  allowTemporaryDiscount: boolean
  minMonthlySaving: number | null
  provenance: PreferenceProvenance
}

export type PreferenceProvenance = {
  /** Who set the values. */
  source: "user"
  /** When, ISO. */
  setAt: string
  /** The form/version that captured them, for later auditing. */
  formVersion: string
}

export const DEFAULT_PREFERENCES: NegotiationPreferences = {
  mustKeep: [],
  mayAccept: [],
  mustNeverAccept: [],
  maxContractExtensionMonths: null,
  allowPlanChange: false,
  allowAddons: false,
  allowOneTimeCredit: false,
  allowTemporaryDiscount: false,
  minMonthlySaving: null,
  provenance: { source: "user", setAt: new Date(0).toISOString(), formVersion: "v1" },
}

export function isPreferenceItem(value: unknown): value is PreferenceItem {
  return typeof value === "string" && (PREFERENCE_ITEMS as readonly string[]).includes(value)
}

export type PreferenceViolation = {
  code:
    | "MUST_NEVER_ACCEPT"
    | "MUST_KEEP_VIOLATED"
    | "MAX_EXTENSION_EXCEEDED"
    | "PLAN_CHANGE_NOT_ALLOWED"
    | "ADDONS_NOT_ALLOWED"
    | "ONE_TIME_CREDIT_NOT_ALLOWED"
    | "TEMPORARY_DISCOUNT_NOT_ALLOWED"
    | "MIN_SAVING_NOT_MET"
    | "COMPARISON_DATA_REQUIRED"
  item: PreferenceItem | null
  hard: boolean
}

export type PreferenceEvaluation = {
  /** True only when no hard constraint is violated. */
  acceptable: boolean
  violations: PreferenceViolation[]
}

/** What an offer does, expressed in preference vocabulary. */
export type OfferShape = {
  addsService: boolean
  removesService: boolean
  changesPlan: boolean
  extendsContractMonths: number | null
  usesOneTimeCredit: boolean
  usesTemporaryDiscount: boolean
  chargesActivationFee: boolean
  chargesHardwareFee: boolean
  /** Which of the user's "must keep" items the offer preserves. */
  keeps: PreferenceItem[]
}

/**
 * Derive an offer's shape from its terms plus the items the user listed. The
 * caller supplies `keeps` because only the offer's own wording can say whether
 * e.g. the speed is unchanged; the engine does not guess it from a price.
 */
export function offerShapeFromTerms(terms: OfferTerms, shape: Partial<OfferShape>): OfferShape {
  return {
    addsService: terms.addedServices.length > 0,
    removesService: terms.removedServices.length > 0,
    changesPlan: shape.changesPlan ?? false,
    extendsContractMonths: shape.extendsContractMonths ?? terms.newContractDurationMonths,
    usesOneTimeCredit: (terms.oneTimeCredit ?? 0) > 0,
    usesTemporaryDiscount: (terms.promotionDurationMonths ?? 0) > 0,
    chargesActivationFee: (terms.activationFee ?? 0) > 0,
    chargesHardwareFee: (terms.hardwareFee ?? 0) > 0,
    keeps: shape.keeps ?? [],
  }
}

export function evaluatePreferences(
  preferences: NegotiationPreferences,
  shape: OfferShape,
  monthlySaving: number | null,
): PreferenceEvaluation {
  const violations: PreferenceViolation[] = []

  // Hard: anything the user forbade.
  if (shape.addsService && preferences.mustNeverAccept.includes("added_service")) {
    violations.push({ code: "MUST_NEVER_ACCEPT", item: "added_service", hard: true })
  }
  if (shape.removesService && preferences.mustNeverAccept.includes("reduced_service")) {
    violations.push({ code: "MUST_NEVER_ACCEPT", item: "reduced_service", hard: true })
  }
  if (
    shape.extendsContractMonths != null &&
    shape.extendsContractMonths > 0 &&
    preferences.mustNeverAccept.includes("longer_contract")
  ) {
    violations.push({ code: "MUST_NEVER_ACCEPT", item: "longer_contract", hard: true })
  }
  if (shape.chargesActivationFee && preferences.mustNeverAccept.includes("activation_fee")) {
    violations.push({ code: "MUST_NEVER_ACCEPT", item: "activation_fee", hard: true })
  }
  if (shape.chargesHardwareFee && preferences.mustNeverAccept.includes("hardware_charge")) {
    violations.push({ code: "MUST_NEVER_ACCEPT", item: "hardware_charge", hard: true })
  }

  // Hard: anything the user said must be preserved.
  for (const item of preferences.mustKeep) {
    if (!shape.keeps.includes(item)) {
      violations.push({ code: "MUST_KEEP_VIOLATED", item, hard: true })
    }
  }

  // Hard: explicit numeric limits.
  if (
    preferences.maxContractExtensionMonths != null &&
    shape.extendsContractMonths != null &&
    shape.extendsContractMonths > preferences.maxContractExtensionMonths
  ) {
    violations.push({ code: "MAX_EXTENSION_EXCEEDED", item: null, hard: true })
  }

  // Soft permissions: outside the allowed set is surfaced, not blocked.
  if (shape.changesPlan && !preferences.allowPlanChange) {
    violations.push({ code: "PLAN_CHANGE_NOT_ALLOWED", item: "plan_upgrade", hard: false })
  }
  if (shape.addsService && !preferences.allowAddons) {
    violations.push({ code: "ADDONS_NOT_ALLOWED", item: "added_service", hard: false })
  }
  if (shape.usesOneTimeCredit && !preferences.allowOneTimeCredit) {
    violations.push({ code: "ONE_TIME_CREDIT_NOT_ALLOWED", item: "provider_credit", hard: false })
  }
  if (shape.usesTemporaryDiscount && !preferences.allowTemporaryDiscount) {
    violations.push({ code: "TEMPORARY_DISCOUNT_NOT_ALLOWED", item: "temporary_promotion", hard: false })
  }

  // Minimum saving is hard when stated. An unevidenced saving cannot satisfy it.
  if (preferences.minMonthlySaving != null && preferences.minMonthlySaving > 0) {
    if (monthlySaving == null) {
      violations.push({ code: "COMPARISON_DATA_REQUIRED", item: null, hard: true })
    } else if (monthlySaving < preferences.minMonthlySaving) {
      violations.push({ code: "MIN_SAVING_NOT_MET", item: null, hard: true })
    }
  }

  return {
    acceptable: violations.every((violation) => !violation.hard),
    violations,
  }
}

export function emptyPreferences(provenance?: Partial<PreferenceProvenance>): NegotiationPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    mustKeep: [],
    mayAccept: [],
    mustNeverAccept: [],
    provenance: { ...DEFAULT_PREFERENCES.provenance, ...provenance },
  }
}
