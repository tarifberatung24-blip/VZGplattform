"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  FileCheck2,
  FileQuestion,
  FileText,
  FileWarning,
  FolderOpen,
  Landmark,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react"

import { BrandText } from "@/components/brand/horizon-wordmark"
import { Button } from "@/components/ui/button"
import {
  howItWorksCopy,
  type HowItWorksService,
  type HowItWorksServiceId,
} from "@/components/marketing/how-it-works-copy"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

const serviceIcons: Record<HowItWorksServiceId, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  guide: FileQuestion,
  document_explanation: FileCheck2,
  inkasso: FileWarning,
  documents: FolderOpen,
  agentur: BriefcaseBusiness,
  jobcenter: Building2,
  termination: FileText,
  tax: ReceiptText,
  entitlements: Landmark,
  kindergeld: ShieldCheck,
  contracts: WalletCards,
  cost_reduction: BadgeEuro,
  insurance: ShieldCheck,
  education: BookOpen,
  forum: MessagesSquare,
}

function ServiceCard({
  service,
  locale,
  detailsLabel,
  stepLabel,
}: {
  service: HowItWorksService
  locale: "bg" | "de"
  detailsLabel: string
  stepLabel: string
}) {
  const Icon = serviceIcons[service.id]

  return (
    <article className="paper flex h-full min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden={true} />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug"><BrandText text={service.title} /></h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground"><BrandText text={service.problem} /></p>
        </div>
      </div>

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          {detailsLabel}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden={true} />
        </summary>
        <ol className="mt-2 space-y-3">
          {service.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground" aria-label={`${stepLabel} ${index + 1}`}>
                {index + 1}
              </span>
              <span><BrandText text={step} /></span>
            </li>
          ))}
        </ol>

        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm leading-6">
          <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden={true} />
          <span><strong>{service.resultLabel}:</strong> <BrandText text={service.result} /></span>
        </p>
      </details>

      <Link
        href={localizedPath(service.href, locale)}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        {service.cta}
        <ArrowRight className="size-4" aria-hidden={true} />
      </Link>
    </article>
  )
}

export default function HowItWorksPage() {
  const { locale } = useLanguage()
  const copy = howItWorksCopy[locale]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-24 sm:px-6 md:pt-28 lg:px-8">
        <Link
          href={localizedPath("/", locale)}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden={true} />
          {copy.back}
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            <BrandText text={copy.title} />
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground"><BrandText text={copy.intro} /></p>
        </header>

        <nav className="mt-8 rounded-xl border border-border bg-card p-4" aria-label={copy.quickTitle}>
          <p className="text-sm font-semibold">{copy.quickTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.quickHint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {copy.groups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {group.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-12 space-y-16">
          {copy.groups.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-28" aria-labelledby={`${group.id}-title`}>
              <header className="max-w-3xl">
                <h2 id={`${group.id}-title`} className="text-2xl font-semibold tracking-tight sm:text-3xl">{group.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{group.intro}</p>
              </header>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {group.services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    locale={locale}
                    detailsLabel={copy.detailsLabel}
                    stepLabel={copy.stepLabel}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="paper paper-note mt-16 p-5 sm:p-6" aria-labelledby="how-it-works-notice">
          <h2 id="how-it-works-notice" className="text-base font-semibold">{copy.noticeTitle}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground"><BrandText text={copy.notice} official /></p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={localizedPath("/auth/sign-up", locale)}>
              {copy.primaryCta}
              <ArrowRight className="size-4" aria-hidden={true} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={localizedPath("/auth/login", locale)}>{copy.secondaryCta}</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
