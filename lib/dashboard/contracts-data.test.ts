import { describe, expect, it } from "vitest"
import {
  buildRollingTwelveMonths,
  currentMonthLabel,
  formatShortDate,
  groupContractsByCategory,
  type ContractLike,
  type DeadlineLike,
} from "./contracts-data"

function contract(overrides: Partial<ContractLike> & { id: string }): ContractLike {
  return {
    title: "Vertrag",
    category: "Sonstige",
    provider_name: null,
    monthly_amount: null,
    status: "confirmed",
    end_date: null,
    ...overrides,
  }
}

function deadline(overrides: Partial<DeadlineLike> & { id: string }): DeadlineLike {
  return { title: "Frist", due_at: null, status: "open", ...overrides }
}

describe("groupContractsByCategory", () => {
  it("returns nothing for zero contracts", () => {
    expect(groupContractsByCategory([], "de")).toEqual([])
  })

  it("keeps the real category instead of collapsing it to a fallback", () => {
    const data = groupContractsByCategory(
      [contract({ id: "1", category: "Versicherung", monthly_amount: 40 })],
      "de",
    )
    expect(data).toEqual([{ category: "Versicherung", amount: 40 }])
  })

  it("preserves multiple distinct categories and sums per category", () => {
    const data = groupContractsByCategory(
      [
        contract({ id: "1", category: "Versicherung", monthly_amount: 40 }),
        contract({ id: "2", category: "Versicherung", monthly_amount: 10.5 }),
        contract({ id: "3", category: "Strom", monthly_amount: 80 }),
      ],
      "de",
    )
    expect(data).toEqual([
      { category: "Strom", amount: 80 },
      { category: "Versicherung", amount: 50.5 },
    ])
  })

  it("uses the locale-specific label only when the category is genuinely empty", () => {
    const bg = groupContractsByCategory(
      [contract({ id: "1", category: "  ", monthly_amount: 20 })],
      "bg",
    )
    const de = groupContractsByCategory(
      [contract({ id: "1", category: "", monthly_amount: 20 })],
      "de",
    )
    expect(bg).toEqual([{ category: "Без категория", amount: 20 }])
    expect(de).toEqual([{ category: "Ohne Kategorie", amount: 20 }])
    expect(bg[0].category).not.toBe(de[0].category)
  })

  it("does not invent a bar for missing or zero amounts", () => {
    const data = groupContractsByCategory(
      [
        contract({ id: "1", category: "Strom", monthly_amount: null }),
        contract({ id: "2", category: "Strom", monthly_amount: 0 }),
        contract({ id: "3", category: "Strom", monthly_amount: Number.NaN }),
      ],
      "de",
    )
    expect(data).toEqual([])
  })

  it("sorts descending by amount regardless of input order", () => {
    const data = groupContractsByCategory(
      [
        contract({ id: "1", category: "Klein", monthly_amount: 5 }),
        contract({ id: "2", category: "Gross", monthly_amount: 500 }),
        contract({ id: "3", category: "Mittel", monthly_amount: 50 }),
      ],
      "de",
    )
    expect(data.map((item) => item.category)).toEqual(["Gross", "Mittel", "Klein"])
  })
})

describe("buildRollingTwelveMonths", () => {
  it("starts at the reference month and covers exactly twelve months", () => {
    const months = buildRollingTwelveMonths([], "de", new Date(2026, 5, 15))
    expect(months).toHaveLength(12)
    expect(months[0]).toMatchObject({ year: 2026, monthIndex: 5, isCurrent: true, count: 0 })
    expect(months[11]).toMatchObject({ year: 2027, monthIndex: 4, isCurrent: false })
  })

  it("resolves the correct year across a year rollover", () => {
    const months = buildRollingTwelveMonths([], "de", new Date(2026, 10, 3))

    // Nov 2026 through Oct 2027: each bucket must carry its own year.
    expect(months.map((month) => `${month.year}-${month.monthIndex}`)).toEqual([
      "2026-10",
      "2026-11",
      "2027-0",
      "2027-1",
      "2027-2",
      "2027-3",
      "2027-4",
      "2027-5",
      "2027-6",
      "2027-7",
      "2027-8",
      "2027-9",
    ])
  })

  it("counts a deadline in the same month and year, not by month alone", () => {
    const months = buildRollingTwelveMonths(
      [
        // Same calendar month (January) in both years: only the in-window one may count.
        deadline({ id: "in", due_at: new Date(2027, 0, 5).toISOString() }),
        deadline({ id: "out", due_at: new Date(2026, 0, 5).toISOString() }),
      ],
      "de",
      new Date(2026, 10, 3),
    )
    const january2027 = months.find((month) => month.year === 2027 && month.monthIndex === 0)
    // 2026-01 predates the window, so it is absent rather than mis-bucketed into 2027.
    expect(january2027?.count).toBe(1)
    expect(months.filter((month) => month.monthIndex === 0)).toHaveLength(1)
  })

  it("ignores missing and unparseable due dates without inventing counts", () => {
    const months = buildRollingTwelveMonths(
      [
        deadline({ id: "1", due_at: null }),
        deadline({ id: "2", due_at: "not-a-date" }),
      ],
      "de",
      new Date(2026, 5, 1),
    )
    expect(months.every((month) => month.count === 0)).toBe(true)
  })

  it("ignores deadlines outside the rolling window", () => {
    const months = buildRollingTwelveMonths(
      [
        deadline({ id: "past", due_at: new Date(2026, 3, 1).toISOString() }),
        deadline({ id: "future", due_at: new Date(2027, 8, 1).toISOString() }),
      ],
      "de",
      new Date(2026, 5, 1),
    )
    expect(months.every((month) => month.count === 0)).toBe(true)
  })

  it("sums several deadlines inside the same bucket", () => {
    const reference = new Date(2026, 5, 1)
    const months = buildRollingTwelveMonths(
      [
        deadline({ id: "1", due_at: new Date(2026, 5, 4).toISOString() }),
        deadline({ id: "2", due_at: new Date(2026, 5, 28).toISOString() }),
      ],
      "de",
      reference,
    )
    expect(months[0].count).toBe(2)
  })

  it("labels months per locale and keeps axis labels unique", () => {
    const reference = new Date(2026, 5, 1)
    const bg = buildRollingTwelveMonths([], "bg", reference)
    const de = buildRollingTwelveMonths([], "de", reference)

    // Assert against Intl itself: Bulgarian CLDR renders the short month numerically, so a
    // hardcoded "юни" would encode one ICU version's data rather than the contract.
    const expectedDe = new Intl.DateTimeFormat("de-DE", { month: "short" }).format(reference)
    const expectedBg = new Intl.DateTimeFormat("bg-BG", { month: "short" }).format(reference)
    expect(de[0].label).toBe(`${expectedDe} 2026`)
    expect(bg[0].label).toBe(`${expectedBg} 2026`)
    expect(bg[0].label).not.toBe(de[0].label)

    // Year is part of the label, so the same month name in two different years stays distinct,
    // which keeps the labels usable as an axis dataKey across a rollover.
    expect(new Set(bg.map((month) => month.label)).size).toBe(12)
    expect(new Set(de.map((month) => month.label)).size).toBe(12)
    expect(bg[0].fullLabel).toContain("2026")
  })

  it("exposes a locale-aware current-month label with no English leak", () => {
    const reference = new Date(2026, 5, 1)
    const bgMonths = buildRollingTwelveMonths([], "bg", reference)
    const deMonths = buildRollingTwelveMonths([], "de", reference)

    // The marker label must equal the axis label of the current bucket so ReferenceLine lands on it.
    expect(currentMonthLabel(bgMonths)).toBe(bgMonths[0].label)
    expect(currentMonthLabel(deMonths)).toBe(deMonths[0].label)
    expect(currentMonthLabel(bgMonths)).not.toMatch(/Current|Today|Heute|Aktuell/)
    expect(currentMonthLabel([])).toBeNull()
  })
})

describe("formatShortDate", () => {
  it("formats per locale and returns null for unusable input", () => {
    expect(formatShortDate("2026-06-15T00:00:00.000Z", "de")).toBeTruthy()
    expect(formatShortDate("2026-06-15T00:00:00.000Z", "bg")).toBeTruthy()
    expect(formatShortDate(null, "de")).toBeNull()
    expect(formatShortDate("not-a-date", "de")).toBeNull()
  })
})
