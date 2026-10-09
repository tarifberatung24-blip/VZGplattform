/**
 * Pure lifecycle rules for an affiliate service request.
 *
 * The operator advances a request through its customer-facing `status` via the
 * callback endpoint. The rules live here, free of IO, so the allowed transitions
 * can be unit-tested and audited without a database: a status can only move
 * forward along the declared graph, and a closed/cancelled request is terminal.
 */

export const affiliateRequestStatuses = [
  "queued",
  "in_review",
  "sent",
  "waiting_customer",
  "closed",
  "cancelled",
] as const

export type AffiliateRequestStatus = (typeof affiliateRequestStatuses)[number]

/**
 * Allowed forward transitions. Terminal states (`closed`, `cancelled`) have no
 * outgoing edges, so a late callback cannot resurrect a finished request.
 */
const transitions: Record<AffiliateRequestStatus, readonly AffiliateRequestStatus[]> = {
  queued: ["in_review", "cancelled"],
  in_review: ["sent", "cancelled"],
  sent: ["waiting_customer", "closed", "cancelled"],
  waiting_customer: ["closed", "cancelled"],
  closed: [],
  cancelled: [],
}

export function isAffiliateRequestStatus(value: unknown): value is AffiliateRequestStatus {
  return typeof value === "string" && (affiliateRequestStatuses as readonly string[]).includes(value)
}

export function isTerminalAffiliateStatus(status: AffiliateRequestStatus): boolean {
  return transitions[status].length === 0
}

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: "unknown_status" | "same_status" | "terminal" | "invalid_transition" }

/**
 * Validate a requested transition. A repeated status is rejected explicitly so
 * the endpoint can answer idempotently instead of writing a duplicate event.
 */
export function canTransition(from: string, to: string): TransitionCheck {
  if (!isAffiliateRequestStatus(from) || !isAffiliateRequestStatus(to)) return { ok: false, reason: "unknown_status" }
  if (from === to) return { ok: false, reason: "same_status" }
  if (isTerminalAffiliateStatus(from)) return { ok: false, reason: "terminal" }
  if (!transitions[from].includes(to)) return { ok: false, reason: "invalid_transition" }
  return { ok: true }
}
