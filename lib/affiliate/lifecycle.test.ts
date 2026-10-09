import { describe, expect, it } from "vitest"
import {
  affiliateRequestStatuses,
  canTransition,
  isAffiliateRequestStatus,
  isTerminalAffiliateStatus,
} from "./lifecycle"

describe("affiliate request lifecycle", () => {
  it("allows the forward path queued -> in_review -> sent -> waiting_customer -> closed", () => {
    expect(canTransition("queued", "in_review")).toEqual({ ok: true })
    expect(canTransition("in_review", "sent")).toEqual({ ok: true })
    expect(canTransition("sent", "waiting_customer")).toEqual({ ok: true })
    expect(canTransition("waiting_customer", "closed")).toEqual({ ok: true })
  })

  it("allows cancellation from any non-terminal state", () => {
    expect(canTransition("queued", "cancelled").ok).toBe(true)
    expect(canTransition("in_review", "cancelled").ok).toBe(true)
    expect(canTransition("sent", "cancelled").ok).toBe(true)
    expect(canTransition("waiting_customer", "cancelled").ok).toBe(true)
  })

  it("treats closed and cancelled as terminal", () => {
    expect(isTerminalAffiliateStatus("closed")).toBe(true)
    expect(isTerminalAffiliateStatus("cancelled")).toBe(true)
    expect(isTerminalAffiliateStatus("queued")).toBe(false)
    expect(canTransition("closed", "in_review")).toEqual({ ok: false, reason: "terminal" })
    expect(canTransition("cancelled", "queued")).toEqual({ ok: false, reason: "terminal" })
  })

  it("rejects skipping ahead (queued -> sent)", () => {
    expect(canTransition("queued", "sent")).toEqual({ ok: false, reason: "invalid_transition" })
  })

  it("reports a repeated status explicitly so the endpoint can be idempotent", () => {
    expect(canTransition("sent", "sent")).toEqual({ ok: false, reason: "same_status" })
  })

  it("rejects unknown statuses", () => {
    expect(canTransition("queued", "paid")).toEqual({ ok: false, reason: "unknown_status" })
    expect(canTransition("nope", "queued")).toEqual({ ok: false, reason: "unknown_status" })
  })

  it("recognises exactly the declared statuses", () => {
    expect(affiliateRequestStatuses).toEqual([
      "queued",
      "in_review",
      "sent",
      "waiting_customer",
      "closed",
      "cancelled",
    ])
    expect(isAffiliateRequestStatus("waiting_customer")).toBe(true)
    expect(isAffiliateRequestStatus("paid")).toBe(false)
    expect(isAffiliateRequestStatus(42)).toBe(false)
  })
})
