"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, FileText, Landmark, Receipt, ShieldCheck, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FinancialOsOverview } from "@/components/marketing/financial-os-overview"
import { Hero } from "@/components/marketing/hero"
import { OpportunityCheck } from "@/components/marketing/opportunity-check"
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

        <section className="kintex-marketing-section border-y border-border bg-card">
          <div className="mx-auto max-w-[1440px] px-5 py-24 lg:px-8 md:py-28">
            <div className="max-w-3xl">
              <h2 className="text-balance text-4xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
                {t.home.servicesTitle}
              </h2>
              <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">{t.home.servicesSub}</p>
            </div>

            <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {services.map(({ href, icon: Icon, key }) => (
                <Link
                  key={href}
                  href={href}
                  className="group bg-card p-8 transition-colors hover:bg-secondary"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center border border-border text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-8 font-bold text-foreground">{t.services[key].title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{t.services[key].desc}</p>
                  <span className="mt-8 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    {t.common.learnMore}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-8 md:py-28">
          <div className="grid gap-16 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.home.trust}
              </span>
              <h2 className="mt-8 text-4xl font-black tracking-[-0.04em] text-foreground md:text-5xl">{t.home.howTitle}</h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">{t.home.howSub}</p>
            </div>

            <ol className="border-y border-border">
              {[
                [t.home.step1Title, t.home.step1Desc],
                [t.home.step2Title, t.home.step2Desc],
                [t.home.step3Title, t.home.step3Desc],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-6 border-b border-border p-8 last:border-b-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-sm font-black text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-foreground text-background">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-20 lg:px-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-[-0.04em] md:text-5xl">{t.home.finalCtaTitle}</h2>
              <p className="mt-4 leading-8 text-background/75">{t.home.finalCtaDesc}</p>
            </div>
            <Button asChild size="lg" variant="default" className="shrink-0 bg-primary text-primary-foreground">
              <Link href="/auth/sign-up">
                {t.nav.register}
                <CheckCircle2 className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
