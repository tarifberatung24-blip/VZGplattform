import { describe, expect, it } from "vitest"
import {
  canTransitionCommission,
  commissionModels,
  commissionStatuses,
  computeCommissionCents,
  conversionKey,
  isCommissionModel,
  isCommissionStatus,
  isTerminalCommissionStatus,
  toCents,
} from "./commission"

describe("toCents", () => {
  it("parses decimals to exact integer cents", () => {
    expect(toCents("12")).toBe(1200)
    expect(toCents("12.5")).toBe(1250)
    expect(toCents("12.50")).toBe(1250)
    expect(toCents(12.5)).toBe(1250)
    expect(toCents("0.01")).toBe(1)
  })

  it("rejects negative, over-precise and unparseable input", () => {
    expect(toCents("-1")).toBeNull()
    expect(toCents("1.234")).toBeNull()
    expect(toCents("abc")).toBeNull()
    expect(toCents("")).toBeNull()
    expect(toCents(null)).toBeNull()
    expect(toCents(undefined)).toBeNull()
  })
})

describe("computeCommissionCents", () => {
  it("computes a flat CPA payout", () => {
    expect(computeCommissionCents({ model: "cpa", cpaAmountEur: "45.00" })).toEqual({ ok: true, amountCents: 4500 })
  })

  it("computes a revenue share on the deal value", () => {
    // 12% of 2500.00 = 300.00
    expect(
      computeCommissionCents({ model: "revenue_share", revenueSharePercent: 12, dealValueEur: "2500" }),
    ).toEqual({ ok: true, amountCents: 30000 })
  })

  it("sums both parts for a hybrid model", () => {
    // 45.00 CPA + 10% of 1000.00 = 45.00 + 100.00 = 145.00
    expect(
      computeCommissionCents({
        model: "hybrid",
        cpaAmountEur: 45,
        revenueSharePercent: 10,
        dealValueEur: 1000,
      }),
    ).toEqual({ ok: true, amountCents: 14500 })
  })

  it("rounds the revenue share once, to the cent", () => {
    // 33.33% of 0.10 = 0.03333 -> 3 cents
    expect(
      computeCommissionCents({ model: "revenue_share", revenueSharePercent: "33.33", dealValueEur: "0.10" }),
    ).toEqual({ ok: true, amountCents: 3 })
  })

  it("refuses to invent a commission from missing or invalid inputs", () => {
    expect(computeCommissionCents({ model: "cpa" })).toEqual({ ok: false, reason: "invalid_cpa" })
    expect(computeCommissionCents({ model: "revenue_share", revenueSharePercent: 10 })).toEqual({
      ok: false,
      reason: "invalid_deal_value",
    })
    expect(
      computeCommissionCents({ model: "revenue_share", revenueSharePercent: 101, dealValueEur: 100 }),
    ).toEqual({ ok: false, reason: "invalid_share" })
    expect(
      computeCommissionCents({ model: "revenue_share", revenueSharePercent: "abc", dealValueEur: 100 }),
    ).toEqual({ ok: false, reason: "invalid_share" })
  })
})

describe("commission lifecycle", () => {
  it("allows pending -> approved -> paid", () => {
    expect(canTransitionCommission("pending", "approved")).toEqual({ ok: true })
    expect(canTransitionCommission("approved", "paid")).toEqual({ ok: true })
  })

  it("allows rejection from pending and approved", () => {
    expect(canTransitionCommission("pending", "rejected").ok).toBe(true)
    expect(canTransitionCommission("approved", "rejected").ok).toBe(true)
  })

  it("treats paid and rejected as terminal", () => {
    expect(isTerminalCommissionStatus("paid")).toBe(true)
    expect(isTerminalCommissionStatus("rejected")).toBe(true)
    expect(canTransitionCommission("paid", "approved")).toEqual({ ok: false, reason: "terminal" })
    expect(canTransitionCommission("rejected", "pending")).toEqual({ ok: false, reason: "terminal" })
  })

  it("rejects skipping straight to paid and reports repeats", () => {
    expect(canTransitionCommission("pending", "paid")).toEqual({ ok: false, reason: "invalid_transition" })
    expect(canTransitionCommission("approved", "approved")).toEqual({ ok: false, reason: "same_status" })
  })

  it("recognises exactly the declared models and statuses", () => {
    expect(commissionModels).toEqual(["cpa", "revenue_share", "hybrid"])
    expect(commissionStatuses).toEqual(["pending", "approved", "rejected", "paid"])
    expect(isCommissionModel("hybrid")).toBe(true)
    expect(isCommissionModel("flat")).toBe(false)
    expect(isCommissionStatus("paid")).toBe(true)
    expect(isCommissionStatus("done")).toBe(false)
  })
})

describe("conversionKey", () => {
  it("is deterministic and distinguishes offers", () => {
    expect(conversionKey("hz_1", "kfz")).toBe("hz_1::kfz")
    expect(conversionKey("hz_1", "kfz")).toBe(conversionKey("hz_1", "kfz"))
    expect(conversionKey("hz_1", "kfz")).not.toBe(conversionKey("hz_1", "energy"))
  })
})
