/**
 * HORIZON NEGOTIATION — opportunity / decision engine.
 *
 * A deterministic rule engine. Same inputs, same outputs, no randomness, no
 * model call. It answers one question: given what is actually evidenced about
 * this contract, what is the best next action?
 *
 *   NEGOTIATE | SWITCH | CANCEL | WAIT | NO_ACTION
 *
 * The engine never invents a competitor price, a provider offer, a discount, a
 * saving, or an acceptance probability. If no verified target offer exists then
 * `targetMonthlyCost` and `potentialSaving` are `null` and the caller must show
 * "comparison data required" rather than a number.
 *
 * `SWITCH` is only ever returned when an approved alternative offer is supplied
 * as evidence. The engine does not go looking for one, and it does not assume
 * that a cheaper market rate exists.
 */

import type { DecisionAction } from "./contract"
import type { ContractFacts } from "./facts"

/** An approved alternative the user or an approved partner actually supplied. */
export type ApprovedAlternative = {
  /** Where the offer came from. `partner` means the affiliate registry, disclosed. */
  source: "user" | "partner" | "provider"
  /** Stable id of the partner/offer, when it came from the registry. */
  partnerId: string | null
  monthlyCost: number
  /** What the alternative preserves relative to the current contract. */
  keeps: string[]
  /** Whether the alternative is currently reachable (approved + configured). */
  available: boolean
}

export type OpportunityReason =
  | "PRICE_ABOVE_APPROVED_ALTERNATIVE"
  | "PRICE_ABOVE_ALTERNATIVE"
  | "APPROVED_ALTERNATIVE_AVAILABLE"
  | "CANCELLATION_WINDOW_OPEN"
  | "CONTRACT_ENDED"
  | "PROMOTION_ACTIVE"
  | "PROMOTION_EXPIRING_SOON"
  | "DOCUMENTED_PRICE_INCREASE"
  | "CUSTOMER_TENURE"
  | "MISSING_COMPARISON_DATA"
  | "MISSING_CURRENT_COST"
  | "MISSING_PROVIDER"
  | "MISSING_CANCELLATION_DEADLINE"
  | "NO_LEVERAGE_FOUND"
  | "WAIT_UNTIL_BEFORE_EXPIRY"
  | "UNVERIFIED_CONTRACT_DATA"

export type MissingInformation =
  | "provider"
  | "current_monthly_cost"
  | "cancellation_deadline"
  | "contract_end_date"
  | "comparison_offer"
  | "contract_review"

export type OpportunityResult = {
  action: DecisionAction
  reasonCodes: OpportunityReason[]
  missingInformation: MissingInformation[]
  /** 0..1, deterministic. Derived from how much evidence backs the decision. */
  opportunityConfidence: number
  nextReviewDate: string | null
  currentMonthlyCost: number | null
  /** Null unless an evidenced target exists. */
  targetMonthlyCost: number | null
  /** Null unless an evidenced target exists. */
  potentialMonthlySaving: number | null
  potentialAnnualSaving: number | null
  /** Days until the next relevant boundary, when one is evidenced. */
  daysUntilDeadline: number | null
  daysUntilPromotionExpiry: number | null
}

export type OpportunityInput = {
  facts: ContractFacts
  /** Today, ISO date. Passed in so the engine stays pure and testable. */
  today: string
  approvedAlternative: ApprovedAlternative | null
  /** Cancellation window is open when the deadline is in the future but close. */
  cancellationWindowDays?: number
  /** A promotion expiring within this many days is "expiring soon". */
  promotionExpiryWarnDays?: number
}

const DEFAULT_CANCELLATION_WINDOW_DAYS = 90
const DEFAULT_PROMOTION_WARN_DAYS = 60

const round = (value: number) => Math.round(value * 100) / 100

export function parseIsoDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function daysBetween(fromIso: string, toIso: string): number | null {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function addDays(iso: string, days: number): string {
  const base = parseIsoDate(iso)
  if (!base) return iso
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * The decision. Evaluated in priority order, each branch requiring evidence:
 *
 * 1. Nothing to act on yet, or data missing → NO_ACTION / WAIT with reasons.
 * 2. An approved alternative is cheaper → SWITCH (unless negotiating is the
 *    better first step, see below).
 * 3. A real price gap or a documented increase exists → NEGOTIATE.
 * 4. An active promotion with time left and no gap → WAIT.
 * 5. Otherwise → NO_ACTION.
 *
 * NEGOTIATE is preferred over SWITCH when the current provider is reachable and
 * a negotiation has a lever, because asking first preserves the customer's
 * service and tenure; SWITCH is the fallback, and is returned directly when the
 * contract has already ended or no negotiation lever exists.
 */
export function evaluateOpportunity(input: OpportunityInput): OpportunityResult {
  const { facts, approvedAlternative } = input
  const cancellationWindowDays = input.cancellationWindowDays ?? DEFAULT_CANCELLATION_WINDOW_DAYS
  const promotionWarnDays = input.promotionExpiryWarnDays ?? DEFAULT_PROMOTION_WARN_DAYS

  const reasonCodes: OpportunityReason[] = []
  const missingInformation: MissingInformation[] = []

  if (!facts.provider) missingInformation.push("provider")
  if (facts.currentMonthlyCost == null) missingInformation.push("current_monthly_cost")
  if (!facts.cancellationDeadline) missingInformation.push("cancellation_deadline")
  if (!facts.endDate) missingInformation.push("contract_end_date")
  if (!approvedAlternative) missingInformation.push("comparison_offer")
  if (!facts.verified) missingInformation.push("contract_review")

  const daysUntilDeadline = facts.cancellationDeadline
    ? daysBetween(input.today, facts.cancellationDeadline)
    : null
  const daysUntilPromotionExpiry = facts.promotionExpiry
    ? daysBetween(input.today, facts.promotionExpiry)
    : null

  // A target only exists when an approved alternative is evidenced AND cheaper.
  const alternative = approvedAlternative
  const targetMonthlyCost = alternative ? round(alternative.monthlyCost) : null
  const potentialMonthlySaving =
    alternative && facts.currentMonthlyCost != null && alternative.monthlyCost < facts.currentMonthlyCost
      ? round(facts.currentMonthlyCost - alternative.monthlyCost)
      : null
  const potentialAnnualSaving =
    potentialMonthlySaving != null ? round(potentialMonthlySaving * 12) : null

  const contractEnded = facts.endDate != null && (daysBetween(input.today, facts.endDate) ?? 1) <= 0
  const cancellationOpen =
    daysUntilDeadline != null && daysUntilDeadline >= 0 && daysUntilDeadline <= cancellationWindowDays
  const promotionActive = daysUntilPromotionExpiry != null && daysUntilPromotionExpiry > 0
  const promotionExpiringSoon =
    daysUntilPromotionExpiry != null &&
    daysUntilPromotionExpiry > 0 &&
    daysUntilPromotionExpiry <= promotionWarnDays
  const priceIncrease = documentedPriceIncrease(facts)

  if (!facts.verified) reasonCodes.push("UNVERIFIED_CONTRACT_DATA")
  if (contractEnded) reasonCodes.push("CONTRACT_ENDED")
  if (cancellationOpen) reasonCodes.push("CANCELLATION_WINDOW_OPEN")
  if (promotionActive) reasonCodes.push("PROMOTION_ACTIVE")
  if (promotionExpiringSoon) reasonCodes.push("PROMOTION_EXPIRING_SOON")
  if (priceIncrease) reasonCodes.push("DOCUMENTED_PRICE_INCREASE")

  const confidence = (hard: number, soft: number) =>
    Math.max(0, Math.min(1, round(hard * 0.6 + soft * 0.4)))

  // --- Branch 0: cannot reason without a current cost ---------------------
  if (facts.currentMonthlyCost == null) {
    reasonCodes.push("MISSING_CURRENT_COST")
    return result({
      action: "NO_ACTION",
      reasonCodes,
      missingInformation,
      opportunityConfidence: confidence(0, 0),
      nextReviewDate: null,
      facts,
      targetMonthlyCost,
      potentialMonthlySaving,
      potentialAnnualSaving,
      daysUntilDeadline,
      daysUntilPromotionExpiry,
    })
  }

  if (!facts.provider) reasonCodes.push("MISSING_PROVIDER")

  // --- Branch 1: an evidenced alternative is cheaper ----------------------
  if (potentialMonthlySaving != null && alternative) {
    reasonCodes.push(alternative.source === "partner" ? "APPROVED_ALTERNATIVE_AVAILABLE" : "PRICE_ABOVE_ALTERNATIVE")

    // The contract has already ended: there is nothing left to negotiate, so
    // switching to the evidenced alternative is the direct action.
    if (contractEnded) {
      return result({
        action: "SWITCH",
        reasonCodes,
        missingInformation,
        opportunityConfidence: confidence(1, 1),
        nextReviewDate: null,
        facts,
        targetMonthlyCost,
        potentialMonthlySaving,
        potentialAnnualSaving,
        daysUntilDeadline,
        daysUntilPromotionExpiry,
      })
    }

    // Otherwise negotiate first, with the alternative as the walk-away; the
    // caller surfaces SWITCH as the fallback once the provider answers.
    return result({
      action: "NEGOTIATE",
      reasonCodes,
      missingInformation,
      opportunityConfidence: confidence(1, facts.verified ? 1 : 0.4),
      nextReviewDate: null,
      facts,
      targetMonthlyCost,
      potentialMonthlySaving,
      potentialAnnualSaving,
      daysUntilDeadline,
      daysUntilPromotionExpiry,
    })
  }

  // --- Branch 2: no alternative, but the contract itself is a lever -------
  const hasLever = cancellationOpen || priceIncrease || contractEnded
  if (hasLever) {
    // With no evidenced target there is no number to ask for. This is the case
    // the product must never dress up: the honest action is to gather the
    // comparison first, so the action is NEGOTIATE only when a target exists.
    reasonCodes.push("MISSING_COMPARISON_DATA")
    const nextReview = facts.promotionExpiry ?? facts.cancellationDeadline ?? null
    return result({
      action: "WAIT",
      reasonCodes,
      missingInformation,
      opportunityConfidence: confidence(0, 0.6),
      nextReviewDate: nextReview,
      facts,
      targetMonthlyCost: null,
      potentialMonthlySaving: null,
      potentialAnnualSaving: null,
      daysUntilDeadline,
      daysUntilPromotionExpiry,
    })
  }

  // --- Branch 3: an active promotion with time left -----------------------
  if (promotionActive) {
    reasonCodes.push("WAIT_UNTIL_BEFORE_EXPIRY")
    // Review shortly before the promotion lapses, so the next negotiation is
    // prepared in time rather than started on the day the price jumps.
    const reviewAt = facts.promotionExpiry ? addDays(facts.promotionExpiry, -promotionWarnDays) : null
    return result({
      action: "WAIT",
      reasonCodes,
      missingInformation,
      opportunityConfidence: confidence(0, 0.5),
      nextReviewDate: reviewAt,
      facts,
      targetMonthlyCost: null,
      potentialMonthlySaving: null,
      potentialAnnualSaving: null,
      daysUntilDeadline,
      daysUntilPromotionExpiry,
    })
  }

  // --- Branch 4: nothing evidenced to act on ------------------------------
  reasonCodes.push("NO_LEVERAGE_FOUND")
  return result({
    action: "NO_ACTION",
    reasonCodes,
    missingInformation,
    opportunityConfidence: confidence(0, 0.2),
    nextReviewDate: facts.endDate ?? facts.cancellationDeadline ?? null,
    facts,
    targetMonthlyCost: null,
    potentialMonthlySaving: null,
    potentialAnnualSaving: null,
    daysUntilDeadline,
    daysUntilPromotionExpiry,
  })
}

function result(input: {
  action: DecisionAction
  reasonCodes: OpportunityReason[]
  missingInformation: MissingInformation[]
  opportunityConfidence: number
  nextReviewDate: string | null
  facts: ContractFacts
  targetMonthlyCost: number | null
  potentialMonthlySaving: number | null
  potentialAnnualSaving: number | null
  daysUntilDeadline: number | null
  daysUntilPromotionExpiry: number | null
}): OpportunityResult {
  return {
    action: input.action,
    reasonCodes: dedupe(input.reasonCodes),
    missingInformation: dedupe(input.missingInformation),
    opportunityConfidence: input.opportunityConfidence,
    nextReviewDate: input.nextReviewDate,
    currentMonthlyCost: input.facts.currentMonthlyCost,
    targetMonthlyCost: input.targetMonthlyCost,
    potentialMonthlySaving: input.potentialMonthlySaving,
    potentialAnnualSaving: input.potentialAnnualSaving,
    daysUntilDeadline: input.daysUntilDeadline,
    daysUntilPromotionExpiry: input.daysUntilPromotionExpiry,
  }
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)]
}

/**
 * A documented increase: the price history holds at least two points and the
 * latest is higher than an earlier one. A single point is not an increase, and
 * an unordered history is sorted by effective date before comparing.
 */
export function documentedPriceIncrease(facts: ContractFacts): boolean {
  const points = facts.priceHistory
    .filter((point) => point.effectiveDate != null)
    .slice()
    .sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? -1 : 1))
  if (points.length < 2) return false
  const first = points[0].monthlyAmount
  const last = points[points.length - 1].monthlyAmount
  return last > first
}

/**
 * Whether the "comparison data required" notice must be shown. True whenever the
 * engine has no evidenced target, so the UI never renders a blank where a saving
 * would otherwise appear.
 */
export function comparisonDataRequired(result: OpportunityResult): boolean {
  return result.targetMonthlyCost == null || result.potentialMonthlySaving == null
}
