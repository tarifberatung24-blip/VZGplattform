/**
 * HORIZON NEGOTIATION — immutable negotiation timeline.
 *
 * Every state change produces one or more timeline events. The events are
 * append-only: `negotiation_events` carries no UPDATE or DELETE grant or policy,
 * so a historic event cannot be rewritten through the session client. This module
 * defines what an event looks like and how a state transition maps to events, so
 * the mapping is deterministic and testable rather than spread through routes.
 */

import type {
  NegotiationEventType,
  NegotiationState,
  NegotiationTransition,
} from "./contract"
import { nextNegotiationState } from "./contract"

export type TimelineEvent = {
  eventType: NegotiationEventType
  /** Structured, non-sensitive detail. Never a credential or a full document. */
  detail: Record<string, unknown>
}

/**
 * The events a transition emits, in order. A transition may emit several (for
 * example recording a provider response also records that an offer was parsed).
 * `authorization_given` is only emitted when an authorization was actually
 * granted, which the caller signals through `authorizationGranted`.
 */
export function eventsForTransition(
  transition: NegotiationTransition,
  options: { authorizationGranted?: boolean } = {},
): NegotiationEventType[] {
  switch (transition) {
    case "start_analysis":
      return ["started"]
    case "determine_opportunity":
      return []
    case "create_strategy":
      return ["strategy_created"]
    case "request_authorization":
      return []
    case "grant_authorization":
      return options.authorizationGranted === false ? [] : ["authorization_given"]
    case "start_negotiation":
      return ["message_prepared"]
    case "record_provider_response":
      return ["provider_response_received", "offer_parsed"]
    case "open_review":
      return []
    case "counter_offer":
      return ["counter_offer_created"]
    case "reject_offer":
      return ["offer_rejected"]
    case "approve_offer":
      return ["offer_approved"]
    case "start_verification":
      return ["verification_due"]
    case "mark_verified":
      return ["saving_verified"]
    case "start_monitor":
      return ["provider_confirmed"]
    case "reopen_negotiation":
      return ["saving_failed"]
    default:
      return []
  }
}

/**
 * Apply a transition: returns the next state plus the events it emits, or null
 * when the transition is not legal from the current state. A caller that uses
 * this cannot move the machine along an undeclared edge.
 */
export function applyTransition(
  state: NegotiationState,
  transition: NegotiationTransition,
  options: { authorizationGranted?: boolean } = {},
): { state: NegotiationState; events: TimelineEvent[] } | null {
  const next = nextNegotiationState(state, transition)
  if (!next) return null
  return {
    state: next,
    events: eventsForTransition(transition, options).map((eventType) => ({
      eventType,
      detail: { from: state, to: next, transition },
    })),
  }
}
