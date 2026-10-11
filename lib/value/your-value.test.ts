import { describe, expect, it } from "vitest"
import { computeYourValue } from "./your-value"

const now = new Date("2026-10-11T10:00:00Z")

describe("computeYourValue", () => {
  it("sums confirmed monthly amounts and counts deadlines inside the horizon", () => {
    const value = computeYourValue(
      [
        { monthly_amount: 120.5, cancellation_deadline: "2026-11-01", end_date: "2027-01-31" },
        { monthly_amount: "39.99", cancellation_deadline: null, end_date: "2027-06-30" },
        { monthly_amount: null, cancellation_deadline: "2026-09-01", end_date: null },
      ],
      [],
      now,
    )
    expect(value).toMatchObject({ trackedContracts: 3, monthlyUnderControl: 160.49, upcomingDeadlines: 1, nextDeadline: "2026-11-01" })
  })

  it("ignores past and malformed dates", () => {
    const value = computeYourValue([{ monthly_amount: 10, cancellation_deadline: "2026-10-10", end_date: "soon" }], [], now)
    expect(value.upcomingDeadlines).toBe(0)
    expect(value.nextDeadline).toBeNull()
  })

  it("reports only evidenced secured and realized savings", () => {
    const value = computeYourValue([], [
      { status: "secured", annual_saving_cents: 39000 },
      { status: "realized", annual_saving_cents: 12050 },
      { status: "cancelled", annual_saving_cents: 99999 },
    ], now)
    expect(value.securedAnnualSavings).toBe(390)
    expect(value.realizedAnnualSavings).toBe(120.5)
  })
})
