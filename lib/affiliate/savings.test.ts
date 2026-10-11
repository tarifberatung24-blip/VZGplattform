import { describe, expect, it } from "vitest"
import { canTransitionSaving, computeSaving, createSavingRecord, resolveSavingOwner } from "./savings"

describe("computeSaving", () => {
  it("computes the annual saving in integer cents from two monthly amounts", () => {
    expect(computeSaving("123.40", 90.9)).toEqual({ ok: true, oldMonthlyCents: 12340, newMonthlyCents: 9090, annualSavingCents: 39000 })
  })

  it("rejects amounts that are not a real reduction", () => {
    expect(computeSaving(50, 50)).toEqual({ ok: false, reason: "no_reduction" })
    expect(computeSaving(50, 60)).toEqual({ ok: false, reason: "no_reduction" })
  })

  it("rejects malformed or zero amounts instead of rounding", () => {
    expect(computeSaving(0, 0)).toEqual({ ok: false, reason: "invalid_old_amount" })
    expect(computeSaving("12.345", 1)).toEqual({ ok: false, reason: "invalid_old_amount" })
    expect(computeSaving(10, "-1")).toEqual({ ok: false, reason: "invalid_new_amount" })
  })
})

describe("canTransitionSaving", () => {
  it("allows secured to become realized or cancelled", () => {
    expect(canTransitionSaving("secured", "realized")).toEqual({ ok: true })
    expect(canTransitionSaving("secured", "cancelled")).toEqual({ ok: true })
  })

  it("freezes terminal states and flags repeats", () => {
    expect(canTransitionSaving("realized", "cancelled")).toEqual({ ok: false, reason: "terminal" })
    expect(canTransitionSaving("cancelled", "secured")).toEqual({ ok: false, reason: "terminal" })
    expect(canTransitionSaving("secured", "secured")).toEqual({ ok: false, reason: "same_status" })
    expect(canTransitionSaving("secured", "paid")).toEqual({ ok: false, reason: "unknown_status" })
  })
})

function fakeClient(row: unknown, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    maybeSingle: async () => ({ data: row, error }),
    single: async () => ({ data: row, error }),
  }
  return { from: () => chain } as never
}

describe("resolveSavingOwner", () => {
  it("attributes through the click event when it carries a user", async () => {
    const client = fakeClient({ id: "c1", offer_id: "energy", user_id: "u1", optimize_session_id: "s1" })
    expect(await resolveSavingOwner(client, { clickId: "c1" })).toEqual({ userId: "u1", offerId: "energy", optimizeSessionId: "s1", clickEventId: "c1" })
  })

  it("refuses an anonymous click", async () => {
    const client = fakeClient({ id: "c1", offer_id: "energy", user_id: null, optimize_session_id: null })
    expect(await resolveSavingOwner(client, { clickId: "c1" })).toBeNull()
  })

  it("falls back to the Optimize session owner and partner", async () => {
    const client = fakeClient({ id: "s1", user_id: "u1", partner_id: "kfz" })
    expect(await resolveSavingOwner(client, { optimizeSessionId: "s1" })).toEqual({ userId: "u1", offerId: "kfz", optimizeSessionId: "s1", clickEventId: null })
  })

  it("returns null without a client or reference", async () => {
    expect(await resolveSavingOwner(null, { clickId: "c1" })).toBeNull()
    expect(await resolveSavingOwner(fakeClient(null), {})).toBeNull()
  })
})

describe("createSavingRecord", () => {
  const input = {
    userId: "u1", offerId: "energy", optimizeSessionId: "s1", clickEventId: null,
    oldMonthlyCents: 12000, newMonthlyCents: 9000, status: "secured" as const,
    evidenceSource: "partner_confirmation" as const, switchEffectiveDate: null, evidenceNote: null,
  }

  it("reports a repeated session as duplicate instead of failing", async () => {
    expect(await createSavingRecord(fakeClient(null, { code: "23505" }), input)).toEqual({ outcome: "duplicate" })
  })

  it("returns the stored annual saving", async () => {
    expect(await createSavingRecord(fakeClient({ id: "r1", annual_saving_cents: 36000 }), input)).toEqual({ outcome: "created", id: "r1", annualSavingCents: 36000 })
  })
})
