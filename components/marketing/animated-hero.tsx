"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { Layer0Orbit } from "@/components/marketing/layer0-orbit"

/**
 * Layer 0 home hero.
 *
 * The animated network is no longer owned by this component: it lives in the
 * global NetworkThreads layer so the threads run behind the glass header and
 * footer as well as the hero content. This surface is transparent on purpose —
 * the theme background and the threads show through it.
 */
export function AnimatedHero() {
  const { t, locale } = useLanguage()

  return (
    <div className="layer0-hero relative flex min-h-[100dvh] flex-col overflow-hidden">
      <main className="relative z-10 grid flex-1 items-start gap-12 px-6 pt-28 pb-20 sm:px-12 sm:pt-32 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-4 lg:px-20">
        <div className="flex w-full max-w-2xl flex-col items-start gap-6 lg:pt-20">
          <h1 className="font-display text-balance text-[clamp(2.4rem,6vw,5rem)] font-black leading-[1.02] tracking-[-0.04em] text-foreground">
            {t.home.hero.headline1}
            <span className="mt-1 block" style={{ color: "var(--thread-core)" }}>
              {t.home.hero.headline2}
            </span>
          </h1>

          <p className="max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
            {t.home.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={localizedPath("/auth/sign-up", locale)}
              className="glass-surface inline-flex items-center gap-2 rounded-lg px-6 py-3 backdrop-blur-md text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              style={{
                background: "color-mix(in srgb, var(--primary) 90%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 55%, transparent)",
              }}
            >
              {t.home.hero.primaryCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={localizedPath("/how-it-works", locale)}
              className="glass-surface inline-flex items-center gap-2 rounded-lg px-6 py-3 backdrop-blur-md text-sm font-semibold text-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              {t.home.hero.navAbout}
            </Link>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.home.trust}
          </p>
        </div>
        <Layer0Orbit />
      </main>
    </div>
  )
}
