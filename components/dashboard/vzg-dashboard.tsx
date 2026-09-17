"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowUpRight, Bell, CalendarDays, CheckCircle2, ChevronRight, FileText, LayoutDashboard, Plus, Receipt, Search, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import { WorkplaceActionCenter } from "@/components/dashboard/workplace-action-center"
import { MissingInformationInterviewer } from "@/components/dashboard/missing-information-interviewer"
import { DocumentAnalyzer, type DashboardDocument } from "@/components/dashboard/document-analyzer"
import { getSmartDashboardNextAction } from "@/lib/kintex-smart-dashboard"

export type VzgDashboardProps = {
  firstName?: string | null
  profile?: { completeness: number | null } | null
  contracts: Array<{ id: string; title: string; category: string; provider_name: string | null; monthly_amount: number | null; status: string | null; end_date: string | null; review_status?: string | null }>
  documents: DashboardDocument[]
  reviewCount: number
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
}

function money(value: number) { return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value) }
function date(value: string | null) { return value ? new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short" }).format(new Date(value)) : "Няма данни" }

export function VzgDashboard({ firstName, profile, contracts, documents, reviewCount, reminders }: VzgDashboardProps) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const monthlyTotal = contracts.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)
  const missingCosts = contracts.filter((item) => item.monthly_amount == null).length
  const nextReminder = reminders.find((item) => item.due_at) ?? null
  const groups = useMemo(() => {
    const values = new Map<string, number>()
    for (const item of contracts) values.set(item.category, (values.get(item.category) ?? 0) + (Number(item.monthly_amount) || 0))
    return [...values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [contracts])
  const maxGroup = Math.max(...groups.map(([, value]) => value), 1)
  const nextAction = getSmartDashboardNextAction({ profileCompleteness: profile?.completeness ?? 0, contracts: contracts.length, documents: documents.length, documentsNeedingReview: reviewCount, contractsNeedingInfo: missingCosts }, de ? "de" : "bg")
  const questions = contracts.filter((item) => item.monthly_amount == null).slice(0, 2).map((item) => ({ id: item.id, label: `${de ? "Monatlicher Betrag für" : "Месечна сума за"} „${item.title}“?`, detail: de ? "Dieser Wert fehlt und wird nicht automatisch erfunden." : "Тази стойност липсва и няма да бъде измисляна автоматично.", href: "/vertraege" }))

  return <main className="min-h-[calc(100dvh-5rem)] min-w-0 overflow-x-hidden bg-background px-4 py-5 text-foreground sm:px-6 sm:py-6 lg:px-8">
    <div className="mx-auto min-w-0 max-w-[1440px]">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 xl:flex-row xl:items-center">
        <div className="flex items-center gap-4"><div className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground shadow-none"><LayoutDashboard className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">VZG Dashboard</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{de ? `Willkommen${firstName ? `, ${firstName}` : ""}` : `Добре дошъл${firstName ? `, ${firstName}` : ""}`}</h1><p className="mt-1 text-sm text-muted-foreground">{de ? "Finanzielle Übersicht aus bestätigten Daten." : "Финансов преглед от потвърдени данни."}</p></div></div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 w-full bg-card pl-9" placeholder={de ? "Verträge durchsuchen…" : "Търсене в договори…"} /></div><Button asChild className="h-11 w-full sm:w-auto"><Link href="/vertraege"><Plus className="mr-2 size-4" />{de ? "Vertrag hinzufügen" : "Добави договор"}</Link></Button></div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard metrics">
        {[{ icon: WalletCards, label: de ? "Monatliche Kosten" : "Месечни разходи", value: monthlyTotal ? money(monthlyTotal) : "NEEDS_DATA", note: de ? "Nur eingetragene Beträge" : "Само въведени суми" }, { icon: Receipt, label: de ? "Aktive Verträge" : "Активни договори", value: String(contracts.length), note: de ? "Alle gespeicherten Verträge" : "Всички записани договори" }, { icon: CalendarDays, label: de ? "Nächster Termin" : "Следващ срок", value: date(nextReminder?.due_at ?? null), note: nextReminder?.title ?? (de ? "Keine Frist erfasst" : "Няма записан срок") }, { icon: Bell, label: de ? "Zur Prüfung" : "За проверка", value: String(reviewCount + missingCosts), note: de ? "Dokumente und fehlende Beträge" : "Документи и липсващи суми" }].map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-md border border-border bg-card p-4 shadow-none"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary/5 text-primary"><Icon className="size-5" /></span><p className="text-sm font-medium text-muted-foreground">{label}</p></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article>)}
      </section>

      <WorkplaceActionCenter firstName={firstName} nextAction={nextAction} reviewCount={reviewCount} documentCount={documents.length} contractCount={contracts.length} reminderCount={reminders.length} />
      <MissingInformationInterviewer questions={questions} />
      <DocumentAnalyzer initialDocuments={documents} />

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
        <article className="min-w-0 overflow-hidden rounded-md border border-border bg-card p-4 shadow-none sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Cost overview" : "Разходен преглед"}</p><h2 className="mt-1 text-lg font-semibold">{de ? "Monthly costs by contract" : "Месечни разходи по договори"}</h2></div><Button variant="ghost" size="icon" className="shrink-0" asChild><Link href="/vertraege" aria-label="Open contracts"><ChevronRight className="size-4" /></Link></Button></div><div className="mt-6 flex h-44 min-w-0 items-end gap-2 sm:gap-4">{(groups.length ? groups : [["NEEDS_DATA", 0]]).map(([category, amount], index) => <div key={category} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="max-w-full truncate text-[10px] text-muted-foreground">{amount ? money(amount as number) : "—"}</span><div className="flex h-32 w-full items-end rounded-t-lg bg-muted"><div className="w-full rounded-t-lg bg-primary transition-all" style={{ height: `${amount ? Math.max(12, ((amount as number) / maxGroup) * 100) : 12}%`, opacity: 1 - index * 0.12 }} /></div><span className="max-w-full truncate text-[11px] text-muted-foreground">{String(category)}</span></div>)}</div><p className="mt-4 text-xs text-muted-foreground">{de ? "No savings or new offers are estimated without verified partner data." : "Без потвърдени партньорски данни не се изчисляват спестявания или нови оферти."}</p></article>
        <article className="min-w-0 overflow-hidden rounded-md border border-border bg-card p-4 shadow-none sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Attention" : "Внимание"}</p><h2 className="mt-1 text-lg font-semibold">{de ? "Review queue" : "Опашка за преглед"}</h2></div><Bell className="size-5 shrink-0 text-muted-foreground" /></div><div className="mt-5 space-y-3">{[...contracts.filter((item) => item.monthly_amount == null || item.review_status === "needs_review").slice(0, 3).map((item) => ({ label: item.title, detail: de ? "Needs confirmation" : "Нуждае се от потвърждение", href: "/vertraege" })), ...documents.slice(0, 2).map((item) => ({ label: item.original_filename, detail: item.processing_status ?? "uploaded", href: "/documents" }))].slice(0, 4).map((item) => <Link key={`${item.href}-${item.label}`} href={item.href} className="flex min-h-14 items-center gap-3 rounded-md border border-border p-3 transition hover:border-primary/40 hover:bg-primary/5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary"><FileText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}{reviewCount + missingCosts === 0 && <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 size-5 text-success" />{de ? "Nothing needs review." : "Няма задачи за преглед."}</div>}</div></article>
      </section>

      <section className="mt-6 min-w-0 overflow-hidden rounded-md border border-border bg-card p-4 shadow-none sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Recent contracts" : "Последни договори"}</p><h2 className="mt-1 text-lg font-semibold">{de ? "Your recorded commitments" : "Записани ангажименти"}</h2></div><Button variant="outline" size="sm" className="w-full sm:w-auto" asChild><Link href="/vertraege">{de ? "View all" : "Виж всички"}<ArrowUpRight className="ml-2 size-4" /></Link></Button></div><div className="mt-4 overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="pb-3 font-medium">{de ? "Contract" : "Договор"}</th><th className="pb-3 font-medium">{de ? "Provider" : "Доставчик"}</th><th className="pb-3 font-medium">{de ? "Monthly" : "Месечно"}</th><th className="pb-3 font-medium">{de ? "Status" : "Статус"}</th><th className="pb-3 font-medium">{de ? "End" : "Край"}</th></tr></thead><tbody>{contracts.slice(0, 6).map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="py-3 font-medium">{item.title}</td><td className="py-3 text-muted-foreground">{item.provider_name || "NEEDS_DATA"}</td><td className="py-3">{item.monthly_amount == null ? "NEEDS_DATA" : money(Number(item.monthly_amount))}</td><td className="py-3"><span className="whitespace-nowrap rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">{item.review_status === "confirmed" ? (de ? "Confirmed" : "Потвърден") : (de ? "Review" : "Преглед")}</span></td><td className="py-3 text-muted-foreground">{date(item.end_date)}</td></tr>)}{contracts.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{de ? "No contracts recorded yet." : "Все още няма записани договори."}</td></tr>}</tbody></table></div><p className="mt-2 text-[11px] text-muted-foreground sm:hidden">{de ? "Swipe horizontally to see all columns." : "Плъзни хоризонтално, за да видиш всички колони."}</p></section>
    </div>
  </main>
}
