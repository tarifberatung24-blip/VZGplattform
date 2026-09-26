/**
 * HORIZON NEGOTIATION — lifecycle vocabulary and state machine.
 *
 * Pure, deterministic, no IO. The database CHECK constraints in
 * `20260926090000_horizon_negotiation_engine.sql` mirror these literals exactly,
 * so a state or event that is not declared here cannot be persisted.
 */

export const NEGOTIATION_STATES = [
  "CONTRACT",
  "ANALYSIS",
  "OPPORTUNITY",
  "STRATEGY",
  "AUTHORIZATION",
  "NEGOTIATION",
  "PROVIDER_RESPONSE",
  "USER_REVIEW",
  "USER_APPROVAL",
  "CONFIRMED",
  "BILL_VERIFICATION",
  "VERIFIED_SAVING",
  "MONITOR",
] as const

export type NegotiationState = (typeof NEGOTIATION_STATES)[number]

/** The canonical decision options. NEGOTIATE is not privileged over the others. */
export const DECISION_ACTIONS = ["NEGOTIATE", "SWITCH", "CANCEL", "WAIT", "NO_ACTION"] as const

export type DecisionAction = (typeof DECISION_ACTIONS)[number]

/** Execution modes. AUTOMATED has an adapter interface but no enabled transport. */
export const EXECUTION_MODES = ["SELF", "ASSISTED", "AUTOMATED"] as const

export type ExecutionMode = (typeof EXECUTION_MODES)[number]

export const SAVINGS_STATES = ["POTENTIAL", "OFFERED", "CONFIRMED", "VERIFIED"] as const

export type SavingsState = (typeof SAVINGS_STATES)[number]

export const VERIFICATION_RESULTS = ["pending", "VERIFIED", "MISMATCH", "NOT_YET_EFFECTIVE"] as const

export type VerificationResult = (typeof VERIFICATION_RESULTS)[number]

export const AUTHORIZATION_STATUSES = ["not_required", "pending", "granted", "revoked"] as const

export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number]

/** Immutable timeline event vocabulary, mirroring the `negotiation_events` CHECK. */
export const NEGOTIATION_EVENTS = [
  "started",
  "strategy_created",
  "authorization_given",
  "message_prepared",
  "message_sent_by_user",
  "message_sent_by_operator",
  "provider_response_received",
  "offer_parsed",
  "counter_offer_created",
  "offer_approved",
  "offer_rejected",
  "provider_confirmed",
  "verification_due",
  "saving_verified",
  "saving_failed",
  // An operator/automation callback moved the MODE B queue. The queue is a separate
  // machine from the negotiation lifecycle, so its moves carry their own event
  // rather than borrowing a customer-facing one (an operator finishing work is
  // not the same fact as a provider confirming terms).
  "operator_status_changed",
] as const

export type NegotiationEventType = (typeof NEGOTIATION_EVENTS)[number]

/** The actions that advance the machine. Each maps to one or more timeline events. */
export const NEGOTIATION_TRANSITIONS = [
  "start_analysis",
  "determine_opportunity",
  "create_strategy",
  "request_authorization",
  "grant_authorization",
  "start_negotiation",
  "record_provider_response",
  "open_review",
  "counter_offer",
  "reject_offer",
  "approve_offer",
  "start_verification",
  "mark_verified",
  "start_monitor",
  "reopen_negotiation",
] as const

export type NegotiationTransition = (typeof NEGOTIATION_TRANSITIONS)[number]

const transitions: Record<NegotiationState, Partial<Record<NegotiationTransition, NegotiationState>>> = {
  CONTRACT: { start_analysis: "ANALYSIS" },
  ANALYSIS: { determine_opportunity: "OPPORTUNITY" },
  OPPORTUNITY: { create_strategy: "STRATEGY" },
  STRATEGY: {
    // Mode A/B may need a representation document; Mode A with no legal
    // representation goes straight to NEGOTIATION without an authorization.
    request_authorization: "AUTHORIZATION",
    start_negotiation: "NEGOTIATION",
  },
  AUTHORIZATION: { grant_authorization: "NEGOTIATION" },
  NEGOTIATION: { record_provider_response: "PROVIDER_RESPONSE" },
  PROVIDER_RESPONSE: { open_review: "USER_REVIEW" },
  USER_REVIEW: {
    counter_offer: "NEGOTIATION",
    reject_offer: "NEGOTIATION",
    approve_offer: "USER_APPROVAL",
  },
  USER_APPROVAL: { approve_offer: "CONFIRMED" },
  CONFIRMED: { start_verification: "BILL_VERIFICATION" },
  BILL_VERIFICATION: {
    mark_verified: "VERIFIED_SAVING",
    // A mismatch or a not-yet-effective bill returns to NEGOTIATION so a
    // follow-up action can be prepared; it never silently becomes verified.
    reopen_negotiation: "NEGOTIATION",
  },
  VERIFIED_SAVING: { start_monitor: "MONITOR" },
  MONITOR: { reopen_negotiation: "NEGOTIATION" },
}

export function isNegotiationState(value: unknown): value is NegotiationState {
  return typeof value === "string" && (NEGOTIATION_STATES as readonly string[]).includes(value)
}

export function isDecisionAction(value: unknown): value is DecisionAction {
  return typeof value === "string" && (DECISION_ACTIONS as readonly string[]).includes(value)
}

export function isNegotiationEvent(value: unknown): value is NegotiationEventType {
  return typeof value === "string" && (NEGOTIATION_EVENTS as readonly string[]).includes(value)
}

export function isExecutionMode(value: unknown): value is ExecutionMode {
  return typeof value === "string" && (EXECUTION_MODES as readonly string[]).includes(value)
}

export function nextNegotiationState(
  state: NegotiationState,
  transition: NegotiationTransition,
): NegotiationState | null {
  return transitions[state][transition] ?? null
}

export function canApplyNegotiationTransition(
  state: NegotiationState,
  transition: NegotiationTransition,
): boolean {
  return nextNegotiationState(state, transition) !== null
}

export function allowedNegotiationTransitions(state: NegotiationState): NegotiationTransition[] {
  return NEGOTIATION_TRANSITIONS.filter((transition) => canApplyNegotiationTransition(state, transition))
}

/**
 * The order a session walks. `negotiationStateIndex` lets a caller ask "has this
 * session already reached the review stage?" without duplicating the sequence.
 * `MONITOR` is last; `reopen_negotiation` deliberately moves backwards.
 */
export function negotiationStateIndex(state: NegotiationState): number {
  return NEGOTIATION_STATES.indexOf(state)
}

export function isAtOrAfter(state: NegotiationState, other: NegotiationState): boolean {
  return negotiationStateIndex(state) >= negotiationStateIndex(other)
}

/** AUTOMATED exists as an interface only; nothing in this build executes it. */
export function isExecutionModeEnabled(mode: ExecutionMode): boolean {
  return mode !== "AUTOMATED"
}
