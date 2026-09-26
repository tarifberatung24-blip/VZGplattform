/**
 * HORIZON NEGOTIATION — category eligibility and compliance gating.
 *
 * The first enabled categories are the telecom-style recurring contracts
 * (internet/DSL and mobile). Energy, Kfz and subscriptions are architecturally
 * supported but only become eligible once a category is explicitly switched on.
 *
 * Regulated products — insurance and anything credit-like — are held behind a
 * compliance flag that this build leaves closed. `regulated: true` with
 * `complianceApproved: false` means the decision engine must never run for that
 * category and the UI must not offer it, regardless of the feature flag. That is
 * a product/legal boundary, not a technical limitation, so it is expressed in
 * data here rather than in a conditional somewhere deep in a route.
 */

export const NEGOTIATION_CATEGORIES = [
  "internet",
  "mobile",
  "electricity",
  "gas",
  "kfz",
  "insurance",
  "housing",
  "subscription",
  "other",
] as const

export type NegotiationCategory = (typeof NEGOTIATION_CATEGORIES)[number]

export type CategoryConfig = {
  id: NegotiationCategory
  /** Negotiation logic runs for this category when the feature flag is on. */
  enabled: boolean
  /** Regulated product: needs a separate compliance decision before enablement. */
  regulated: boolean
  /** Compliance decision actually granted. False blocks enablement outright. */
  complianceApproved: boolean
  /** Categories that share one negotiation playbook. */
  family: "telecom" | "energy" | "motor" | "regulated" | "general"
}

const registry: Record<NegotiationCategory, CategoryConfig> = {
  internet: { id: "internet", enabled: true, regulated: false, complianceApproved: false, family: "telecom" },
  mobile: { id: "mobile", enabled: true, regulated: false, complianceApproved: false, family: "telecom" },
  // Supported by the architecture, not yet switched on.
  electricity: { id: "electricity", enabled: false, regulated: false, complianceApproved: false, family: "energy" },
  gas: { id: "gas", enabled: false, regulated: false, complianceApproved: false, family: "energy" },
  kfz: { id: "kfz", enabled: false, regulated: false, complianceApproved: false, family: "motor" },
  // Regulated: never auto-enabled, requires a separate compliance approval.
  insurance: { id: "insurance", enabled: false, regulated: true, complianceApproved: false, family: "regulated" },
  housing: { id: "housing", enabled: false, regulated: false, complianceApproved: false, family: "general" },
  subscription: { id: "subscription", enabled: false, regulated: false, complianceApproved: false, family: "general" },
  other: { id: "other", enabled: false, regulated: false, complianceApproved: false, family: "general" },
}

export function isNegotiationCategory(value: unknown): value is NegotiationCategory {
  return typeof value === "string" && (NEGOTIATION_CATEGORIES as readonly string[]).includes(value)
}

export function getCategoryConfig(category: NegotiationCategory): CategoryConfig {
  return registry[category]
}

/**
 * Whether negotiation logic may run for a category at all. A regulated category
 * is refused even when its `enabled` flag is somehow set, because the compliance
 * decision is the binding one.
 */
export function isCategoryNegotiable(category: NegotiationCategory): boolean {
  const config = registry[category]
  if (config.regulated && !config.complianceApproved) return false
  return config.enabled
}

/** The categories the UI may offer, in the order the registry declares them. */
export function negotiableCategories(): NegotiationCategory[] {
  return NEGOTIATION_CATEGORIES.filter(isCategoryNegotiable)
}
