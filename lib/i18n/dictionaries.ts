import bg from "@/messages/bg.json"
import de from "@/messages/de.json"

export type Locale = "bg" | "de"

export const locales: Locale[] = ["bg", "de"]
export const defaultLocale: Locale = "bg"

// bg.json and de.json share the exact same shape.
export type Dictionary = typeof bg

const dictionaries: Record<Locale, Dictionary> = { bg, de }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "bg" || value === "de"
}