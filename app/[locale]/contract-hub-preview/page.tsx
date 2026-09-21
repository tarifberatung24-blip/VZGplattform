"use client"

import Link from "next/link"
import { ArrowRight, CalendarClock, CheckCircle2, Clock, FileText, FolderOpen, ShieldCheck, Target, TrendingDown, UploadCloud, Wrench, XCircle, AlertTriangle, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

export default function ContractHubPreviewPage() {
  const { locale, t } = useLanguage()
  const ch = t.contractHub

  const dashboardItems = [
    [ch.dashboard.activeContracts, ch.demoValues.activeContracts, FileText],
    [ch.dashboard.monthlyFixedCosts, ch.demoValues.monthlyFixedCosts, TrendingDown],
    [ch.dashboard.documentsUploaded, ch.demoValues.documentsUploaded, FolderOpen],
    [ch.dashboard.deadlinesNext90Days, ch.demoValues.deadlinesNext90Days, CalendarClock],
    [ch.dashboard.savingsOpportunities, ch.demoValues.savingsOpportunities, Target],
  ] as const

  const radarGroups = [
    {
      title: ch.radar.actionRequired,
      icon: AlertTriangle,
      tone: "border-l-red-500 bg-red-50/50",
      contracts: [
        [ch.demoProviders.providerA, ch.demoCategories.internet, ch.demoValues.priceA, ch.demoValues.contractA, ch.demoValues.dateA],
        [ch.demoProviders.providerB, ch.demoCategories.mobile, ch.demoValues.priceB, ch.demoValues.contractB, ch.demoValues.dateB],
      ],
    },
    {
      title: ch.radar.checkSoon,
      icon: Clock,
      tone: "border-l-yellow-500 bg-yellow-50/50",
      contracts: [[ch.demoProviders.providerA, ch.demoCategories.energy, ch.demoValues.priceC, ch.demoValues.contractC, ch.demoValues.dateC]],
    },
    {
      title: ch.radar.ok,
      icon: ShieldCheck,
      tone: "border-l-green-500 bg-green-50/50",
      contracts: [[ch.demoProviders.providerB, ch.demoCategories.insurance, ch.demoValues.priceD, ch.demoValues.contractD, ch.demoValues.dateD]],
    },
    {
      title: ch.radar.missingData,
      icon: XCircle,
      tone: "border-l-gray-400 bg-gray-50/50",
      contracts: [[ch.demoProviders.providerA, ch.demoCategories.other, ch.missingValue, ch.missingValue, ch.notConfirmed]],
    },
  ] as const

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-8 md:py-12 lg:px-8">
        <section className="rounded-xl border border-border bg-card p-6 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{ch.previewLabel}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">{ch.title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">{ch.subtitle}</p>
          <p className="mt-4 text-sm font-semibold text-orange-700">{ch.demoNotice}</p>
        </section>

        <section className="mt-10" aria-labelledby="preview-dashboard">
          <h2 id="preview-dashboard" className="text-xl font-black">{ch.dashboard.title}</h2>
          <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {dashboardItems.map(([label, value, Icon]) => (
              <div key={label} className="bg-card p-5">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                </div>
                <p className="mt-4 text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ch.demoTag}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="preview-radar">
          <h2 id="preview-radar" className="text-xl font-black">{ch.radar.title}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{ch.radar.description}</p>
          <div className="mt-5 space-y-5">
            {radarGroups.map(({ title, icon: Icon, tone, contracts }) => (
              <div key={title} className="border border-border bg-card">
                <div className="border-b border-border px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {title}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {contracts.map(([provider, category, price, contractNumber, deadline]) => (
                    <div key={`${provider}-${category}`} className={`flex flex-wrap items-center gap-3 border-l-2 px-5 py-4 ${tone}`}>
                      <div className="min-w-[160px]">
                        <p className="text-sm font-bold">{provider}</p>
                        <p className="text-xs text-muted-foreground">{category}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{price}</div>
                      <div className="text-xs text-muted-foreground">{contractNumber}</div>
                      <div className="text-xs text-muted-foreground">{deadline}</div>
                      <div className="ml-auto flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">{ch.radar.review}</Button>
                        <Button size="sm" variant="outline">{ch.radar.cancellation}</Button>
                        <Button size="sm" variant="outline">{ch.radar.compare}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="preview-documents">
          <h2 id="preview-documents" className="text-xl font-black">{ch.documents.title}</h2>
          <div className="mt-5 grid gap-px border border-border bg-border md:grid-cols-3">
            {[
              [UploadCloud, ch.documents.upload],
              [Brain, ch.documents.extract],
              [CheckCircle2, ch.documents.confirm],
            ].map(([Icon, label], index) => (
              <div key={label as string} className="bg-card p-5">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-bold">{label as string}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{ch.documents.steps[index]}</p>
                {index < 2 && <ArrowRight className="mt-3 size-4 text-primary" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="preview-deadlines">
          <h2 id="preview-deadlines" className="text-xl font-black">{ch.deadlines.title}</h2>
          <div className="mt-5 rounded-lg border border-border bg-card p-5 text-sm leading-7 text-muted-foreground">
            <p>{ch.deadlines.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold">
              <XCircle className="size-3" aria-hidden="true" />
              {ch.notConfirmed}
            </span>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="preview-savings">
          <h2 id="preview-savings" className="text-xl font-black">{ch.savings.title}</h2>
          <div className="mt-5 grid gap-px border border-border bg-border md:grid-cols-2">
            <div className="bg-card p-5">
              <h3 className="font-bold">{ch.savings.current}</h3>
              <p className="mt-2 text-3xl font-black">{ch.demoValues.currentPrice}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ch.demoTag}</p>
            </div>
            <div className="bg-card p-5">
              <h3 className="font-bold">{ch.savings.example}</h3>
              <p className="mt-2 text-3xl font-black text-green-600">{ch.demoValues.examplePrice}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ch.demoTag}</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50/50 p-4 text-sm leading-7 text-orange-800">{ch.savings.disclaimer}</p>
        </section>

        <section className="mt-10" aria-labelledby="preview-household">
          <h2 id="preview-household" className="text-xl font-black">{ch.household.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{ch.household.description}</p>
        </section>

        <section className="mt-10" aria-labelledby="preview-ai">
          <h2 id="preview-ai" className="text-xl font-black">{ch.ai.title}</h2>
          <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[ch.ai.explains, ch.ai.missing, ch.ai.cancellation, ch.ai.nextSteps].map((label, index) => {
              const Icon = [Wrench, Target, FileText, ArrowRight][index]
              return <div key={label} className="bg-card p-5"><Icon className="size-6 text-primary" aria-hidden="true" /><h3 className="mt-3 font-bold">{label}</h3></div>
            })}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-5">
            <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-7 text-muted-foreground">{ch.ai.noExecution}</p>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href={localizedPath("/auth/sign-up", locale)}>{ch.cta.start}<ArrowRight className="ml-1 size-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link href={localizedPath("/contact", locale)}>{ch.cta.contact}</Link></Button>
        </div>
      </div>
    </main>
  )
}
