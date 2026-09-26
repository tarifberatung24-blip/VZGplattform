import { describe, expect, it } from "vitest"
import {
  allowedNegotiationTransitions,
  canApplyNegotiationTransition,
  isAtOrAfter,
  isDecisionAction,
  isExecutionMode,
  isNegotiationEvent,
  isNegotiationState,
  isExecutionModeEnabled,
  NEGOTIATION_EVENTS,
  NEGOTIATION_STATES,
  nextNegotiationState,
} from "./contract"
import { applyTransition, eventsForTransition } from "./timeline"

describe("negotiation state machine", () => {
  it("walks the full happy path", () => {
    let state = "CONTRACT" as const
    const path = [
      "start_analysis",
      "determine_opportunity",
      "create_strategy",
      "start_negotiation",
      "record_provider_response",
      "open_review",
      "approve_offer",
      "approve_offer",
      "start_verification",
      "mark_verified",
      "start_monitor",
    ] as const
    for (const transition of path) {
      const next = nextNegotiationState(state, transition)
      expect(next).not.toBeNull()
      state = next!
    }
    expect(state).toBe("MONITOR")
  })

  it("refuses an undeclared edge", () => {
    expect(nextNegotiationState("CONTRACT", "approve_offer")).toBeNull()
    expect(canApplyNegotiationTransition("CONTRACT", "approve_offer")).toBe(false)
    expect(allowedNegotiationTransitions("CONTRACT")).toEqual(["start_analysis"])
  })

  it("supports the authorization path for assisted mode", () => {
    expect(nextNegotiationState("STRATEGY", "request_authorization")).toBe("AUTHORIZATION")
    expect(nextNegotiationState("AUTHORIZATION", "grant_authorization")).toBe("NEGOTIATION")
  })

  it("supports the counter-offer loop", () => {
    expect(nextNegotiationState("USER_REVIEW", "counter_offer")).toBe("NEGOTIATION")
    expect(nextNegotiationState("NEGOTIATION", "record_provider_response")).toBe("PROVIDER_RESPONSE")
    expect(nextNegotiationState("USER_REVIEW", "reject_offer")).toBe("NEGOTIATION")
  })

  it("returns from a failed verification to negotiation, never to verified", () => {
    expect(nextNegotiationState("BILL_VERIFICATION", "reopen_negotiation")).toBe("NEGOTIATION")
    expect(nextNegotiationState("BILL_VERIFICATION", "start_verification")).toBeNull()
  })

  it("only reaches VERIFIED_SAVING through mark_verified", () => {
    const direct = nextNegotiationState("CONFIRMED", "mark_verified")
    expect(direct).toBeNull()
    expect(nextNegotiationState("BILL_VERIFICATION", "mark_verified")).toBe("VERIFIED_SAVING")
  })

  it("orders states so a caller can ask whether review was reached", () => {
    expect(isAtOrAfter("USER_REVIEW", "PROVIDER_RESPONSE")).toBe(true)
    expect(isAtOrAfter("NEGOTIATION", "USER_REVIEW")).toBe(false)
  })
})

describe("timeline events", () => {
  it("maps each transition to its events", () => {
    expect(eventsForTransition("start_analysis")).toEqual(["started"])
    expect(eventsForTransition("create_strategy")).toEqual(["strategy_created"])
    expect(eventsForTransition("grant_authorization")).toEqual(["authorization_given"])
    expect(eventsForTransition("record_provider_response")).toEqual([
      "provider_response_received",
      "offer_parsed",
    ])
    expect(eventsForTransition("counter_offer")).toEqual(["counter_offer_created"])
    expect(eventsForTransition("approve_offer")).toEqual(["offer_approved"])
    expect(eventsForTransition("reject_offer")).toEqual(["offer_rejected"])
    expect(eventsForTransition("mark_verified")).toEqual(["saving_verified"])
    expect(eventsForTransition("reopen_negotiation")).toEqual(["saving_failed"])
  })

  it("emits no authorization event when none was granted", () => {
    expect(eventsForTransition("grant_authorization", { authorizationGranted: false })).toEqual([])
  })

  it("applies a transition and returns the next state with events", () => {
    const applied = applyTransition("CONTRACT", "start_analysis")
    expect(applied?.state).toBe("ANALYSIS")
    expect(applied?.events[0].eventType).toBe("started")
    expect(applied?.events[0].detail).toMatchObject({ from: "CONTRACT", to: "ANALYSIS" })
  })

  it("returns null for an illegal transition", () => {
    expect(applyTransition("CONTRACT", "approve_offer")).toBeNull()
  })

  it("declares every event the database CHECK constraint allows", () => {
    for (const event of NEGOTIATION_EVENTS) {
      expect(isNegotiationEvent(event)).toBe(true)
    }
    expect(isNegotiationEvent("invented_event")).toBe(false)
  })
})

describe("vocabulary guards", () => {
  it("validates states, actions and modes", () => {
    for (const state of NEGOTIATION_STATES) expect(isNegotiationState(state)).toBe(true)
    expect(isNegotiationState("NEGOTIATE")).toBe(false)
    expect(isDecisionAction("NEGOTIATE")).toBe(true)
    expect(isDecisionAction("SWITCH")).toBe(true)
    expect(isDecisionAction("CANCEL")).toBe(true)
    expect(isDecisionAction("WAIT")).toBe(true)
    expect(isDecisionAction("NO_ACTION")).toBe(true)
    expect(isDecisionAction("ACCEPT")).toBe(false)
    expect(isExecutionMode("SELF")).toBe(true)
    expect(isExecutionMode("AUTOMATED")).toBe(true)
  })

  it("keeps automated execution disabled", () => {
    expect(isExecutionModeEnabled("SELF")).toBe(true)
    expect(isExecutionModeEnabled("ASSISTED")).toBe(true)
    expect(isExecutionModeEnabled("AUTOMATED")).toBe(false)
  })
})
