import type { Locale } from "../i18n/dictionaries"

/**
 * Pure derivation helpers for the dashboard charts and table. They live outside the components so
 * the aggregation rules (category grouping, rolling-12-month buckets) can be tested without a DOM:
 * this repo's vitest setup has no jsdom or testing-library, and it does not resolve the "@/" alias
 * outside `import type`, so anything imported at runtime from a test must be relative and
 * dependency-free. This module therefore imports nothing but a type.
 */

export type ContractLike = {
  id: string
  title: string
  category: string
  provider_name: string | null
  monthly_amount: number | null
  status: string | null
  end_date: string | null
  review_status?: string | null
}

export type DeadlineLike = {
  id: string
  title: string
  due_at: string | null
  status: string | null
}

/** Label used when a contract carries no category, instead of folding it into a real one. */
export const UNCATEGORIZED_CATEGORY: Record<Locale, string> = {
  bg: "Без категория",
  de: "Ohne Kategorie",
}

const formatLocales: Record<Locale, string> = { bg: "bg-BG", de: "de-DE" }

export function formatMoney(value: number, locale: Locale): string {
  return new Intl.NumberFormat(formatLocales[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

/** Returns null for a missing or unparseable date so callers render their own empty label. */
export function formatShortDate(value: string | null, locale: Locale): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat(formatLocales[locale], { day: "2-digit", month: "short" }).format(parsed)
}

export type CategoryTotal = { category: string; amount: number }

/**
 * Sums monthly amounts per real category. Amounts that are missing, non-finite or exactly zero are
 * dropped rather than bucketed, so a category is never invented and a zero-amount contract cannot
 * render as an empty bar.
 */
export function groupContractsByCategory(contracts: ContractLike[], locale: Locale): CategoryTotal[] {
  const groups = new Map<string, number>()
  for (const contract of contracts) {
    const amount = contract.monthly_amount
    if (amount == null || !Number.isFinite(amount) || amount === 0) continue
    const label = contract.category?.trim() || UNCATEGORIZED_CATEGORY[locale]
    groups.set(label, (groups.get(label) ?? 0) + amount)
  }
  return [...groups.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category))
}

export type RollingMonth = {
  key: string
  year: number
  monthIndex: number
  /** Short month name. Unique within a 12-month window, so it is safe as an axis key. */
  label: string
  fullLabel: string
  isCurrent: boolean
  count: number
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

const monthShortFormatters = new Map<Locale, Intl.DateTimeFormat>()
const monthLongFormatters = new Map<Locale, Intl.DateTimeFormat>()

function cachedFormatter(cache: Map<Locale, Intl.DateTimeFormat>, locale: Locale, options: Intl.DateTimeFormatOptions) {
  let formatter = cache.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(formatLocales[locale], options)
    cache.set(locale, formatter)
  }
  return formatter
}

/**
 * Builds the true rolling 12 months starting at `reference`'s month. Each bucket is created by month
 * arithmetic on a date, so a window crossing a year boundary resolves to the correct year instead of
 * being matched against the reference year (the previous bug). Deadlines outside the window are
 * ignored and no bucket is ever invented.
 */
export function buildRollingTwelveMonths(
  deadlines: DeadlineLike[],
  locale: Locale,
  reference: Date = new Date(),
): RollingMonth[] {
  const counts = new Map<string, number>()
  for (const deadline of deadlines) {
    if (!deadline.due_at) continue
    const due = new Date(deadline.due_at)
    if (Number.isNaN(due.getTime())) continue
    const key = monthKey(due.getFullYear(), due.getMonth())
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const shortFormat = cachedFormatter(monthShortFormatters, locale, { month: "short" })
  const longFormat = cachedFormatter(monthLongFormatters, locale, { month: "long", year: "numeric" })
  const months: RollingMonth[] = []
  for (let offset = 0; offset < 12; offset += 1) {
    const point = new Date(reference.getFullYear(), reference.getMonth() + offset, 1)
    const year = point.getFullYear()
    const monthIndex = point.getMonth()
    const key = monthKey(year, monthIndex)
    months.push({
      key,
      year,
      monthIndex,
      label: `${shortFormat.format(point)} ${year}`,
      fullLabel: longFormat.format(point),
      isCurrent: offset === 0,
      count: counts.get(key) ?? 0,
    })
  }
  return months
}

/** Locale-aware label for the "now" marker, so the marker is never rendered in English. */
export function currentMonthLabel(months: RollingMonth[]): string | null {
  return months.find((month) => month.isCurrent)?.label ?? null
}
