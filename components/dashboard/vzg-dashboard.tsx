"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, FilePlus2, FileText, Plus, Receipt, UserRound, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { WorkplaceActionCenter } from "@/components/dashboard/workplace-action-center"
import { DocumentAnalyzer, type DashboardDocument } from "@/components/dashboard/document-analyzer"
import { getSmartDashboardNextAction } from "@/lib/kintex-smart-dashboard"
import { formatMoney, formatShortDate } from "@/lib/dashboard/contracts-data"
import { buildAttentionItems, type AttentionKind, type AttentionTone } from "@/lib/dashboard/attention"
import { HorizonHome } from "@/components/horizon/horizon-home"
import { ContractsChart } from "./charts/contracts-chart"
import { TimelineChart } from "./charts/timeline-chart"
import { ContractsTable } from "./charts/contracts-table"
import { YourValueCard } from "./your-value-card"
import { NotificationInbox, type InboxNotification } from "./notification-inbox"
import type { YourValue } from "@/lib/value/your-value"
import type { GrundversorgungMatch } from "@/lib/value/grundversorgung"

export type VzgDashboardProps = {
  firstName?: string | null
  profile?: { completeness: number | null } | null
  contracts: Array<{ id: string; title: string; category: string; provider_name: string | null; monthly_amount: number | null; status: string | null; end_date: string | null; review_status?: string | null; cancellation_deadline?: string | null }>
  documents: DashboardDocument[]
  reviewCount: number
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
  caseCounts?: Record<string, number>
  moduleError?: string | null
  yourValue?: YourValue | null
  notifications?: InboxNotification[]
  notificationsEmailEnabled?: boolean
  grundversorgung?: GrundversorgungMatch[]
}

const VISIBLE_ITEMS = 5

const TONE_STYLE: Record<AttentionTone, { icon: string; pill: string }> = {
  urgent: { icon: "bg-destructive/10 text-destructive", pill: "bg-destructive/10 text-destructive" },
  soon: { icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400", pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  info: { icon: "bg-primary/10 text-primary", pill: "bg-muted text-muted-foreground" },
}

const KIND_ICON: Record<AttentionKind, typeof Clock> = {
  deadline: Clock,
  cancellation: CalendarDays,
  review: FileText,
  missing_amount: WalletCards,
  profile: UserRound,
}

// Dated items carry a short "in 3 days" label that fits a pill; the others explain themselves in a line below.
const DATED: ReadonlySet<AttentionKind> = new Set(["deadline", "cancellation"])

function copyFor(de: boolean) {
  return de
    ? {
        hello: "Hallo",
        summary: (n: number) => (n === 0 ? "Nichts Dringendes heute." : n === 1 ? "1 Punkt braucht deine Aufmerksamkeit." : `${n} Punkte brauchen deine Aufmerksamkeit.`),
        attention: "Braucht Aufmerksamkeit",
        allClear: "Keine dringenden Fristen und keine Dokumente zur Prüfung.",
        more: (n: number) => `und ${n} weitere`,
        addDocument: "Dokument hinzufügen",
        startCase: "Vorgang starten",
        addContract: "Vertrag hinzufügen",
        metrics: "Kennzahlen",
        showDetails: "Diagramme und Tabellen anzeigen",
        hideDetails: "Diagramme und Tabellen ausblenden",
        charts: "Diagramme",
        contractsLabel: "Verträge",
        noData: "Keine Daten",
        monthly: "Monatliche Kosten",
        monthlyNote: "Nur eingetragene Beträge",
        active: "Aktive Verträge",
        activeNote: "Alle gespeicherten Verträge",
        next: "Nächster Termin",
        nextNone: "Keine Frist erfasst",
        review: "Zur Prüfung",
        reviewNote: "Dokumente und fehlende Beträge",
      }
    : {
        hello: "Здравей",
        summary: (n: number) => (n === 0 ? "Днес няма нищо спешно." : n === 1 ? "1 нещо иска вниманието ти." : `${n} неща искат вниманието ти.`),
        attention: "Иска внимание",
        allClear: "Няма спешни срокове и няма документи за проверка.",
        more: (n: number) => `и още ${n}`,
        addDocument: "Добави документ",
        startCase: "Започни случай",
        addContract: "Добави договор",
        metrics: "Основни числа",
        showDetails: "Покажи графики и таблици",
        hideDetails: "Скрий графиките и таблиците",
        charts: "Графики",
        contractsLabel: "Договори",
        noData: "Няма данни",
        monthly: "Месечни разходи",
        monthlyNote: "Само въведени суми",
        active: "Активни договори",
        activeNote: "Всички записани договори",
        next: "Следващ срок",
        nextNone: "Няма записан срок",
        review: "За проверка",
        reviewNote: "Документи и липсващи суми",
      }
}

/**
 * The customer home, built for a phone first: a greeting card with the main actions, what needs
 * the user today, four key numbers, then modules. Charts, the contract table and the document
 * analyzer are one tap away on a phone and always visible from the `md` breakpoint. The layered
 * look (tinted page, lifted cards, larger corners) comes from the `.horizon-dashboard` scope in
 * globals.css, so the cards of the embedded sections match without changes of their own.
 */
export function VzgDashboard({ firstName, profile, contracts, documents, reviewCount, reminders, caseCounts, moduleError, yourValue, grundversorgung, notifications, notificationsEmailEnabled }: VzgDashboardProps) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const lang: "bg" | "de" = de ? "de" : "bg"
  const copy = copyFor(de)
  const [showDetails, setShowDetails] = useState(false)

  const documentsHref = localizedPath("/documents", locale)
  const contractsHref = localizedPath("/vertraege", locale)
  const profileHref = localizedPath("/profil", locale)
  const completeness = profile?.completeness ?? 0
  const items = useMemo(
    () => buildAttentionItems({ locale: lang, now: new Date(), reminders, contracts, reviewCount, profileCompleteness: completeness, paths: { documents: documentsHref, contracts: contractsHref, profile: profileHref } }),
    [lang, reminders, contracts, reviewCount, completeness, documentsHref, contractsHref, profileHref],
  )
  const visible = items.slice(0, VISIBLE_ITEMS)

  const name = firstName?.trim() || null
  const initial = name ? name.charAt(0).toUpperCase() : null
  const monthlyTotal = contracts.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)
  const missingCosts = contracts.filter((item) => item.monthly_amount == null).length
  const nextReminder = reminders.find((item) => item.due_at) ?? null
  const nextAction = getSmartDashboardNextAction({ profileCompleteness: completeness, contracts: contracts.length, documents: documents.length, documentsNeedingReview: reviewCount, contractsNeedingInfo: missingCosts }, lang)
  const metrics = [
    { icon: WalletCards, label: copy.monthly, value: monthlyTotal ? formatMoney(monthlyTotal, lang) : copy.noData, note: copy.monthlyNote },
    { icon: Receipt, label: copy.active, value: String(contracts.length), note: copy.activeNote },
    { icon: CalendarDays, label: copy.next, value: formatShortDate(nextReminder?.due_at ?? null, lang) ?? copy.noData, note: nextReminder?.title ?? copy.nextNone },
    { icon: Bell, label: copy.review, value: String(reviewCount + missingCosts), note: copy.reviewNote },
  ]

  return <div className="horizon-dashboard relative min-h-[calc(100svh-3.5rem)] min-w-0 overflow-x-hidden bg-background px-4 pb-24 pt-4 text-foreground sm:px-6 sm:pt-6 md:pb-8 lg:px-8">
    <div className="relative z-10 mx-auto min-w-0 max-w-[1440px]">
      <header className="relative overflow-hidden rounded-[24px] border border-border bg-card p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
              {initial ?? <UserRound className="size-5" />}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{name ? `${copy.hello}, ${name}` : copy.hello}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{copy.summary(items.length)}</p>
            </div>
          </div>
          {/* Adding a document is the everyday task (a letter arrived), so it is the one primary button. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button asChild className="col-span-2 h-12 rounded-full px-5 shadow-sm sm:col-span-1 sm:h-11"><Link href={documentsHref}><FilePlus2 className="mr-2 size-4" />{copy.addDocument}</Link></Button>
            <Button asChild variant="outline" className="h-12 rounded-full bg-background/60 sm:h-11"><Link href={`/${locale}/guide`}><Plus className="mr-2 size-4" />{copy.startCase}</Link></Button>
            <Button asChild variant="outline" className="h-12 rounded-full bg-background/60 sm:h-11"><Link href={contractsHref}>{copy.addContract}</Link></Button>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="attention-title" className="overflow-hidden rounded-[24px] border border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 id="attention-title" className="text-base font-semibold tracking-tight">{copy.attention}</h2>
            {items.length ? <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">{items.length}</span> : null}
          </div>
          {visible.length ? <ul className="px-2 pb-2">
            {visible.map((item) => {
              const Icon = KIND_ICON[item.kind]
              const tone = TONE_STYLE[item.tone]
              const dated = DATED.has(item.kind)
              return <li key={item.id}>
                <Link href={item.href} className="flex min-h-14 items-center gap-3 rounded-[16px] px-3 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone.icon}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                    {dated ? null : <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>}
                  </span>
                  {dated ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone.pill}`}>{item.detail}</span> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                </Link>
              </li>
            })}
          </ul> : <div className="mx-2 mb-2 flex items-center gap-3 rounded-[16px] bg-muted px-4 py-5 text-sm text-muted-foreground"><CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />{copy.allClear}</div>}
          {items.length > VISIBLE_ITEMS ? <p className="px-5 pb-4 text-xs text-muted-foreground">{copy.more(items.length - VISIBLE_ITEMS)}</p> : null}
        </section>

        <section aria-label={copy.metrics} className="grid grid-cols-2 content-start gap-3">
          {metrics.map(({ icon: Icon, label, value, note }) => <article key={label} className="relative min-w-0 overflow-hidden rounded-[20px] border border-border bg-card p-4">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/[0.07] to-transparent" />
            <div className="relative">
              {/* Labels wrap to two lines instead of being cut off on a phone-width card. */}
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-medium leading-snug text-muted-foreground sm:text-sm">{label}</p>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:size-8"><Icon className="size-3.5 sm:size-4" aria-hidden="true" /></span>
              </div>
              <p className="mt-2 break-words text-xl font-semibold leading-tight tabular-nums tracking-tight sm:mt-3 sm:text-3xl">{value}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note}</p>
            </div>
          </article>)}
        </section>
      </div>

      {/* The state-derived next step is shown only when nothing above needs the user, so the home never offers two competing "do this first" surfaces. */}
      {items.length === 0 ? <WorkplaceActionCenter nextAction={nextAction} /> : null}

      <NotificationInbox initial={notifications ?? []} emailEnabled={notificationsEmailEnabled !== false} />

      {yourValue ? <YourValueCard value={yourValue} grundversorgung={grundversorgung ?? []} /> : null}

      <HorizonHome errorCode={moduleError ?? null} caseCounts={caseCounts ?? {}} />

      <div className="mt-6 md:hidden">
        <Button type="button" variant="outline" className="h-12 w-full justify-between rounded-full bg-card px-5" aria-expanded={showDetails} aria-controls="dashboard-details" onClick={() => setShowDetails((value) => !value)}>
          {showDetails ? copy.hideDetails : copy.showDetails}
          <ChevronDown className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden="true" />
        </Button>
      </div>
      <div id="dashboard-details" className={showDetails ? "block" : "hidden md:block"}>
        <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]" aria-label={copy.charts}>
          <ContractsChart contracts={contracts} />
          <TimelineChart deadlines={reminders} />
        </section>
        <section className="mt-6" aria-label={copy.contractsLabel}>
          <ContractsTable contracts={contracts} />
        </section>
        <DocumentAnalyzer initialDocuments={documents} />
      </div>
    </div>
  </div>
}
