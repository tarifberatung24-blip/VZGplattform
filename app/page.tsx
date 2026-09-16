"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, FileText, Landmark, Receipt, ShieldCheck, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FinancialOsOverview } from "@/components/marketing/financial-os-overview"
import { Hero } from "@/components/marketing/hero"
import { OpportunityCheck } from "@/components/marketing/opportunity-check"
import { SiteFooter } from "@/components/marketing/site-footer"
import { useLanguage } from "@/lib/i18n/language-context"

export default function HomePage() {
  const { t, locale } = useLanguage()

  const services = [
    { href: "/steuer", icon: Receipt, key: "steuer" as const },
    { href: "/tarife", icon: WalletCards, key: "tarife" as const },
    { href: "/anspruch", icon: Landmark, key: "anspruch" as const },
    { href: "/documents", icon: FileText, key: "documents" as const },
  ]

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg">{locale === "de" ? "Zum Inhalt" : "Към съдържанието"}</a>
      <main id="main-content">
        <Hero />
        <OpportunityCheck />
        <FinancialOsOverview />

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t.home.servicesTitle}
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">{t.home.servicesSub}</p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map(({ href, icon: Icon, key }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{t.services[key].title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.services[key].desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t.common.learnMore}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.home.trust}
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{t.home.howTitle}</h2>
              <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{t.home.howSub}</p>
            </div>

            <ol className="space-y-4">
              {[
                [t.home.step1Title, t.home.step1Desc],
                [t.home.step2Title, t.home.step2Desc],
                [t.home.step3Title, t.home.step3Desc],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-accent text-accent-foreground">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold md:text-3xl">{t.home.finalCtaTitle}</h2>
              <p className="mt-2 text-accent-foreground/75">{t.home.finalCtaDesc}</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link href="/auth/sign-up">
                {t.nav.register}
                <CheckCircle2 className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
