import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysUntil(value: string | Date): number | null {
  const target = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatCurrency(cents: number | null | undefined, locale = "de-DE") {
  if (cents == null || !Number.isFinite(cents)) return "—"
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100)
}

export function formatDate(value: string | Date | null | undefined, locale = "de-DE") {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale).format(date)
}
