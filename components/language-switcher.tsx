"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import { usePathname, useRouter } from "next/navigation"
import { routing, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage()
  const pathname = usePathname() || "/"
  const router = useRouter()

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    const pathWithoutLocale = pathname.replace(/^\/(bg|de)(?=\/|$)/, "") || "/"
    router.push(`/${nextLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}${window.location.search}${window.location.hash}`)
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--control-radius,0.1875rem)] border border-border bg-card p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label={t.cleanup.language.label}
    >
      {routing.locales.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => changeLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            "min-h-9 min-w-10 rounded-[var(--control-radius,0.1875rem)] px-3 py-2 font-semibold uppercase transition-colors",
            locale === l
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
