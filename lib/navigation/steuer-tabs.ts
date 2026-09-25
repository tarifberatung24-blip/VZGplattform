import { stripLocale } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Sub-navigation for the Steuer section.
 *
 * `/steuer/providers` and `/steuer/review` are sub-steps of one section, so they are surfaced as
 * tabs here rather than as extra sidebar entries — the sidebar keeps exactly one Steuer
 * destination (see lib/navigation/horizon-nav.ts).
 *
 * `exact` marks the index tab. Without it the index would stay highlighted while a sibling tab is
 * open, because every sibling path starts with `/steuer/`.
 */
export const steuerTabs = [
  { href: "/steuer", labelKey: "declaration", exact: true },
  { href: "/steuer/review", labelKey: "review", exact: false },
  { href: "/steuer/providers", labelKey: "providers", exact: false },
] as const

export type SteuerTabLabelKey = (typeof steuerTabs)[number]["labelKey"]

const labels: Record<Locale, Record<SteuerTabLabelKey, string>> = {
  bg: { declaration: "Декларация", review: "Преглед и подаване", providers: "Доставчици (ELSTER)" },
  de: { declaration: "Erklärung", review: "Prüfung & Übermittlung", providers: "Anbieter (ELSTER)" },
}

export function steuerTabLabel(locale: Locale, key: SteuerTabLabelKey): string {
  return labels[locale][key]
}

/** The tab whose page is open, or null when the path is outside the Steuer section. */
export function activeSteuerTab(pathname: string): string | null {
  const path = stripLocale(pathname)
  return (
    steuerTabs.find((tab) =>
      tab.exact ? path === tab.href : path === tab.href || path.startsWith(`${tab.href}/`),
    )?.href ?? null
  )
}
