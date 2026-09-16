"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { useLanguage } from "@/lib/i18n/language-context"

export function SiteFooter() {
  const { t, locale } = useLanguage()

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.brand.tagline}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
            <Link href="/uslugi" className="text-muted-foreground hover:text-foreground">
              {t.nav.services}
            </Link>
            <Link href="/anspruch" className="text-muted-foreground hover:text-foreground">
              {t.nav.benefits}
            </Link>
            <Link href="/vertraege" className="text-muted-foreground hover:text-foreground">
              {t.nav.contracts}
            </Link>
            <Link href="/za-nas" className="text-muted-foreground hover:text-foreground">
              {t.nav.about}
            </Link>
            <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">
              {t.nav.login}
            </Link>
            <Link href="/auth/sign-up" className="text-muted-foreground hover:text-foreground">
              {t.nav.register}
            </Link>
            <Link href={`/${locale}/datenschutz`} className="text-muted-foreground hover:text-foreground">
              {locale === "bg" ? "Поверителност" : "Datenschutz"}
            </Link>
            <Link href={`/${locale}/agb`} className="text-muted-foreground hover:text-foreground">
              {locale === "bg" ? "Общи условия" : "AGB"}
            </Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">{t.home.disclaimer}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} KintexBG · Made for life in Germany
          </p>
        </div>
      </div>
    </footer>
  )
}
