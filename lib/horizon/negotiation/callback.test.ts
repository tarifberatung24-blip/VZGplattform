import { describe, expect, it } from "vitest"
import {
  decideAssistedCallback,
  isAssistedCallbackStatus,
  ASSISTED_CALLBACK_STATUSES,
} from "./callback"
import { canTransitionAssistedRequest } from "./assisted"

/**
 * The callback decision is the whole security surface of the inbound operator
 * path, so it is tested as a pure function: no database, no network, every branch
 * asserted directly.
 */

const base = {
  requestId: "hzn_1",
  sessionRequestId: "hzn_1",
  currentStatus: "QUEUED" as const,
}

describe("assisted callback — request ownership", () => {
  it("refuses a request id the session never recorded", () => {
    expect(
      decideAssistedCallback({ ...base, requestId: "hzn_never", requestedStatus: "IN_PROGRESS" }),
    ).toEqual({ kind: "UNKNOWN_REQUEST" })
  })

  it("refuses a callback naming a different session's request", () => {
    expect(
      decideAssistedCallback({ ...base, sessionRequestId: "hzn_other", requestedStatus: "IN_PROGRESS" }),
    ).toEqual({ kind: "UNKNOWN_REQUEST" })
  })

  it("refuses when the session has no queued request at all", () => {
    expect(
      decideAssistedCallback({ ...base, sessionRequestId: null, requestedStatus: "IN_PROGRESS" }),
    ).toEqual({ kind: "UNKNOWN_REQUEST" })
  })

  it("refuses when a request id matches but no status is recorded", () => {
    expect(
      decideAssistedCallback({ ...base, currentStatus: null, requestedStatus: "IN_PROGRESS" }),
    ).toEqual({ kind: "NOT_QUEUED" })
  })
})

describe("assisted callback — the declared chain", () => {
  it("walks QUEUED → IN_PROGRESS → AWAITING_PROVIDER → AWAITING_CUSTOMER → IN_PROGRESS → COMPLETED", () => {
    const chain = [
      { current: "QUEUED", next: "IN_PROGRESS" },
      { current: "IN_PROGRESS", next: "AWAITING_PROVIDER" },
      { current: "AWAITING_PROVIDER", next: "AWAITING_CUSTOMER" },
      { current: "AWAITING_CUSTOMER", next: "IN_PROGRESS" },
      { current: "IN_PROGRESS", next: "COMPLETED" },
    ] as const
    for (const step of chain) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: step.current, requestedStatus: step.next }),
      ).toMatchObject({ kind: "APPLIED", status: step.next, from: step.current })
    }
  })

  it("rejects every undeclared jump", () => {
    const illegal = [
      ["QUEUED", "COMPLETED"],
      ["QUEUED", "AWAITING_PROVIDER"],
      ["AWAITING_CUSTOMER", "AWAITING_PROVIDER"],
      ["AWAITING_CUSTOMER", "COMPLETED"],
    ] as const
    for (const [current, next] of illegal) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: current, requestedStatus: next }),
      ).toEqual({ kind: "INVALID_TRANSITION", from: current })
    }
  })
})

describe("assisted callback — terminal states", () => {
  it("treats COMPLETED as terminal", () => {
    for (const next of ["IN_PROGRESS", "AWAITING_PROVIDER", "AWAITING_CUSTOMER"]) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: "COMPLETED", requestedStatus: next }),
      ).toEqual({ kind: "INVALID_TRANSITION", from: "COMPLETED" })
    }
  })

  it("treats CANCELLED as terminal", () => {
    for (const next of ["IN_PROGRESS", "COMPLETED"]) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: "CANCELLED", requestedStatus: next }),
      ).toEqual({ kind: "INVALID_TRANSITION", from: "CANCELLED" })
    }
  })

  it("never lets a callback set QUEUED or CANCELLED", () => {
    // QUEUED is a start state and CANCELLED belongs to the customer's own PATCH;
    // neither is callable, so an operator cannot cancel on the customer's behalf.
    for (const status of ["QUEUED", "CANCELLED"]) {
      expect(isAssistedCallbackStatus(status)).toBe(false)
      expect(
        decideAssistedCallback({ ...base, currentStatus: "IN_PROGRESS", requestedStatus: status }),
      ).toEqual({ kind: "INVALID_TRANSITION", from: "IN_PROGRESS" })
    }
  })
})

describe("assisted callback — idempotency", () => {
  it("acknowledges a repeat of the stored status as a replay", () => {
    // Only callable statuses can be replayed: QUEUED is not callable, so a
    // callback that names it is refused as an invalid transition, not a no-op.
    for (const status of ["IN_PROGRESS", "AWAITING_PROVIDER", "AWAITING_CUSTOMER", "COMPLETED"] as const) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: status, requestedStatus: status }),
      ).toEqual({ kind: "REPLAY", status })
    }
  })

  it("never reports a replay as APPLIED, so a retry cannot duplicate an event", () => {
    const decision = decideAssistedCallback({
      ...base,
      currentStatus: "AWAITING_PROVIDER",
      requestedStatus: "AWAITING_PROVIDER",
    })
    expect(decision.kind).not.toBe("APPLIED")
  })
})

describe("assisted callback — status vocabulary", () => {
  it("accepts exactly the four callable statuses", () => {
    expect([...ASSISTED_CALLBACK_STATUSES]).toEqual([
      "IN_PROGRESS",
      "AWAITING_PROVIDER",
      "AWAITING_CUSTOMER",
      "COMPLETED",
    ])
    expect(isAssistedCallbackStatus("IN_PROGRESS")).toBe(true)
    expect(isAssistedCallbackStatus("in_progress")).toBe(false)
    expect(isAssistedCallbackStatus("")).toBe(false)
    expect(isAssistedCallbackStatus(null)).toBe(false)
  })

  it("rejects a non-string or unknown status", () => {
    for (const status of [null, undefined, 42, {}, "DONE"]) {
      expect(
        decideAssistedCallback({ ...base, currentStatus: "IN_PROGRESS", requestedStatus: status }),
      ).toEqual({ kind: "INVALID_TRANSITION", from: "IN_PROGRESS" })
    }
  })
})

describe("assisted callback — agrees with the queue's own transition table", () => {
  it("applies a move only when the queue allows it", () => {
    const statuses = ["QUEUED", "IN_PROGRESS", "AWAITING_CUSTOMER", "AWAITING_PROVIDER", "COMPLETED", "CANCELLED"] as const
    for (const from of statuses) {
      for (const to of statuses) {
        const decision = decideAssistedCallback({
          ...base,
          currentStatus: from,
          requestedStatus: to,
        })
        if (decision.kind === "APPLIED") {
          expect(canTransitionAssistedRequest(from, to)).toBe(true)
        }
      }
    }
  })
})
