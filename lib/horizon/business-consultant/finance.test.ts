import { describe, expect, it } from "vitest"
import { formatCents, summariseFinance, toPeriodMonth } from "./finance"
import type { FinanceEntry } from "./contract"

function entry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: "f1",
    profileId: "p1",
    documentId: null,
    kind: "revenue",
    category: "revenue_sales",
    amountCents: 10000,
    currency: "EUR",
    periodMonth: "2026-01-01",
    description: "",
    recurring: false,
    source: "manual",
    evidenceClass: "user_provided",
    ...overrides,
  }
}

describe("toPeriodMonth", () => {
  it("normalises an ISO date to the first of the month", () => {
    expect(toPeriodMonth("2026-03-15")).toBe("2026-03-01")
    expect(toPeriodMonth("2026-03-01")).toBe("2026-03-01")
  })

  it("rejects anything that is not a valid ISO month", () => {
    expect(toPeriodMonth("2026-13-01")).toBeNull()
    expect(toPeriodMonth("not a date")).toBeNull()
  })
})

describe("summariseFinance", () => {
  it("is empty when there are no entries, so the UI asks instead of drawing zeroes", () => {
    const summary = summariseFinance([])
    expect(summary.empty).toBe(true)
    expect(summary.months).toEqual([])
  })

  it("computes revenue, expense and net per month", () => {
    const summary = summariseFinance([
      entry({ amountCents: 100000, kind: "revenue", periodMonth: "2026-01-01" }),
      entry({ amountCents: 40000, kind: "expense", periodMonth: "2026-01-01", category: "expense_rent" }),
      entry({ amountCents: 50000, kind: "revenue", periodMonth: "2026-02-01" }),
    ])
    expect(summary.months.map((month) => month.periodMonth)).toEqual(["2026-01-01", "2026-02-01"])
    expect(summary.months[0]).toMatchObject({ revenueCents: 100000, expenseCents: 40000, netCents: 60000 })
    expect(summary.totals).toEqual({ revenueCents: 150000, expenseCents: 40000, netCents: 110000 })
  })

  it("keeps a negative net rather than clamping it", () => {
    const summary = summariseFinance([
      entry({ amountCents: 1000, kind: "revenue" }),
      entry({ amountCents: 5000, kind: "expense", category: "expense_other" }),
    ])
    expect(summary.totals.netCents).toBe(-4000)
    expect(summary.months[0].netCents).toBe(-4000)
  })

  it("separates document-backed from manual figures", () => {
    const summary = summariseFinance([
      entry({ amountCents: 1000, source: "manual" }),
      entry({ amountCents: 2000, source: "document", evidenceClass: "verified_fact" }),
      entry({ amountCents: 3000, source: "invoice", evidenceClass: "verified_fact" }),
    ])
    expect(summary.evidence).toEqual({ documentCents: 5000, manualCents: 1000 })
  })

  it("groups totals by category, descending", () => {
    const summary = summariseFinance([
      entry({ amountCents: 100, category: "revenue_sales" }),
      entry({ amountCents: 900, category: "revenue_services" }),
    ])
    expect(summary.categories[0]).toEqual({ category: "revenue_services", kind: "revenue", totalCents: 900 })
  })

  it("ignores an entry with an unusable period instead of mis-bucketing it", () => {
    const summary = summariseFinance([entry({ periodMonth: "bad" })])
    expect(summary.months).toEqual([])
  })
})

describe("formatCents", () => {
  it("formats euro cents deterministically", () => {
    expect(formatCents(0)).toBe("0,00 €")
    expect(formatCents(5)).toBe("0,05 €")
    expect(formatCents(123456)).toBe("1.234,56 €")
    expect(formatCents(-4000)).toBe("-40,00 €")
  })
})
