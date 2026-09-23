"use client"

import Link from "next/link"
import { ArrowUpRight, Bell, CalendarDays, LayoutDashboard, Plus, Receipt, Search, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import { WorkplaceActionCenter } from "@/components/dashboard/workplace-action-center"
import { MissingInformationInterviewer } from "@/components/dashboard/missing-information-interviewer"
import { DocumentAnalyzer, type DashboardDocument } from "@/components/dashboard/document-analyzer"
import { getSmartDashboardNextAction } from "@/lib/kintex-smart-dashboard"
import { HorizonHome } from "@/components/horizon/horizon-home"
import { DataFlowVisual } from "@/components/marketing/data-flow-visual"
import { ContractsChart } from "./charts/contracts-chart"
import { TimelineChart } from "./charts/timeline-chart"
import { ContractsTable } from "./charts/contracts-table"

export type VzgDashboardProps = {
  firstName?: string | null
  profile?: { completeness: number | null } | null
  contracts: Array<{ id: string; title: string; category: string; provider_name: string | null; monthly_amount: number | null; status: string | null; end_date: string | null; review_status?: string | null }>
  documents: DashboardDocument[]
  reviewCount: number
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
  caseCounts?: Record<string, number>
  moduleError?: string | null
}

function money(value: number) { return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value) }
function date(value: string | null, locale: "bg" | "de") {
  return value ? new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "bg-BG", { day: "2-digit", month: "short" }).format(new Date(value)) : (locale === "de" ? "Keine Daten" : "Няма данни")
}

export function VzgDashboard({ firstName, profile, contracts, documents, reviewCount, reminders, caseCounts, moduleError }: VzgDashboardProps) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const missingData = de ? "Keine Daten" : "Няма данни"
  const monthlyTotal = contracts.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)
  const missingCosts = contracts.filter((item) => item.monthly_amount == null).length
  const nextReminder = reminders.find((item) => item.due_at) ?? null
  const nextAction = getSmartDashboardNextAction({ profileCompleteness: profile?.completeness ?? 0, contracts: contracts.length, documents: documents.length, documentsNeedingReview: reviewCount, contractsNeedingInfo: missingCosts }, de ? "de" : "bg")
  const questions = contracts.filter((item) => item.monthly_amount == null).slice(0, 2).map((item) => ({ id: item.id, label: `${de ? "Monatlicher Betrag für" : "Месечна сума за"} „${item.title}“?`, detail: de ? "Dieser Wert fehlt und wird nicht automatisch erfunden." : "Тази стойност липсва и няма да бъде измисляна автоматично.", href: "/vertraege" }))

  return <main className="relative min-h-[calc(100dvh-5rem)] min-w-0 overflow-x-hidden bg-background px-4 py-5 text-foreground sm:px-6 sm:py-6 lg:px-8">
    <DataFlowVisual />
    <div className="relative z-10 mx-auto min-w-0 max-w-[1440px]">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 xl:flex-row xl:items-center">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground shadow-none"><LayoutDashboard className="size-5" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">HORIZON by VZG</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{de ? `Willkommen${firstName ? `, ${firstName}` : ""}` : `Добре дошъл${firstName ? `, ${firstName}` : ""}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{de ? "Finanzielle Übersicht aus bestätigten Daten." : "Финансов преглед от потвърдени данни."}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 w-full bg-card pl-9" placeholder={de ? "Verträge durchsuchen…" : "Търсене в договори…"} />
          </div>
          <Button asChild className="h-11 w-full sm:w-auto"><Link href="/vertraege"><Plus className="mr-2 size-4" />{de ? "Vertrag hinzufügen" : "Добави договор"}</Link></Button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard metrics">
        {[{ icon: WalletCards, label: de ? "Monatliche Kosten" : "Месечни разходи", value: monthlyTotal ? money(monthlyTotal) : missingData, note: de ? "Nur eingetragene Beträge" : "Само въведени суми" }, { icon: Receipt, label: de ? "Aktive Verträge" : "Активни договори", value: String(contracts.length), note: de ? "Alle gespeicherten Verträge" : "Всички записани договори" }, { icon: CalendarDays, label: de ? "Nächster Termin" : "Следващ срок", value: date(nextReminder?.due_at ?? null, locale), note: nextReminder?.title ?? (de ? "Keine Frist erfasst" : "Няма записан срок") }, { icon: Bell, label: de ? "Zur Prüfung" : "За проверка", value: String(reviewCount + missingCosts), note: de ? "Dokumente und fehlende Beträge" : "Документи и липсващи суми" }].map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-md border border-border bg-card p-4 shadow-none"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary/5 text-primary"><Icon className="size-5" /></span><p className="text-sm font-medium text-muted-foreground">{label}</p></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article>)}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]" aria-label="Dashboard charts">
        <ContractsChart contracts={contracts} />
        <TimelineChart deadlines={reminders} />
      </section>

      <section className="mt-6" aria-label="Verträge Tabelle">
        <ContractsTable contracts={contracts} />
      </section>

      <HorizonHome errorCode={moduleError ?? null} caseCounts={caseCounts ?? {}} />
      <WorkplaceActionCenter firstName={firstName} nextAction={nextAction} reviewCount={reviewCount} documentCount={documents.length} contractCount={contracts.length} reminderCount={reminders.length} />
      <MissingInformationInterviewer questions={questions} />
      <DocumentAnalyzer initialDocuments={documents} />
    </div>
  </main>
}
