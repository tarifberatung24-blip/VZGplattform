"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, MessagesSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturePath } from "@/components/marketing/feature-path"
import { howItWorksCopy } from "@/components/marketing/how-it-works-copy"
import { BrandText } from "@/components/brand/horizon-wordmark"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

/**
 * Public "how it works" page: the four stages from the home hero, joined by one
 * connected path, plus the communication layer that runs through all of them.
 *
 * Client component without props: the localized catch-all route renders it as
 * a plain component, and the locale comes from the language context.
 */
export default function HowItWorksPage() {
  const { locale } = useLanguage()
  const copy = howItWorksCopy[locale]

  return (
    <main className="relative min-h-screen text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 pt-28 pb-16 lg:px-8 md:pt-32 md:pb-24">
        <Link
          href={localizedPath("/", locale)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </Link>

        <header className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{copy.eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-black tracking-[-0.04em] md:text-6xl"><BrandText text={copy.title} /></h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground"><BrandText text={copy.intro} /></p>
        </header>

        <div className="mt-14 md:mt-20">
          <FeaturePath stages={copy.stages} label={copy.pathLabel} stepWord={copy.stepWord} />
        </div>

        <section className="mx-auto mt-12 max-w-4xl" aria-labelledby="how-it-works-communicate">
          <div className="glass-card flex flex-col items-start gap-5 rounded-3xl p-7 backdrop-blur-md md:flex-row md:items-center md:p-9">
            <span
              className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl"
              style={{
                color: "var(--thread-core)",
                background: "color-mix(in srgb, var(--thread-core) 10%, var(--card))",
                border: "1px solid color-mix(in srgb, var(--thread-core) 30%, transparent)",
              }}
            >
              <MessagesSquare className="size-7" aria-hidden="true" />
            </span>
            <div>
              <h2 id="how-it-works-communicate" className="text-xl font-bold">
                {copy.communicate.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground"><BrandText text={copy.communicate.body} /></p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={localizedPath("/auth/sign-up", locale)}>
              {copy.primaryCta}
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={localizedPath("/auth/login", locale)}>{copy.secondaryCta}</Link>
          </Button>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-6 text-muted-foreground"><BrandText text={copy.notice} /></p>
      </div>
    </main>
  )
}
