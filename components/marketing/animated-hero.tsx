"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { LetterUntangle } from "@/components/marketing/letter-untangle"

/**
 * Layer 0 home hero: headline and two buttons, nothing else.
 *
 * Next to it, `LetterUntangle` shows what the product does: a German letter
 * that turns into three plain cards. The orbit map (`layer0-orbit.tsx`) is kept
 * in the repository but not shown until its redesign is approved by the owner.
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
      <main className="relative z-10 grid flex-1 items-center gap-14 px-6 pt-28 pb-20 sm:px-12 sm:pt-32 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-20">
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center lg:mx-0 lg:items-start lg:text-left">
          {/* Soft halo so the background threads never run through the headline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-24 -inset-y-20 -z-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--background) 72%, transparent)" }}
          />
          <h1 className="font-display text-balance text-[clamp(2.4rem,6vw,5rem)] font-black leading-[1.02] tracking-[-0.04em] text-foreground">
            {t.home.hero.headline1}
            <span
              className="mt-2 block text-[clamp(1.5rem,3.4vw,2.6rem)] leading-[1.1] tracking-[-0.02em]"
              style={{ color: "var(--thread-core)" }}
            >
              {t.home.hero.headline2}
            </span>
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href={localizedPath("/auth/login", locale)}
              className="glass-surface inline-flex items-center gap-2 rounded-lg px-6 py-3 backdrop-blur-md text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              style={{
                background: "color-mix(in srgb, var(--primary) 90%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 55%, transparent)",
              }}
            >
              {t.home.hero.loginCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={localizedPath("/how-it-works", locale)}
              className="glass-surface inline-flex items-center gap-2 rounded-lg px-6 py-3 backdrop-blur-md text-sm font-semibold text-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              {t.home.hero.howCta}
            </Link>
          </div>
        </div>
        <LetterUntangle locale={locale} />
      </main>
    </div>
  )
}
