"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Phone, ShieldCheck, Sparkles, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InsuranceCalculator } from "@/components/affiliate/insurance-calculator"
import { KfzHeroVisual } from "@/components/affiliate/kfz-hero-visual"
import { kfzCalculatorCopy, kfzCalculatorFields } from "@/components/affiliate/kfz-calculator"
import { insuranceHubCopy, kfzLandingCopy } from "@/components/affiliate/insurance-content"
import { affiliateDisclosureFor } from "@/lib/affiliate-disclosure"
import { localizedPath } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"
import { useState } from "react"

type KfzProductCopy = { name: string; summary: string; details: string[]; cta: string }

const tileIcons = [Sparkles, ShieldCheck, Timer, Phone]

/**
 * Kfz landing page. The layout follows the approved dark-navy design, but every
 * claim is kept verifiable: no customer counts, no star rating and no guaranteed
 * saving. Catalogue facts come from the product copy; the headline carries the
 * approved slogan only.
 */
export function KfzLanding({
  locale,
  product,
  isOffered,
  phone,
}: {
  locale: Locale
  product: KfzProductCopy
  isOffered: boolean
  phone?: string
}) {
  const copy = kfzLandingCopy[locale]
  const hub = insuranceHubCopy[locale]
  const calcCopy = kfzCalculatorCopy[locale]
  const [coverage, setCoverage] = useState<string | null>(null)

  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden bg-[#070d19] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_-10%,rgba(77,141,255,0.28),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4d8dff]">{copy.hero.eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-6xl">
              {copy.hero.titleLead}{" "}
              <span className="text-[#4d8dff]">{copy.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-white/75">{copy.hero.lead}</p>

            <ul className="mt-8 flex flex-wrap gap-3">
              {copy.hero.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85"
                >
                  <CheckCircle2 className="size-4 text-[#4d8dff]" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-[#0047b3] text-white hover:bg-[#0047b3]/90">
                <a href="#kfz-calculator">
                  {copy.hero.cta}
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Link
                href={localizedPath(copy.processHref, locale)}
                className="inline-flex items-center px-2 text-sm font-semibold text-white/80 hover:text-white"
              >
                {locale === "bg" ? "Как работи" : "So funktioniert es"}
              </Link>
            </div>
          </div>

          <div className="relative">
            <KfzHeroVisual />
            <div className="mx-auto mt-4 w-full max-w-sm rounded-md border border-white/12 bg-white/5 p-5 backdrop-blur-md">
              {coverage ? (
                <>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                    {locale === "bg" ? "Избрано покритие" : "Gewählte Deckung"}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{coverage}</p>
                  <p className="mt-2 text-xs leading-6 text-white/60">{calcCopy.limits}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-white">{copy.hero.phoneBadgeTitle}</p>
                  <p className="mt-1 text-sm text-white/70">{copy.hero.phoneBadgeHint}</p>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4d8dff] hover:underline"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      {phone}
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-8 md:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.tiles.map((tile, index) => {
            const Icon = tileIcons[index] ?? Sparkles
            return (
              <article key={tile.title} className="glass-card rounded-sm p-6 backdrop-blur-md">
                <span className="flex size-11 items-center justify-center border border-border text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-lg font-black tracking-[-0.03em] text-foreground">{tile.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{tile.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-8 lg:px-8">
        <div className="grid gap-8 rounded-sm border border-border p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{product.name}</p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{product.summary}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {product.details.map((detail) => (
              <li key={detail} className="flex gap-3 text-sm leading-6 text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="kfz-calculator" className="mx-auto max-w-4xl px-5 py-14 lg:px-8 md:py-20">
        <InsuranceCalculator
          offerId="kfz"
          fields={kfzCalculatorFields[locale]}
          copy={calcCopy}
          isOffered={isOffered}
          onChange={(entered) => setCoverage(entered.find((item) => item.id === "coverage")?.value ?? null)}
          externalPanel={
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">
                {locale === "bg" ? "Нужна ти е помощ преди да продължиш?" : "Brauchst du Hilfe vor dem Weitergehen?"}
              </p>
              <Link
                href={localizedPath("/contact", locale)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {hub.contactCta}
              </Link>
            </div>
          }
        />
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20 lg:px-8">
        <div className="glass-card rounded-sm p-5 text-sm leading-7 text-muted-foreground backdrop-blur-md">
          {hub.notice}
        </div>
        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-7 text-foreground">
          {affiliateDisclosureFor(locale)}
        </p>
      </section>
    </div>
  )
}
