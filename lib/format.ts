import type { Locale } from "@/lib/i18n/dictionaries"

const localeMap: Record<Locale, string> = { bg: "bg-BG", de: "de-DE" }

/** Deterministic currency formatting. Amounts are stored in cents (integers). */
export function formatCents(cents: number | null | undefined, locale: Locale = "de"): string {
  if (cents == null) return "—"
  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function eurosToCents(euros: number | string | null | undefined): number | null {
  if (euros === "" || euros == null) return null
  const n = typeof euros === "string" ? Number.parseFloat(euros.replace(",", ".")) : euros
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToEuros(cents: number | null | undefined): string {
  if (cents == null) return ""
  return (cents / 100).toString()
}

export function formatDate(date: string | Date | null | undefined, locale: Locale = "de"): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(localeMap[locale], { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

/** Whole days from today until `date` (negative = in the past). Deterministic. */
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}