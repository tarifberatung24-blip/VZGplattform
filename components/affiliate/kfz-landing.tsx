"use client"

import Link from "next/link"
import { ArrowRight, BadgeCheck, CheckCircle2, FileCheck2, FileText, KeyRound, ListChecks, Phone, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KfzPartnerWidget } from "@/components/affiliate/kfz-partner-widget"
import { KfzHeroVisual } from "@/components/affiliate/kfz-hero-visual"
import { insuranceHubCopy, kfzLandingCopy } from "@/components/affiliate/insurance-content"
import { affiliateDisclosureFor } from "@/lib/affiliate-disclosure"
import { localizedPath } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"
import { BrandText } from "@/components/brand/horizon-wordmark"

type KfzProductCopy = { name: string; summary: string; details: string[]; cta: string }

const tileIcons = [ShieldCheck, BadgeCheck, KeyRound, FileCheck2]

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

  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden bg-[#070d19] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_-10%,rgba(77,141,255,0.28),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4d8dff]"><BrandText text={copy.hero.eyebrow} /></p>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-6xl">
              {copy.hero.titleLead}{" "}
              <span className="text-[#4d8dff]"><BrandText text={copy.hero.titleAccent} /></span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-white/75"><BrandText text={copy.hero.lead} /></p>

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
                  <BrandText text={copy.hero.cta} />
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
            <div className="paper paper-inset mx-auto mt-4 w-full max-w-sm p-5">
              <>
                <p className="text-sm font-bold text-foreground"><BrandText text={copy.hero.phoneBadgeTitle} /></p>
                <p className="mt-1 text-sm text-muted-foreground"><BrandText text={copy.hero.phoneBadgeHint} /></p>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {phone}
                  </a>
                )}
              </>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-8 md:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.tiles.map((tile, index) => {
            const Icon = tileIcons[index] ?? ShieldCheck
            return (
              <article key={tile.title} className="paper p-6">
                <span className="flex size-11 items-center justify-center border border-border text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-lg font-black tracking-[-0.03em] text-foreground"><BrandText text={tile.title} /></h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground"><BrandText text={tile.body} /></p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-8 lg:px-8">
        <div className="paper paper-inset grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BrandText text={product.name} /></p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground"><BrandText text={product.summary} /></p>
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

      <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-8 md:py-16">
        <article className="paper p-6 sm:p-10" aria-labelledby="kfz-notice-lesson">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BrandText text={copy.noticeLesson.eyebrow} /></p>
          <h2
            id="kfz-notice-lesson"
            className="mt-4 text-balance text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl"
          >
            <BrandText text={copy.noticeLesson.title} />
          </h2>
          <p className="mt-5 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
            <BrandText text={copy.noticeLesson.lead} />
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div className="flex flex-col gap-4">
              {copy.noticeLesson.paragraphs.map((paragraph) => (
                <p key={paragraph} className="max-w-2xl text-sm leading-7 text-foreground">
                  {paragraph}
                </p>
              ))}
              <div className="paper paper-inset mt-2 p-5">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground"><BrandText text={copy.noticeLesson.documentCta} /></p>
                </div>
                <Button asChild size="lg" className="mt-4">
                  <Link href={localizedPath("/documents", locale)}>
                    <BrandText text={copy.noticeLesson.documentCta} />
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <p className="mt-3 text-xs leading-6 text-muted-foreground"><BrandText text={copy.noticeLesson.documentHint} /></p>
              </div>
            </div>

            <aside className="paper paper-inset p-6">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {locale === "bg" ? "Кратка проверка" : "Kurze Prüfliste"}
                </h3>
              </div>
              <ul className="mt-5 flex flex-col gap-3">
                {copy.noticeLesson.checklist.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                <BrandText text={copy.noticeLesson.sourceNote} />
              </p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground"><BrandText text={copy.noticeLesson.disclaimer} official /></p>
            </aside>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-14 lg:px-8 md:pb-16" aria-labelledby="kfz-documents">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BrandText text={copy.documents.eyebrow} /></p>
        <h2 id="kfz-documents" className="mt-4 text-balance text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
          <BrandText text={copy.documents.title} />
        </h2>
        <p className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground"><BrandText text={copy.documents.lead} /></p>
        <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {copy.documents.items.map((item, index) => (
            <li key={item.title} className="paper flex flex-col p-6">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-black tracking-[-0.02em] text-foreground"><BrandText text={item.title} /></h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground"><BrandText text={item.where} /></p>
              {item.action && (
                <div className="mt-4 border-t border-border pt-4">
                  <Link
                    href={item.action.href.startsWith("#") ? item.action.href : localizedPath(item.action.href, locale)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <BrandText text={item.action.label} />
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  {item.action.note && <p className="mt-1 text-xs text-muted-foreground"><BrandText text={item.action.note} /></p>}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section id="kfz-calculator" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-14 lg:px-8 md:py-20" aria-labelledby="kfz-widget">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BrandText text={copy.widget.eyebrow} /></p>
        <h2 id="kfz-widget" className="mt-4 text-balance text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
          <BrandText text={copy.widget.title} />
        </h2>
        <p className="mt-4 max-w-3xl text-pretty text-base leading-7 text-muted-foreground"><BrandText text={copy.widget.intro} /></p>
        <div className="mt-8">
          <KfzPartnerWidget copy={copy.widget} tracking={`horizon_kfz_${locale}`} fallbackHref={isOffered ? "/go/kfz" : undefined} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Link href={localizedPath("/contact", locale)} className="text-sm font-semibold text-primary hover:underline">
            <BrandText text={hub.contactCta} />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20 lg:px-8">
        <div className="paper p-5 text-sm leading-7 text-muted-foreground">
          <BrandText text={hub.notice} />
        </div>
        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-7 text-foreground">
          <BrandText text={affiliateDisclosureFor(locale)} official />
        </p>
      </section>
    </div>
  )
}
