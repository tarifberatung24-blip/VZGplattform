import { describe, expect, it } from "vitest"
import { summarizeRevenue } from "./summary"

describe("summarizeRevenue", () => {
  it("counts clicks, commissions and non-cancelled savings per offer", () => {
    const summary = summarizeRevenue(
      30,
      [
        { offer_id: "energy", user_id: "u1" },
        { offer_id: "energy", user_id: null },
        { offer_id: "kfz", user_id: "u2" },
      ],
      [
        { offer_id: "energy", status: "approved", amount_cents: 4000 },
        { offer_id: "energy", status: "pending", amount_cents: 2500 },
        { offer_id: "kfz", status: "approved", amount_cents: 1000 },
      ],
      [
        { offer_id: "energy", status: "secured", annual_saving_cents: 39000, user_id: "u1" },
        { offer_id: "energy", status: "realized", annual_saving_cents: 12000, user_id: "u1" },
        { offer_id: "kfz", status: "cancelled", annual_saving_cents: 9999, user_id: "u2" },
      ],
    )

    expect(summary.clicks).toEqual({ total: 3, attributed: 2 })
    expect(summary.commissionCents).toEqual({ approved: 5000, pending: 2500 })
    expect(summary.savings).toEqual({ securedCents: 39000, realizedCents: 12000, usersWithSavings: 1 })
    expect(summary.byOffer.energy).toEqual({
      clicks: 2,
      attributedClicks: 1,
      commissionCents: { approved: 4000, pending: 2500 },
      securedSavingCents: 39000,
      realizedSavingCents: 12000,
    })
    expect(summary.byOffer.kfz.securedSavingCents).toBe(0)
    expect(summary.truncated).toBe(false)
  })

  it("returns an empty summary for no data", () => {
    expect(summarizeRevenue(7, [], [], [])).toEqual({
      windowDays: 7,
      clicks: { total: 0, attributed: 0 },
      commissionCents: {},
      savings: { securedCents: 0, realizedCents: 0, usersWithSavings: 0 },
      byOffer: {},
      truncated: false,
    })
  })
})
