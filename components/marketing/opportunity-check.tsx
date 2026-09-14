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
      bg: "bg-primary/10",
    },
    {
      href: "/anspruch",
      icon: Landmark,
      title: t.opportunityCards.benefitsTitle,
      desc: t.opportunityCards.benefitsDesc,
      accent: "text-success",
      bg: "bg-success/12",
    },
    {
      href: "/tarife",
      icon: TrendingDown,
      title: t.opportunityCards.contractsTitle,
      desc: t.opportunityCards.contractsDesc,
      accent: "text-accent-foreground",
      bg: "bg-accent/10",
    },
    {
      href: "/documents",
      icon: FileText,
      title: t.opportunityCards.documentsTitle,
      desc: t.opportunityCards.documentsDesc,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t.home.opportunityTitle}
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">{t.home.opportunitySub}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <Icon className={`h-6 w-6 ${c.accent}`} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{c.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <span className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${c.accent}`}>
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