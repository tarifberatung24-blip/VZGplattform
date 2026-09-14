import type { Locale } from "./dictionaries"

export const LOCALE_COOKIE_KEY = "finanzbg_locale"
export const locales: Locale[] = ["bg", "de"]
export const defaultLocale: Locale = "bg"

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "bg" || value === "de"
}

export function localizedPath(pathname: string, locale: Locale) {
  const cleanPath = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`
  return `/${locale}${cleanPath}`
}

export function stripLocale(pathname: string) {
  const parts = pathname.split("/")
  return isLocale(parts[1]) ? `/${parts.slice(2).join("/")}`.replace(/\/$/, "") || "/" : pathname
}
