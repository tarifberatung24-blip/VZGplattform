/**
 * Pure money rules for affiliate commission attribution.
 *
 * A payout can only be trusted if the amount in integer cents is computed from
 * stated inputs by a deterministic, testable function. Everything here is free
 * of IO and of floating-point money (see `toCents`): the platform must never
 * invent a commission, so an unparseable or negative input yields an explicit
 * outcome instead of a best guess.
 */

export const commissionModels = ["cpa", "revenue_share", "hybrid"] as const
export type CommissionModel = (typeof commissionModels)[number]

export const commissionStatuses = ["pending", "approved", "rejected", "paid"] as const
export type CommissionStatus = (typeof commissionStatuses)[number]

/** Allowed forward transitions. `paid` and `rejected` are terminal. */
const commissionTransitions: Record<CommissionStatus, readonly CommissionStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["paid", "rejected"],
  rejected: [],
  paid: [],
}

export function isCommissionModel(value: unknown): value is CommissionModel {
  return typeof value === "string" && (commissionModels as readonly string[]).includes(value)
}

export function isCommissionStatus(value: unknown): value is CommissionStatus {
  return typeof value === "string" && (commissionStatuses as readonly string[]).includes(value)
}

export function isTerminalCommissionStatus(status: CommissionStatus): boolean {
  return commissionTransitions[status].length === 0
}

export type CommissionTransitionCheck =
  | { ok: true }
  | { ok: false; reason: "unknown_status" | "same_status" | "terminal" | "invalid_transition" }

export function canTransitionCommission(from: string, to: string): CommissionTransitionCheck {
  if (!isCommissionStatus(from) || !isCommissionStatus(to)) return { ok: false, reason: "unknown_status" }
  if (from === to) return { ok: false, reason: "same_status" }
  if (isTerminalCommissionStatus(from)) return { ok: false, reason: "terminal" }
  if (!commissionTransitions[from].includes(to)) return { ok: false, reason: "invalid_transition" }
  return { ok: true }
}

/**
 * Convert a decimal amount to integer cents without float error. Accepts
 * `12`, `12.5`, `12.50`, `"12.50"`. Returns null for negatives, more than two
 * decimal places, or unparseable input, so the caller can reject rather than round.
 */
export function toCents(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ""] = text.split(".")
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2))
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null
}

export type CommissionBasis = {
  model: CommissionModel
  /** CPA payout in EUR. Required for `cpa` and `hybrid`. */
  cpaAmountEur?: number | string | null
  /** Revenue-share percentage (0-100). Required for `revenue_share` and `hybrid`. */
  revenueSharePercent?: number | string | null
  /** Deal value in EUR the revenue share applies to. Required for the share part. */
  dealValueEur?: number | string | null
}

export type CommissionComputation =
  | { ok: true; amountCents: number }
  | { ok: false; reason: "invalid_cpa" | "invalid_share" | "invalid_deal_value" | "missing_inputs" }

/**
 * Compute the commission for one conversion. Sums the flat CPA and the
 * revenue-share part so `hybrid` needs no special case.
 */
export function computeCommissionCents(basis: CommissionBasis): CommissionComputation {
  if (!isCommissionModel(basis.model)) return { ok: false, reason: "missing_inputs" }

  let total = 0

  if (basis.model === "cpa" || basis.model === "hybrid") {
    const cpa = toCents(basis.cpaAmountEur)
    if (cpa === null) return { ok: false, reason: "invalid_cpa" }
    total += cpa
  }

  if (basis.model === "revenue_share" || basis.model === "hybrid") {
    const percentText = basis.revenueSharePercent === null || basis.revenueSharePercent === undefined
      ? ""
      : String(basis.revenueSharePercent).trim()
    if (!/^\d+(\.\d{1,2})?$/.test(percentText) || Number(percentText) > 100) {
      return { ok: false, reason: "invalid_share" }
    }
    const deal = toCents(basis.dealValueEur)
    if (deal === null) return { ok: false, reason: "invalid_deal_value" }
    // Basis points keep the multiply exact: dealCents * percent / 100, rounded once.
    const basisPoints = Math.round(Number(percentText) * 100)
    total += Math.round((deal * basisPoints) / 10_000)
  }

  return { ok: true, amountCents: total }
}

/**
 * Deterministic reconciliation key for one (request, offer) pair, so a repeated
 * callback cannot create a second commission row for the same conversion.
 */
export function conversionKey(requestId: string, offerId: string): string {
  return `${requestId}::${offerId}`
}
