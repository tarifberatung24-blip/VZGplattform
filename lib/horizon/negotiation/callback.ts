/**
 * HORIZON NEGOTIATION — MODE B operator callback decision.
 *
 * An operator or the n8n workflow moves the queue forward by calling back into
 * the platform. That caller is not a signed-in customer, so none of the session
 * route's guarantees apply to it and every one of them has to be re-established
 * here, in a pure function that a test can drive without a database or a network.
 *
 * The decisions this module makes:
 *
 *   - which request the callback is about, matched against the session's own
 *     `mode_b_request_id` rather than trusted from the body;
 *   - whether the requested status is a legal move for that request;
 *   - whether the callback is a replay of work already recorded, in which case
 *     it is acknowledged and changes nothing.
 *
 * It deliberately does not touch the negotiation lifecycle. An operator finishing
 * queue work is not the same fact as a provider confirming terms, so the operator
 * callback never advances `state`; that remains a customer-owned step.
 *
 * The callback status vocabulary is narrower than the queue's. `QUEUED` is not
 * callable — it is where a request starts, not somewhere a callback can put it —
 * and `CANCELLED` is not callable either, because an operator must not cancel a
 * customer's request. Cancellation stays with the customer's own PATCH.
 */

import {
  canTransitionAssistedRequest,
  isAssistedRequestStatus,
  type AssistedRequestStatus,
} from "./assisted"

/** The statuses an operator/n8n callback is allowed to set. */
export const ASSISTED_CALLBACK_STATUSES = [
  "IN_PROGRESS",
  "AWAITING_PROVIDER",
  "AWAITING_CUSTOMER",
  "COMPLETED",
] as const

export type AssistedCallbackStatus = (typeof ASSISTED_CALLBACK_STATUSES)[number]

export function isAssistedCallbackStatus(value: unknown): value is AssistedCallbackStatus {
  return typeof value === "string" && (ASSISTED_CALLBACK_STATUSES as readonly string[]).includes(value)
}

/** The error codes the callback route reports. */
export const ASSISTED_CALLBACK_UNAUTHORIZED_CODE = "NEGOTIATION_ASSISTED_CALLBACK_UNAUTHORIZED"
export const ASSISTED_CALLBACK_UNKNOWN_REQUEST_CODE = "NEGOTIATION_ASSISTED_CALLBACK_UNKNOWN_REQUEST"
export const ASSISTED_CALLBACK_INVALID_TRANSITION_CODE =
  "NEGOTIATION_ASSISTED_CALLBACK_INVALID_TRANSITION"

export type AssistedCallbackDecision =
  | { kind: "APPLIED"; status: AssistedCallbackStatus; from: AssistedRequestStatus }
  | { kind: "REPLAY"; status: AssistedCallbackStatus }
  | { kind: "UNKNOWN_REQUEST" }
  | { kind: "NOT_QUEUED" }
  | { kind: "INVALID_TRANSITION"; from: AssistedRequestStatus }

/**
 * Decides what a callback should do, with no IO.
 *
 * A repeat of the status already stored is a `REPLAY` rather than an error:
 * a queue that retries delivery after a dropped response must be safe to
 * acknowledge twice, and re-applying would append a second identical timeline
 * event. The route treats a replay as success and writes nothing.
 */
export function decideAssistedCallback(input: {
  /** The request the callback names. */
  requestId: string
  /** The session's recorded queue key, or null when nothing is queued. */
  sessionRequestId: string | null
  /** The session's recorded queue status, or null when nothing is queued. */
  currentStatus: unknown
  /** The status the callback asks for. */
  requestedStatus: unknown
}): AssistedCallbackDecision {
  // Ownership of the request id is established here, not in the body: a callback
  // that names a request the session never recorded is refused outright.
  if (!input.sessionRequestId || input.sessionRequestId !== input.requestId) {
    return { kind: "UNKNOWN_REQUEST" }
  }
  if (!isAssistedRequestStatus(input.currentStatus)) {
    return { kind: "NOT_QUEUED" }
  }
  if (!isAssistedCallbackStatus(input.requestedStatus)) {
    return { kind: "INVALID_TRANSITION", from: input.currentStatus }
  }
  if (input.requestedStatus === input.currentStatus) {
    return { kind: "REPLAY", status: input.requestedStatus }
  }
  if (!canTransitionAssistedRequest(input.currentStatus, input.requestedStatus)) {
    return { kind: "INVALID_TRANSITION", from: input.currentStatus }
  }
  return { kind: "APPLIED", status: input.requestedStatus, from: input.currentStatus }
}
