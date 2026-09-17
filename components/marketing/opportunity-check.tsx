"use client"

import Link from "next/link"
import { Receipt, Landmark, TrendingDown, FileText, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function OpportunityCheck() {
  const { t } = useLanguage()

  const cards = [
    {
      href: "/steuer",
      icon: Receipt,
      title: t.opportunityCards.taxTitle,
      desc: t.opportunityCards.taxDesc,
      accent: "text-primary",
      bg: "bg-background",
    },
    {
      href: "/anspruch",
      icon: Landmark,
      title: t.opportunityCards.benefitsTitle,
      desc: t.opportunityCards.benefitsDesc,
      accent: "text-foreground",
      bg: "bg-background",
    },
    {
      href: "/tarife",
      icon: TrendingDown,
      title: t.opportunityCards.contractsTitle,
      desc: t.opportunityCards.contractsDesc,
      accent: "text-foreground",
      bg: "bg-background",
    },
    {
      href: "/documents",
      icon: FileText,
      title: t.opportunityCards.documentsTitle,
      desc: t.opportunityCards.documentsDesc,
      accent: "text-primary",
      bg: "bg-background",
    },
  ]

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-8 md:py-28">
      <div className="max-w-3xl">
        <h2 className="text-balance text-4xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
          {t.home.opportunityTitle}
        </h2>
        <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">{t.home.opportunitySub}</p>
      </div>

      <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex min-h-64 flex-col bg-card p-8 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center border border-border ${c.bg}`}>
                <Icon className={`h-6 w-6 ${c.accent}`} />
              </span>
              <h3 className="mt-8 text-lg font-bold text-foreground">{c.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{c.desc}</p>
              <span className={`mt-8 inline-flex items-center gap-1 text-sm font-bold ${c.accent}`}>
                {t.common.check}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}