import type { FinanceEntry } from "./contract"

/**
 * HORIZON Business Consultant — cash-flow summary (Module E).
 *
 * Deterministic arithmetic over entries the owner actually has. There is no
 * model here and no estimation: a figure that is not in an entry is not in the
 * summary. Manual entries and document-derived figures are counted and reported
 * separately, so a projection built on typed numbers is never shown as if it
 * rested on documents.
 */

export type MonthlyFinanceRow = {
  /** `YYYY-MM-01`. */
  periodMonth: string
  revenueCents: number
  expenseCents: number
  /** revenue − expense. May be negative; never clamped. */
  netCents: number
  entryCount: number
}

export type FinanceSummary = {
  months: MonthlyFinanceRow[]
  totals: { revenueCents: number; expenseCents: number; netCents: number }
  /** How much of the total rests on a document vs. on the owner's own entry. */
  evidence: { documentCents: number; manualCents: number }
  categories: { category: string; kind: string; totalCents: number }[]
  /** True when there is nothing to show, so the UI asks instead of drawing zeroes. */
  empty: boolean
}

/** `2026-03-15` -> `2026-03-01`. Returns null for anything not an ISO date. */
export function toPeriodMonth(value: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(value)
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return `${match[1]}-${match[2]}-01`
}

/**
 * Summarises entries. `months` is ascending and covers only months that have at
 * least one entry — a month with no data is absent, not a zero row that would
 * look like a measured zero.
 */
export function summariseFinance(entries: readonly FinanceEntry[]): FinanceSummary {
  const byMonth = new Map<string, MonthlyFinanceRow>()
  const byCategory = new Map<string, { category: string; kind: string; totalCents: number }>()
  let revenueCents = 0
  let expenseCents = 0
  let documentCents = 0
  let manualCents = 0

  for (const entry of entries) {
    const month = toPeriodMonth(entry.periodMonth)
    if (!month) continue
    const row = byMonth.get(month) ?? {
      periodMonth: month,
      revenueCents: 0,
      expenseCents: 0,
      netCents: 0,
      entryCount: 0,
    }
    if (entry.kind === "revenue") {
      row.revenueCents += entry.amountCents
      revenueCents += entry.amountCents
    } else {
      row.expenseCents += entry.amountCents
      expenseCents += entry.amountCents
    }
    row.netCents = row.revenueCents - row.expenseCents
    row.entryCount += 1
    byMonth.set(month, row)

    const key = `${entry.kind}:${entry.category}`
    const category = byCategory.get(key) ?? { category: entry.category, kind: entry.kind, totalCents: 0 }
    category.totalCents += entry.amountCents
    byCategory.set(key, category)

    if (entry.source === "manual") manualCents += entry.amountCents
    else documentCents += entry.amountCents
  }

  const months = [...byMonth.values()].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth))
  const categories = [...byCategory.values()].sort((a, b) => b.totalCents - a.totalCents)

  return {
    months,
    totals: { revenueCents, expenseCents, netCents: revenueCents - expenseCents },
    evidence: { documentCents, manualCents },
    categories,
    empty: entries.length === 0,
  }
}

/** Formats integer cents as a euro string. Deterministic, no locale surprises. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100)
  const rest = String(abs % 100).padStart(2, "0")
  const grouped = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${sign}${grouped},${rest} €`
}
