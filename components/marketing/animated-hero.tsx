"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { LetterEnvelope } from "@/components/marketing/letter-envelope"
import { BrandText, HorizonWordmark } from "@/components/brand/horizon-wordmark"

/**
 * Layer 0 home hero: headline and two buttons, nothing else.
 *
 * Next to it, `LetterEnvelope` shows what the product does: a German letter
 * in its envelope and the same case in the HORIZON dashboard. The orbit map (`layer0-orbit.tsx`) is kept
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
    <div className="layer0-hero relative flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden">
      <main className="relative z-10 grid flex-1 items-center gap-14 px-6 pt-28 pb-16 sm:px-12 sm:pt-28 lg:pt-10 lg:pb-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:px-20">
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center lg:mx-0 lg:items-start lg:text-left">
          {/* Soft halo so the background threads never run through the headline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-24 -inset-y-20 -z-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--background) 72%, transparent)" }}
          />
          <h1 className="font-display text-balance text-[clamp(2.4rem,6vw,5rem)] font-black leading-[1.02] tracking-[-0.04em] text-foreground">
            <HorizonWordmark className="block h-[clamp(2.6rem,6vw,4.6rem)]" />
            <span className="mt-3 block text-[clamp(1.5rem,3.4vw,2.6rem)] font-semibold leading-[1.15] tracking-[-0.015em] text-muted-foreground">
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
              <BrandText text={t.home.hero.howCta} />
            </Link>
          </div>
        </div>
        <LetterEnvelope locale={locale} />
      </main>
    </div>
  )
}
