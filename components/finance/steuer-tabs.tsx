"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { activeSteuerTab, steuerTabLabel, steuerTabs } from "@/lib/navigation/steuer-tabs"

/**
 * In-page navigation for the Steuer section, so `/steuer/review` and `/steuer/providers` are
 * reachable without typing the URL. The model and its labels live in
 * lib/navigation/steuer-tabs.ts, which is unit-tested.
 */
export function SteuerTabs() {
  const pathname = usePathname() ?? "/"
  const { locale } = useLanguage()
  const current = activeSteuerTab(pathname)

  return (
    <nav
      aria-label={locale === "de" ? "Steuer-Bereiche" : "Раздели на данъците"}
      className="flex flex-wrap gap-2"
    >
      {steuerTabs.map((tab) => {
        const isCurrent = current === tab.href
        return (
          <Link
            key={tab.href}
            href={localizedPath(tab.href, locale)}
            aria-current={isCurrent ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {steuerTabLabel(locale, tab.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
