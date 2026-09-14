"use client"

import Link from "next/link"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AiHomeOfficeChat } from "@/components/dashboard/ai-home-office-chat"
import { WorkplaceActionCenter } from "@/components/dashboard/workplace-action-center"
import { MissingInformationInterviewer } from "@/components/dashboard/missing-information-interviewer"
import { getKintexRadarSignals } from "@/lib/kintex-radar"
import {
  getSmartDashboardNextAction,
  getSmartDashboardProblems,
  type SmartDashboardStats,
} from "@/lib/kintex-smart-dashboard"

type Profile = {
  completeness: number | null
  employment_status: string | null
  household_size: number | null
  monthly_income: number | null
  monthly_fixed_costs: number | null
} | null

type Contract = {
  id: string
  title: string
  category: string
  provider_name: string | null
  monthly_amount: number | null
  status: string | null
  created_at: string | null
  end_date: string | null
  cancellation_deadline?: string | null
  review_status?: string | null
}

type Document = {
  id: string
  original_filename: string
  processing_status: string | null
  created_at: string | null
  size_bytes: number | null
}

type Reminder = {
  id: string
  title: string
  due_at: string | null
  status: string | null
  created_at: string | null
}

type AuditEvent = {
  id: string
  event_type: string
  event_summary: string | null
  entity_type: string | null
  created_at: string | null
}

type Props = {
  mode?: "live" | "preview"
  firstName?: string | null
  profile?: Profile
  contracts?: Contract[]
  documents?: Document[]
  reviewCount?: number
  reminders?: Reminder[]
  auditEvents?: AuditEvent[]
}

type GroupId = "tariffs" | "credits" | "insurance" | "subscriptions" | "other"

const groupMeta: Record<GroupId, { label: string; categories: string[] }> = {
  tariffs: { label: "Тарифи", categories: ["electricity", "gas", "internet", "mobile", "strom"] },
  credits: { label: "Кредити", categories: ["credit", "loan", "kredit"] },
  insurance: { label: "Застраховки", categories: ["insurance", "versicherung"] },
  subscriptions: { label: "Абонаменти", categories: ["subscription", "abo"] },
  other: { label: "Други", categories: ["housing", "other"] },
}

const groupOrder: GroupId[] = ["tariffs", "credits", "insurance", "subscriptions", "other"]

function contractGroup(category: string): GroupId {
  const normalized = category.toLowerCase()
  return groupOrder.find((id) => groupMeta[id].categories.includes(normalized)) ?? "other"
}

function formatMoney(value: number | null) {
  if (value == null) return "Няма данни"
  return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(Number(value))
}

function formatDate(value: string | null) {
  if (!value) return "Няма данни"
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function statusLabel(status: string | null) {
  if (status === "confirmed" || status === "active") return "Потвърден"
  if (status === "needs_review") return "За преглед"
  if (status === "draft") return "Чернова"
  return status || "Неуточнен"
}

function Kpi({ icon: Icon, label, value, note }: { icon: typeof WalletCards; label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  )
}

function PreviewSurface() {
  const previewKpis = [
    { icon: WalletCards, label: "Verträge", note: "Keine Kontodaten geladen" },
    { icon: FileText, label: "Dokumente", note: "Bereit für deinen Workspace" },
    { icon: CalendarDays, label: "Nächster Termin", note: "Wird aus deinen Daten erstellt" },
    { icon: Bell, label: "Für Prüfung", note: "Keine Annahmen im Preview" },
  ]

  return (
    <div className="kintex-preview-frame" aria-label="KintexBG Produktvorschau ohne Kontodaten">
      <div className="flex items-center justify-between border-b border-border bg-[#fbfbf9] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">K</span>
          <span className="text-sm font-semibold tracking-tight text-foreground">KintexBG</span>
        </div>
        <span className="border border-border bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preview</span>
      </div>
      <div className="grid min-h-[360px] grid-cols-[56px_1fr] sm:grid-cols-[76px_1fr]">
        <aside className="border-r border-border bg-[#f5f5f2] p-3">
          <div className="space-y-2.5">
            {[LayoutDashboard, WalletCards, FileText, Bot].map((Icon, index) => (
              <span key={index} className={`grid size-8 place-items-center rounded-md ${index === 0 ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            ))}
          </div>
        </aside>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Personal workspace</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Finanzübersicht</h3>
            </div>
            <span className="hidden border border-border px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex">Illustrative view</span>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {previewKpis.map(({ icon, label, note }) => <Kpi key={label} icon={icon} label={label} value="—" note={note} />)}
          </div>
          <div className="mt-3 border border-border bg-[#fbfbf9] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Deine Daten, deine Entscheidung</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Der echte Workspace zeigt nur bestätigte Inhalte aus deinem Profil.</p>
              </div>
              <span className="hidden size-8 place-items-center rounded-md bg-[#f9e9e9] text-primary sm:grid"><Bot className="size-4" aria-hidden="true" /></span>
            </div>
            <div className="mt-4 space-y-2" aria-hidden="true">
              <span className="kintex-preview-line w-11/12" />
              <span className="kintex-preview-line w-8/12" />
              <span className="kintex-preview-line w-5/12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SmartDashboardPreview(props: Props) {
  if (props.mode === "preview") return <PreviewSurface />
  return <LiveSmartDashboardPreview {...props} />
}

function LiveSmartDashboardPreview({ firstName, profile, contracts = [], documents = [], reviewCount = 0, reminders = [], auditEvents = [] }: Props) {
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<GroupId>>(new Set())
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false)
  const [sortByAmount, setSortByAmount] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const assistantCloseButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!assistantOpen) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    assistantCloseButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistantOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
      previous?.focus()
    }
  }, [assistantOpen])

  const missingCosts = contracts.filter((contract) => contract.monthly_amount == null).length
  const stats: SmartDashboardStats = {
    profileCompleteness: profile?.completeness ?? 0,
    contracts: contracts?.length ?? 0,
    documents: documents?.length ?? 0,
    documentsNeedingReview: reviewCount,
    contractsNeedingInfo: missingCosts,
  }
  const problems = getSmartDashboardProblems(stats)
  const nextAction = getSmartDashboardNextAction(stats, "bg")
  const missingInformationQuestions = contracts
    .filter((contract) => contract.monthly_amount == null)
    .slice(0, 3)
    .map((contract) => ({
      id: contract.id,
      label: `Каква е месечната сума по „${contract.title}“?`,
      detail: "Сумата липсва и няма да бъде изчислявана автоматично.",
      href: "/vertraege",
    }))
  const monthlyTotal = contracts.reduce((sum, contract) => sum + (Number(contract.monthly_amount) || 0), 0)
  const nextReminder = reminders.find((reminder) => reminder.due_at) ?? null
  const radarSignals = getKintexRadarSignals(contracts)

  const filteredContracts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchesQuery = normalized ? contracts.filter((contract) =>
      [contract.title, contract.provider_name, contract.category, contract.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    ) : contracts
    const matchesAttention = onlyNeedsAttention
      ? matchesQuery.filter((contract) => contract.monthly_amount == null || contract.status === "draft" || contract.status === "needs_review")
      : matchesQuery
    return sortByAmount
      ? [...matchesAttention].sort((a, b) => (Number(b.monthly_amount) || 0) - (Number(a.monthly_amount) || 0))
      : matchesAttention
  }, [contracts, onlyNeedsAttention, query, sortByAmount])

  const groups = useMemo(() => groupOrder.map((id) => ({
    id,
    ...groupMeta[id],
    items: filteredContracts.filter((contract) => contractGroup(contract.category) === id),
  })).filter((group) => group.items.length > 0), [filteredContracts])

  function toggleGroup(id: GroupId) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Финансов преглед</h1>
              <span className="border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Реални данни</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {firstName ? `${firstName}, ` : ""}всички потвърдени плащания и задачи на едно място.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-md bg-card pl-10" placeholder="Търсене в договорите…" />
            </div>
            <Button asChild className="h-11 rounded-md px-5">
              <Link href="/vertraege"><Plus className="size-4" aria-hidden="true" />Добави плащане</Link>
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-md px-5" onClick={() => setAssistantOpen(true)}>
              <Bot className="size-4" aria-hidden="true" />AI Assistant
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Обобщение">
          <Kpi icon={WalletCards} label="Общо месечно" value={monthlyTotal > 0 ? formatMoney(monthlyTotal) : "Няма данни"} note="Само въведени месечни суми" />
          <Kpi icon={CircleCheck} label="Активни плащания" value={String(contracts.length)} note="Всички записани договори" />
          <Kpi icon={CalendarDays} label="Следващ падеж" value={nextReminder ? formatDate(nextReminder.due_at) : "Няма данни"} note={nextReminder?.title ?? "Няма записан предстоящ срок"} />
          <Kpi icon={Bell} label="За проверка" value={String(reviewCount + missingCosts)} note="Документи и липсващи суми" />
        </section>

        <WorkplaceActionCenter
          firstName={firstName}
          nextAction={nextAction}
          reviewCount={reviewCount}
          documentCount={documents.length}
          contractCount={contracts.length}
          reminderCount={reminders.length}
        />
        <MissingInformationInterviewer questions={missingInformationQuestions} />

        <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="kintex-panel min-w-0 overflow-hidden" aria-labelledby="payments-title">
            <div className="flex flex-col justify-between gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 id="payments-title" className="text-lg font-semibold">Месечни плащания</h2>
                <p className="mt-1 text-xs text-muted-foreground">Групирани от въведените договори в KintexBG</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant={onlyNeedsAttention ? "secondary" : "outline"} size="sm" className="rounded-lg" onClick={() => setOnlyNeedsAttention((value) => !value)}><Filter className="size-4" />За внимание</Button>
                <Button type="button" variant={sortByAmount ? "secondary" : "outline"} size="sm" className="rounded-lg" onClick={() => setSortByAmount((value) => !value)}><SlidersHorizontal className="size-4" />По сума</Button>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3"><span className="sr-only">Избор</span></th>
                    <th className="px-3 py-3">Категория</th>
                    <th className="px-3 py-3">Договор / доставчик</th>
                    <th className="px-3 py-3 text-right">Месечна вноска</th>
                    <th className="px-3 py-3">Падеж</th>
                    <th className="px-3 py-3">Край на договор</th>
                    <th className="px-3 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isCollapsed = collapsed.has(group.id)
                    const groupTotal = group.items.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)
                    return (
                      <Fragment key={group.id}>
                        <tr className="border-t border-border bg-slate-50/80">
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => toggleGroup(group.id)} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`${isCollapsed ? "Покажи" : "Скрий"} ${group.label}`}>
                              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                            </button>
                          </td>
                          <td className="px-3 py-3 font-semibold">{group.label} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{group.items.length}</span></td>
                          <td className="px-3 py-3 text-muted-foreground">Обобщение</td>
                          <td className="px-3 py-3 text-right font-semibold">{groupTotal > 0 ? formatMoney(groupTotal) : "Няма данни"}</td>
                          <td colSpan={4} />
                        </tr>
                        {!isCollapsed && group.items.map((contract) => (
                          <tr key={contract.id} className="border-t border-border/70 transition-colors hover:bg-slate-50">
                            <td className="px-4 py-3"><span className="block size-4 rounded border border-input bg-background" /></td>
                            <td className="px-3 py-3 text-muted-foreground">{group.label}</td>
                            <td className="px-3 py-3"><p className="font-medium">{contract.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{contract.provider_name ?? "Доставчикът не е въведен"}</p></td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(contract.monthly_amount)}</td>
                            <td className="px-3 py-3 text-muted-foreground">{formatDate(contract.end_date)}</td>
                            <td className="px-3 py-3 text-muted-foreground">Няма данни</td>
                            <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${contract.status === "confirmed" || contract.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(contract.status)}</span></td>
                            <td className="px-4 py-3 text-right"><Button asChild variant="ghost" size="icon" className="size-8 rounded-lg" aria-label={`Отвори ${contract.title}`}><Link href="/vertraege"><Eye className="size-4" /></Link></Button></td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                  {groups.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-14 text-center"><WalletCards className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Няма намерени договори</p><p className="mt-1 text-sm text-muted-foreground">Добави първото плащане или промени търсенето.</p></td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-border bg-slate-50/70">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 font-semibold">Общо ({filteredContracts.length} плащания)</td>
                    <td className="px-3 py-4 text-right font-bold tabular-nums">{filteredContracts.some((item) => item.monthly_amount != null) ? formatMoney(filteredContracts.reduce((sum, item) => sum + (Number(item.monthly_amount) || 0), 0)) : "Няма данни"}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {groups.map((group) => (
                <section key={group.id} aria-label={group.label}>
                  <button type="button" onClick={() => toggleGroup(group.id)} className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left">
                    <span className="flex items-center gap-2 text-sm font-semibold">{collapsed.has(group.id) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}{group.label}</span>
                    <span className="text-xs font-medium text-muted-foreground">{group.items.length}</span>
                  </button>
                  {!collapsed.has(group.id) && <div className="divide-y divide-border">
                    {group.items.map((contract) => <article key={contract.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div><p className="font-semibold">{contract.title}</p><p className="mt-1 text-xs text-muted-foreground">{contract.provider_name ?? "Доставчикът не е въведен"}</p></div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${contract.status === "confirmed" || contract.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(contract.status)}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-xs text-muted-foreground">Месечно</dt><dd className="mt-1 font-semibold tabular-nums">{formatMoney(contract.monthly_amount)}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Край на договор</dt><dd className="mt-1">{formatDate(contract.end_date)}</dd></div>
                      </dl>
                      <Button asChild variant="outline" size="sm" className="w-full rounded-lg"><Link href="/vertraege">Отвори договора<ArrowRight className="size-4" /></Link></Button>
                    </article>)}
                  </div>}
                </section>
              ))}
              {groups.length === 0 && <div className="px-6 py-12 text-center"><WalletCards className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Няма намерени договори</p><p className="mt-1 text-sm text-muted-foreground">Добави първото плащане или промени търсенето.</p></div>}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="kintex-panel overflow-hidden" aria-labelledby="assistant-title">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-5" /></span><div><h2 id="assistant-title" className="font-semibold">AI Home Office</h2><p className="text-xs text-muted-foreground">Assistant</p></div></div>
                <span className="size-2 rounded-full bg-emerald-500" aria-label="Активен" />
              </div>
              <div className="space-y-3 p-4">
                <Link href={nextAction.href} className="block rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold">Следваща стъпка</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{nextAction.label}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Отвори <ArrowRight className="size-3" /></span></div></div></Link>
                <Link href="/documents" className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"><div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold">Документи за преглед</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{reviewCount > 0 ? `${reviewCount} документа чакат потвърждение.` : "Няма документи, чакащи потвърждение."}</p></div></div></Link>
                {problems.length > 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{problems.length} сигнала изискват внимание. AI не предприема действие без потвърждение.</div>}
              </div>
              <div className="border-t border-border p-4">
                <Button asChild variant="outline" className="h-11 w-full justify-between rounded-xl font-normal text-muted-foreground"><Link href="/protected/home-office"><span>Попитай за разходите си</span><Send className="size-4" /></Link></Button>
                <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">Отговорите използват само потвърдени данни.</p>
              </div>
            </section>

            <section className="kintex-panel p-5">
              <h2 className="font-semibold">Последна активност</h2>
              <div className="mt-4 space-y-3">
                {auditEvents.length === 0 ? <p className="text-sm text-muted-foreground">Няма записани събития.</p> : auditEvents.slice(0, 4).map((event) => <div key={event.id} className="border-b border-border pb-3 last:border-0 last:pb-0"><p className="text-sm font-medium">{event.event_summary ?? event.event_type}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(event.created_at)}</p></div>)}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-200/40" aria-labelledby="radar-title">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Kintex Radar</p><h2 id="radar-title" className="mt-1 font-semibold">Сигнали от твоите данни</h2></div><span className="text-xs text-muted-foreground">{radarSignals.length}</span></div>
              <div className="mt-4 space-y-3">{radarSignals.length === 0 ? <p className="text-sm text-muted-foreground">Няма открити сигнали.</p> : radarSignals.slice(0, 3).map((signal) => <div key={signal.id} className="border-l-2 border-primary px-3 py-1"><p className="text-sm font-medium">{signal.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.detail}</p></div>)}</div>
              <p className="mt-4 text-[11px] text-muted-foreground">Radar показва само записани данни. Не изчислява измислени спестявания.</p>
            </section>
          </aside>
        </div>
      </div>

      <button type="button" onClick={() => setAssistantOpen(true)} className="fixed bottom-5 right-5 z-30 flex h-13 items-center gap-3 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xl shadow-blue-500/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none md:bottom-7 md:right-7" aria-label="Отвори AI Home Office Assistant">
        <Bot className="size-5" aria-hidden="true" /><span className="hidden sm:inline">AI Home Office</span>
      </button>

      {assistantOpen && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="assistant-drawer-title">
        <button type="button" className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px]" onClick={() => setAssistantOpen(false)} aria-label="Затвори AI Assistant" />
        <aside className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot className="size-5" /></span>
              <div><h2 id="assistant-drawer-title" className="font-semibold">AI Home Office Assistant</h2><p className="text-xs text-muted-foreground">KintexBG работно пространство</p></div>
            </div>
            <Button ref={assistantCloseButton} type="button" variant="ghost" size="icon" className="rounded-lg" onClick={() => setAssistantOpen(false)} aria-label="Затвори"><X className="size-5" /></Button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section className="rounded-xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">Следваща стъпка</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">{nextAction.label}</p>
              <Button asChild className="mt-5 w-full rounded-lg"><Link href={nextAction.href}>Продължи<ArrowRight className="size-4" /></Link></Button>
            </section>
            <section className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card text-center">
              <div className="p-3"><p className="text-lg font-bold">{contracts.length}</p><p className="text-[11px] text-muted-foreground">Договори</p></div>
              <div className="p-3"><p className="text-lg font-bold">{documents.length}</p><p className="text-[11px] text-muted-foreground">Документи</p></div>
              <div className="p-3"><p className="text-lg font-bold">{problems.length}</p><p className="text-[11px] text-muted-foreground">Сигнали</p></div>
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Какво може да направи сега</h3>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>• Преглед на потвърдени договори и месечни разходи</p>
                <p>• Анализ на качени документи след твое потвърждение</p>
                <p>• Подготовка на следваща стъпка без автоматично изпращане</p>
              </div>
            </section>
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Kintex Radar</p>
              <div className="space-y-2">{radarSignals.length === 0 ? <p className="text-sm text-muted-foreground">Няма сигнали за проверка.</p> : radarSignals.slice(0, 4).map((signal) => <div key={signal.id} className="border-l-2 border-primary px-3 py-2"><p className="text-sm font-medium">{signal.title}</p><p className="mt-1 text-xs text-muted-foreground">{signal.detail}</p></div>)}</div>
            </section>
            <AiHomeOfficeChat />
          </div>
          <footer className="border-t border-border p-5">
            <Button asChild variant="outline" className="h-12 w-full justify-between rounded-xl"><Link href="/protected/home-office"><span>Отвори пълния AI Assistant</span><Send className="size-4" /></Link></Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Работи само с данните в твоя KintexBG профил.</p>
          </footer>
        </aside>
      </div>}
    </main>
  )
}
