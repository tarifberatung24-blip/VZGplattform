"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { businessConsultantCopy, type BusinessConsultantCopy } from "@/lib/horizon/business-consultant/ui-copy"
import { PLAYBOOK_USER_ACTIONS, isActionAvailable } from "@/lib/horizon/business-consultant/contract"

type Locale = "bg" | "de"
type Tab = "overview" | "health" | "profile" | "diagnosis" | "actions" | "documents" | "finance" | "activity"
type LoadState = "idle" | "loading" | "ready" | "error" | "schema"
type EvidenceClass = "verified_fact" | "user_provided" | "ai_assumption" | "requires_external_verification" | "recommendation"
type Profile = Record<string, unknown> & {
  id?: string
  business_name?: string
  legal_form?: string
  industry?: string
  activity_description?: string | null
  employee_count?: number | null
  annual_revenue_band?: string | null
  e_invoice_status?: string | null
  business_services?: string[]
  business_tools?: string[]
  business_goals?: string[]
  business_challenges?: string[]
}
type Finding = { section: string; statement: string; evidenceClass: EvidenceClass; references: Array<{ kind: string; id: string }> }
type Diagnosis = { status: string; model?: string; created_at?: string; content?: { findings?: Finding[]; missingInformation?: string[]; inputReferences?: Array<{ kind: string; id: string }> } }
type Action = { id: string; horizon: 30 | 60 | 90; title: string; description: string; priority: "low" | "medium" | "high"; status: "pending" | "in_progress" | "completed" | "postponed" | "rejected"; deadline: string | null; responsible: "user" | "horizon" | "partner"; approvalRequired: boolean; evidenceClass: EvidenceClass }
type FinanceEntry = { id: string; kind: "revenue" | "expense"; category: string; amountCents: number; periodMonth: string; description: string; source: "manual" | "document" | "invoice"; evidenceClass: EvidenceClass }
type FinanceSummary = { totals: { revenueCents: number; expenseCents: number; netCents: number }; evidence: { documentCents: number; manualCents: number }; empty: boolean }
type DocumentLink = { id: string; documentId: string; category: string; caseId: string | null; summary: string | null; expiresOn: string | null; renewalOn: string | null }
type Run = { id: string; status: string; objective: string; leadAgent: string; createdAt: string; completedAt: string | null; errorMessageSafe: string | null; errorCode?: string | null; traceId?: string; attempt?: number; maxAttempts?: number }
type RunStep = { id: string; stepKey: string; agentId: string; status: string; attempt: number; errorCode: string | null; errorMessageSafe: string | null; startedAt: string | null; completedAt: string | null }
type RunEvent = { id: string; eventType: string; status: string; attempt: number; createdAt: string; lastErrorCode: string | null }
type RunDetail = { run: Run; steps: RunStep[]; events: RunEvent[] }
type HealthComponent = { key: string; score: number; weight: number; coverage: number; reasonCode: string; sourceRefs: Array<{ kind: string; id: string }>; period: { from: string; to: string } | null }
type Health = { scoreVersion: string; rubricVersion: string; score: number | null; band: string; coverage: number; confidence: number; components: HealthComponent[]; missingEvidence: string[]; contradictions: Array<{ code: string; detail: string }>; riskFlags: string[]; recommendedNextAction: string | null; blocked: boolean; refusalCode: string | null; evidenceSnapshotId: string }
type DataState = { profile: Profile | null; diagnosis: Diagnosis | null; actions: Action[]; documents: DocumentLink[]; finance: { entries: FinanceEntry[]; summary: FinanceSummary | null }; runs: Run[]; runSummary: Record<string, number> | null; specialists: Array<{ id: string; alphaAgentId: string; operations: string[]; refusals: string[] }>; health: Health | null }
type UiCopy = BusinessConsultantCopy

const emptyData: DataState = { profile: null, diagnosis: null, actions: [], documents: [], finance: { entries: [], summary: null }, runs: [], runSummary: null, specialists: [], health: null }

function isSchemaError(status: number, code?: string) {
  return status === 503 || code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" || code === "ENGINE_MIGRATION_NOT_APPLIED"
}
function formatCents(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "bg-BG", { style: "currency", currency: "EUR" }).format(value / 100)
}
function evidenceLabel(value: EvidenceClass, copy: UiCopy) {
  return value === "verified_fact" ? copy.verified : value === "user_provided" ? copy.userProvided : value === "ai_assumption" ? copy.assumption : value === "requires_external_verification" ? copy.external : copy.recommendation
}
function statusLabel(value: string, copy: UiCopy) {
  return ({ pending: copy.pending, in_progress: copy.inProgress, completed: copy.completed, postponed: copy.postponed, rejected: copy.rejected, queued: "queued", running: copy.inProgress, awaiting_approval: copy.approvalsPending, failed: "failed", cancelled: "cancelled" } as Record<string, string>)[value] ?? value
}
function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const styles = { neutral: "border-border bg-muted/40 text-muted-foreground", success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", danger: "border-destructive/30 bg-destructive/10 text-destructive", info: "border-primary/30 bg-primary/10 text-primary" }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[tone]}`}>{children}</span>
}
function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_8px_30px_-24px_hsl(var(--foreground)/.35)] sm:p-6"><div className="flex items-start justify-between gap-4"><div>{eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}<h2 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">{title}</h2></div>{action}</div>{children}</section>
}

export function BusinessConsultantDashboard() {
  const { locale } = useLanguage()
  const currentLocale = locale === "de" ? "de" : "bg"
  const copy = businessConsultantCopy[currentLocale]
  const [tab, setTab] = useState<Tab>("overview")
  const [state, setState] = useState<LoadState>("loading")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DataState>(emptyData)
  const [profileForm, setProfileForm] = useState<Profile>({ business_name: "", legal_form: "einzelunternehmen", industry: "", activity_description: "", employee_count: null, annual_revenue_band: "unknown", business_services: [], business_tools: [] })
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [diagnosisStatus, setDiagnosisStatus] = useState<"idle" | "running" | "error">("idle")
  const [financeForm, setFinanceForm] = useState({ kind: "expense" as "revenue" | "expense", category: "expense_other", amount: "", periodMonth: "", description: "" })
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null)
  const [runDetailId, setRunDetailId] = useState<string | null>(null)

  const request = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    const response = await fetch(url, { credentials: "same-origin", ...options })
    const body = await response.json().catch(() => ({})) as { code?: string } & T
    if (!response.ok) {
      if (isSchemaError(response.status, body.code)) throw new Error("SCHEMA")
      throw new Error(body.code ?? "REQUEST_FAILED")
    }
    return body
  }, [])

  const load = useCallback(async () => {
    setState("loading")
    setError(null)
    try {
      const [profile, diagnosis, actions, documents, finance, runs, specialists, health] = await Promise.all([
        request<{ profile: Profile | null }>("/api/horizon/business-consultant/profile"),
        request<{ diagnosis: Diagnosis | null }>("/api/horizon/business-consultant/diagnosis"),
        request<{ actions: Action[] }>("/api/horizon/business-consultant/actions"),
        request<{ documents: DocumentLink[] }>("/api/horizon/business-consultant/documents"),
        request<{ entries: FinanceEntry[]; summary: FinanceSummary }>("/api/horizon/business-consultant/finance"),
        request<{ runs: Run[]; summary: Record<string, number> }>("/api/horizon/agent-runs"),
        request<{ specialists: DataState["specialists"] }>("/api/horizon/business-consultant/specialists"),
        request<{ health: Health }>("/api/horizon/business-consultant/health"),
      ])
      const next: DataState = { profile: profile?.profile ?? null, diagnosis: diagnosis?.diagnosis ?? null, actions: actions?.actions ?? [], documents: documents?.documents ?? [], finance: { entries: finance?.entries ?? [], summary: finance?.summary ?? null }, runs: runs?.runs ?? [], runSummary: runs?.summary ?? null, specialists: specialists?.specialists ?? [], health: health?.health ?? null }
      setData(next)
      setProfileForm(next.profile ?? { business_name: "", legal_form: "einzelunternehmen", industry: "", activity_description: "", employee_count: null, annual_revenue_band: "unknown", business_services: [], business_tools: [] })
      setState("ready")
    } catch (cause) {
      setState(cause instanceof Error && cause.message === "SCHEMA" ? "schema" : "error")
      setError(cause instanceof Error ? cause.message : "REQUEST_FAILED")
    }
  }, [request])

  useEffect(() => { void load() }, [load])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setProfileStatus("saving")
    try {
      const result = await request<{ profile: Profile }>("/api/horizon/business-consultant/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileForm) })
      setData((current) => ({ ...current, profile: result?.profile ?? current.profile }))
      setProfileStatus("saved")
    } catch { setProfileStatus("error") }
  }
  async function runDiagnosis() {
    setDiagnosisStatus("running")
    try { await request("/api/horizon/business-consultant/diagnosis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: currentLocale }) }); setDiagnosisStatus("idle"); await load(); setTab("diagnosis") } catch { setDiagnosisStatus("error") }
  }
  async function updateAction(actionId: string, action: string) {
    try { await request("/api/horizon/business-consultant/actions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionId, action }) }); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "REQUEST_FAILED") }
  }
  async function openRunDetail(runId: string) {
    if (runDetailId === runId) { setRunDetailId(null); setRunDetail(null); return }
    try { const detail = await request<RunDetail>(`/api/horizon/agent-runs/${runId}`); setRunDetailId(runId); setRunDetail(detail ?? null) } catch (cause) { setError(cause instanceof Error ? cause.message : "REQUEST_FAILED") }
  }
  async function cancelRun(runId: string) {
    try { await request(`/api/horizon/agent-runs/${runId}/cancel`, { method: "POST" }); setRunDetailId(null); setRunDetail(null); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "REQUEST_FAILED") }
  }
  async function retryRun(runId: string) {
    try { await request(`/api/horizon/agent-runs/${runId}/retry`, { method: "POST" }); setRunDetailId(null); setRunDetail(null); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "REQUEST_FAILED") }
  }
  async function addFinance(event: React.FormEvent) {
    event.preventDefault()
    const amountCents = Math.round(Number(financeForm.amount.replace(",", ".")) * 100)
    if (!Number.isFinite(amountCents) || amountCents < 0 || !financeForm.periodMonth) return
    try { await request("/api/horizon/business-consultant/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: financeForm.kind, category: financeForm.category, amountCents, periodMonth: financeForm.periodMonth, description: financeForm.description, source: "manual" }) }); setFinanceForm((current) => ({ ...current, amount: "", description: "" })); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "REQUEST_FAILED") }
  }

  const findings = data.diagnosis?.content?.findings ?? []
  const pendingActions = data.actions.filter((item) => item.status !== "completed" && item.status !== "rejected")
  const pendingApprovals = [...data.actions.filter((item) => item.approvalRequired && item.status !== "completed"), ...data.runs.filter((run) => run.status === "awaiting_approval")]
  const completion = data.profile ? Math.min(100, Math.round((["business_name", "legal_form", "industry", "activity_description", "employee_count", "annual_revenue_band", "business_services", "business_tools"].filter((key) => { const value = data.profile?.[key]; return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "" && value !== "unknown" }).length / 8) * 100)) : 0
  const monthly = useMemo(() => data.finance.summary?.totals ?? { revenueCents: 0, expenseCents: 0, netCents: 0 }, [data.finance.summary])

  const tabs: Array<{ id: Tab; label: string; icon: typeof Gauge }> = [
    { id: "overview", label: copy.overview, icon: Gauge }, { id: "health", label: copy.healthTitle, icon: Activity }, { id: "profile", label: copy.profile, icon: ShieldCheck }, { id: "diagnosis", label: copy.diagnosis, icon: Sparkles }, { id: "actions", label: copy.actionCenter, icon: CheckCircle2 }, { id: "documents", label: copy.documents, icon: FileText }, { id: "finance", label: copy.finance, icon: CircleDollarSign }, { id: "activity", label: copy.activity, icon: BarChart3 },
  ]

  return <main className="min-h-[calc(100svh-4rem)] bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1440px]">
      <header className="flex flex-col justify-between gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.intro}</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={state === "loading"}><RefreshCw className={`mr-2 size-4 ${state === "loading" ? "animate-spin" : ""}`} />{copy.refresh}</Button><Button onClick={() => void runDiagnosis()} disabled={diagnosisStatus === "running" || !data.profile}>{diagnosisStatus === "running" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}{diagnosisStatus === "running" ? copy.running : copy.runDiagnosis}</Button></div>
      </header>

      {state === "schema" ? <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100"><AlertCircle className="mt-0.5 size-5 shrink-0" /><p>{copy.schema}</p></div> : null}
      {state === "error" ? <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive"><AlertCircle className="mt-0.5 size-5 shrink-0" /><p>{copy.error} <span className="font-mono text-xs">{error}</span></p></div> : null}
      {error && state === "ready" ? <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{copy.error}</div> : null}

      <nav aria-label={copy.overview} className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-muted/30 p-1">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors sm:px-4 ${tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} aria-current={tab === id ? "page" : undefined}><Icon className="size-4" />{label}</button>)}
      </nav>

      {state === "loading" ? <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div> : null}
      {state !== "loading" && tab === "overview" ? <Overview data={data} completion={completion} monthly={monthly} pendingActions={pendingActions.length} pendingApprovals={pendingApprovals.length} copy={copy} locale={currentLocale} onTab={setTab} /> : null}
      {state !== "loading" && tab === "health" ? <HealthPanel health={data.health} copy={copy} onTab={setTab} /> : null}
      {state !== "loading" && tab === "profile" ? <ProfilePanel form={profileForm} setForm={setProfileForm} status={profileStatus} onSubmit={saveProfile} copy={copy} /> : null}
      {state !== "loading" && tab === "diagnosis" ? <DiagnosisPanel diagnosis={data.diagnosis} findings={findings} copy={copy} /> : null}
      {state !== "loading" && tab === "actions" ? <ActionPanel actions={data.actions} copy={copy} onUpdate={updateAction} /> : null}
      {state !== "loading" && tab === "documents" ? <DocumentsPanel documents={data.documents} copy={copy} locale={currentLocale} /> : null}
      {state !== "loading" && tab === "finance" ? <FinancePanel entries={data.finance.entries} summary={data.finance.summary} form={financeForm} setForm={setFinanceForm} onSubmit={addFinance} copy={copy} locale={currentLocale} /> : null}
      {state !== "loading" && tab === "activity" ? <ActivityPanel runs={data.runs} specialists={data.specialists} copy={copy} runDetail={runDetail} runDetailId={runDetailId} onOpen={openRunDetail} onCancel={cancelRun} onRetry={retryRun} locale={currentLocale} /> : null}
    </div>
  </main>
}

function Overview({ data, completion, monthly, pendingActions, pendingApprovals, copy, locale, onTab }: { data: DataState; completion: number; monthly: FinanceSummary["totals"]; pendingActions: number; pendingApprovals: number; copy: UiCopy; locale: Locale; onTab: (tab: Tab) => void }) {
  return <div className="space-y-5 py-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title={copy.completion} value={`${completion}%`} icon={Gauge} detail={data.profile ? copy.profile : copy.profileMissing} onClick={() => onTab("profile")} /><Metric title={copy.healthTitle} value={data.health && !data.health.blocked && data.health.score != null ? `${data.health.score}/100` : copy.bandInsufficient} icon={Activity} detail={data.health ? `${copy.healthCoverage}: ${Math.round(data.health.coverage * 100)}%` : copy.profileMissing} onClick={() => onTab("health")} /><Metric title={copy.latestDiagnosis} value={data.diagnosis ? copy.completed : copy.noDiagnosis} icon={Sparkles} detail={data.diagnosis?.created_at ? new Date(data.diagnosis.created_at).toLocaleDateString(locale) : copy.profileMissing} onClick={() => onTab("diagnosis")} /><Metric title={copy.actionCenter} value={String(pendingActions)} icon={Clock3} detail={copy.pending} onClick={() => onTab("actions")} /><Metric title={copy.approvals} value={String(pendingApprovals)} icon={ShieldCheck} detail={copy.approvalsPending} onClick={() => onTab("activity")} /></div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Panel title={copy.finance} eyebrow={copy.overview} action={<button type="button" className="text-xs font-semibold text-primary" onClick={() => onTab("finance")}>{copy.refresh}</button>}><div className="grid gap-3 pt-5 sm:grid-cols-3"><FinanceMetric label={copy.revenueTotal} value={monthly.revenueCents ? formatCents(monthly.revenueCents, locale) : "—"} /><FinanceMetric label={copy.expenseTotal} value={monthly.expenseCents ? formatCents(monthly.expenseCents, locale) : "—"} /><FinanceMetric label={copy.netTotal} value={monthly.revenueCents || monthly.expenseCents ? formatCents(monthly.netCents, locale) : "—"} /></div><p className="mt-4 text-xs text-muted-foreground">{data.finance.summary?.empty ? copy.noFinance : `${copy.manual}: ${formatCents(data.finance.summary?.evidence.manualCents ?? 0, locale)} · ${copy.documentSource}: ${formatCents(data.finance.summary?.evidence.documentCents ?? 0, locale)}`}</p></Panel><Panel title={copy.documentStatus} eyebrow={copy.documents}><div className="pt-5"><div className="flex items-center justify-between text-sm"><span>{copy.linked}</span><span className="font-semibold">{data.documents.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(data.documents.length * 12, 100)}%` }} /></div><Link href={localizedPath("/documents", locale)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.upload}<ArrowRight className="size-4" /></Link></div></Panel></div><Panel title={copy.externalAction} eyebrow={copy.approvals}><div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p>{copy.externalAction}</p></div></Panel></div>
}
function Metric({ title, value, detail, icon: Icon, onClick }: { title: string; value: string; detail: string; icon: typeof Gauge; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-border/80 bg-card p-5 text-left shadow-[0_8px_30px_-24px_hsl(var(--foreground)/.35)] transition-transform hover:-translate-y-0.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{title}</span><Icon className="size-4 text-primary" /></div><p className="mt-4 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></button> }
function FinanceMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/70 bg-muted/25 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div> }

function ProfilePanel({ form, setForm, status, onSubmit, copy }: { form: Profile; setForm: React.Dispatch<React.SetStateAction<Profile>>; status: string; onSubmit: (event: React.FormEvent) => void; copy: UiCopy }) {
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }))
  return <div className="py-6"><Panel title={copy.profile} eyebrow={copy.eyebrow}><form onSubmit={onSubmit} className="mt-5 grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">{copy.businessName}<Input required minLength={2} value={String(form.business_name ?? "")} onChange={(event) => set("business_name", event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">{copy.legalForm}<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={String(form.legal_form ?? "einzelunternehmen")} onChange={(event) => set("legal_form", event.target.value)}>{["einzelunternehmen", "freiberufler", "gbr", "ug", "gmbh", "ag", "other"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">{copy.industry}<Input required value={String(form.industry ?? "")} onChange={(event) => set("industry", event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">{copy.employees}<Input type="number" min={0} value={form.employee_count == null ? "" : String(form.employee_count)} onChange={(event) => set("employee_count", event.target.value === "" ? null : Number(event.target.value))} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">{copy.activity}<Textarea rows={4} value={String(form.activity_description ?? "")} onChange={(event) => set("activity_description", event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">{copy.revenue}<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={String(form.annual_revenue_band ?? "unknown")} onChange={(event) => set("annual_revenue_band", event.target.value)}>{["unknown", "under_22k", "22k_50k", "50k_100k", "100k_250k", "250k_500k", "over_500k"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">{copy.eInvoice}<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={String(form.e_invoice_status ?? "not_started")} onChange={(event) => set("e_invoice_status", event.target.value)}>{["not_started", "preparing", "ready", "using", "not_sure"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">{copy.services}<Input value={(form.business_services ?? []).join(", ")} onChange={(event) => set("business_services", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12))} placeholder="z. B. Beratung, Handwerk" /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">{copy.tools}<Input value={(form.business_tools ?? []).join(", ")} onChange={(event) => set("business_tools", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12))} placeholder="z. B. Lexoffice, DATEV" /></label><div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit" disabled={status === "saving"}>{status === "saving" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{status === "saving" ? copy.saving : copy.save}</Button>{status === "saved" ? <span role="status" className="inline-flex items-center gap-2 text-sm text-emerald-600"><Check className="size-4" />{copy.saved}</span> : null}{status === "error" ? <span role="alert" className="text-sm text-destructive">{copy.error}</span> : null}</div></form><p className="mt-5 border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">{copy.externalAction}</p></Panel></div>
}

function DiagnosisPanel({ diagnosis, findings, copy }: { diagnosis: Diagnosis | null; findings: Finding[]; copy: UiCopy }) {
  const grouped = findings.reduce<Record<string, Finding[]>>((result, item) => { (result[item.section] ??= []).push(item); return result }, {})
  return <div className="grid gap-5 py-6 xl:grid-cols-[1fr_320px]"><Panel title={copy.diagnosis} eyebrow={diagnosis?.model ?? "HORIZON Business Consultant"}>{!diagnosis ? <Empty icon={Sparkles} text={copy.noDiagnosis} /> : <div className="mt-5 space-y-5">{Object.entries(grouped).map(([section, items]) => <div key={section}><h3 className="text-sm font-semibold capitalize">{section.replaceAll("_", " ")}</h3><div className="mt-2 space-y-2">{items.map((item, index) => <article key={`${section}-${index}`} className="rounded-xl border border-border/70 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm leading-6">{item.statement}</p><Badge tone={item.evidenceClass === "verified_fact" ? "success" : item.evidenceClass === "ai_assumption" ? "warning" : item.evidenceClass === "requires_external_verification" ? "danger" : "info"}>{evidenceLabel(item.evidenceClass, copy)}</Badge></div>{item.references.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">{copy.source}: {item.references.map((reference) => `${reference.kind}:${reference.id}`).join(", ")}</p> : null}</article>)}</div></div>)}</div>}</Panel><Panel title={copy.missing} eyebrow={copy.diagnosis}><div className="pt-5 space-y-2">{(diagnosis?.content?.missingInformation ?? []).length === 0 ? <Empty text={copy.empty} /> : diagnosis?.content?.missingInformation?.map((item) => <div key={item} className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm">{item}</div>)}</div></Panel></div>
}
function ActionPanel({ actions, copy, onUpdate }: { actions: Action[]; copy: UiCopy; onUpdate: (id: string, action: string) => void }) { return <div className="space-y-5 py-6">{([30, 60, 90] as const).map((horizon) => <Panel key={horizon} title={horizon === 30 ? copy.thirty : horizon === 60 ? copy.sixty : copy.ninety} eyebrow={copy.actionCenter}><div className="mt-4 space-y-3">{actions.filter((item) => item.horizon === horizon).map((item) => <article key={item.id} className="rounded-xl border border-border/70 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge tone={item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "neutral"}>{item.priority}</Badge><Badge>{evidenceLabel(item.evidenceClass, copy)}</Badge></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p><p className="mt-2 text-xs text-muted-foreground">{copy.responsible}: {item.responsible} · {copy.status}: {statusLabel(item.status, copy)}{item.deadline ? ` · ${copy.deadline}: ${item.deadline}` : ""}</p></div><div className="flex shrink-0 flex-wrap gap-2">{PLAYBOOK_USER_ACTIONS.filter((candidate) => isActionAvailable(item.status, candidate)).map((candidate) => <Button key={candidate} size="sm" variant={candidate === "complete" ? "default" : candidate === "reject" ? "ghost" : "outline"} onClick={() => onUpdate(item.id, candidate)}>{candidate === "reopen" ? <RefreshCw className="mr-1 size-3" /> : null}{candidate === "reject" ? <X className="mr-1 size-3" /> : null}{copy[candidate]}</Button>)}</div></div></article>)}{actions.every((item) => item.horizon !== horizon) ? <Empty text={copy.empty} /> : null}</div></Panel>)}</div> }
function DocumentsPanel({ documents, copy, locale }: { documents: DocumentLink[]; copy: UiCopy; locale: Locale }) { return <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]"><Panel title={copy.documents} eyebrow={copy.documentStatus} action={<Link href={localizedPath("/documents", locale)}><Button size="sm"><Upload className="mr-2 size-4" />{copy.upload}</Button></Link>}><div className="mt-5 space-y-3">{documents.length === 0 ? <Empty icon={FileText} text={copy.noDocuments} /> : documents.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><FileCheck2 className="size-5 text-primary" /><div><p className="text-sm font-medium">{item.summary ?? item.documentId}</p><p className="mt-1 text-xs text-muted-foreground">{item.category}{item.caseId ? ` · case ${item.caseId}` : ""}</p></div></div><Badge tone="info">{copy.linked}</Badge></div>)}</div></Panel><Panel title={copy.eInvoice} eyebrow="E-Rechnung"><p className="mt-5 text-sm leading-6 text-muted-foreground">{copy.eInvoiceNotice}</p><div className="mt-4 rounded-xl border border-border/70 p-4"><p className="text-xs text-muted-foreground">{copy.status}</p><p className="mt-1 text-sm font-semibold">{copy.unavailable}</p></div></Panel></div> }
function FinancePanel({ entries, summary, form, setForm, onSubmit, copy, locale }: { entries: FinanceEntry[]; summary: FinanceSummary | null; form: { kind: "revenue" | "expense"; category: string; amount: string; periodMonth: string; description: string }; setForm: React.Dispatch<React.SetStateAction<{ kind: "revenue" | "expense"; category: string; amount: string; periodMonth: string; description: string }>>; onSubmit: (event: React.FormEvent) => void; copy: UiCopy; locale: Locale }) { return <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]"><Panel title={copy.finance} eyebrow={copy.overview}><div className="grid gap-3 pt-5 sm:grid-cols-3"><FinanceMetric label={copy.revenueTotal} value={summary && !summary.empty ? formatCents(summary.totals.revenueCents, locale) : "—"} /><FinanceMetric label={copy.expenseTotal} value={summary && !summary.empty ? formatCents(summary.totals.expenseCents, locale) : "—"} /><FinanceMetric label={copy.netTotal} value={summary && !summary.empty ? formatCents(summary.totals.netCents, locale) : "—"} /></div><div className="mt-5 space-y-2">{entries.length === 0 ? <Empty icon={WalletCards} text={copy.noFinance} /> : entries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-3 text-sm"><span className="min-w-0 truncate">{entry.description || entry.category}<span className="ml-2 text-xs text-muted-foreground">{entry.periodMonth.slice(0, 7)} · {entry.source}</span></span><span className={entry.kind === "expense" ? "text-foreground" : "text-emerald-700 dark:text-emerald-300"}>{entry.kind === "expense" ? "−" : "+"}{formatCents(entry.amountCents, locale)}</span></div>)}</div></Panel><Panel title={copy.addFinance} eyebrow={copy.finance}><form onSubmit={onSubmit} className="mt-5 space-y-4"><label className="grid gap-2 text-sm font-medium">{copy.status}<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as "revenue" | "expense", category: event.target.value === "revenue" ? "revenue_other" : "expense_other" }))}><option value="expense">{copy.expenseTotal}</option><option value="revenue">{copy.revenueTotal}</option></select></label><label className="grid gap-2 text-sm font-medium">{copy.amount ?? "Amount"}<Input required inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></label><label className="grid gap-2 text-sm font-medium">{copy.deadline}<Input required type="month" value={form.periodMonth} onChange={(event) => setForm((current) => ({ ...current, periodMonth: event.target.value }))} /></label><label className="grid gap-2 text-sm font-medium">{copy.finding}<Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label><Button type="submit"><Save className="mr-2 size-4" />{copy.addFinance}</Button></form></Panel></div> }
function RunDetailBody({ detail, copy, locale }: { detail: RunDetail; copy: UiCopy; locale: Locale }) {
  const { run, steps, events } = detail
  return <div className="mt-3 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
      <p>{copy.runTrace}: <span className="font-mono">{run.traceId ?? "—"}</span></p>
      <p>{copy.runAttempt}: {run.attempt ?? 0}/{run.maxAttempts ?? 0}</p>
      <p>{copy.status}: {statusLabel(run.status, copy)}</p>
      <p>{run.completedAt ? `${copy.completed}: ${new Date(run.completedAt).toLocaleString(locale)}` : `${copy.runs}: ${new Date(run.createdAt).toLocaleString(locale)}`}</p>
    </div>
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.runSteps}</h4>
      <div className="mt-2 space-y-2">{steps.length === 0 ? <p className="text-xs text-muted-foreground">{copy.runNoSteps}</p> : steps.map((step) => <div key={step.id} className="rounded-lg border border-border/70 bg-card p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium">{step.stepKey}</span><Badge tone={step.status === "completed" ? "success" : step.status === "failed" || step.status === "dead_letter" ? "danger" : step.status === "running" ? "info" : "neutral"}>{statusLabel(step.status, copy)}</Badge></div><p className="mt-1 text-muted-foreground">{step.agentId} · {copy.runAttempt} {step.attempt}</p>{step.errorMessageSafe ? <p className="mt-1 text-destructive">{step.errorMessageSafe}</p> : null}</div>)}</div>
    </div>
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.runEvents}</h4>
      <div className="mt-2 space-y-1">{events.length === 0 ? <p className="text-xs text-muted-foreground">{copy.empty}</p> : events.map((event) => <div key={event.id} className="flex items-center justify-between gap-2 text-xs"><span className="font-mono">{event.eventType}</span><span className="text-muted-foreground">{event.status} · {new Date(event.createdAt).toLocaleString(locale)}</span></div>)}</div>
    </div>
  </div>
}
function ActivityPanel({ runs, specialists, copy, runDetail, runDetailId, onOpen, onCancel, onRetry, locale }: { runs: Run[]; specialists: DataState["specialists"]; copy: UiCopy; runDetail: RunDetail | null; runDetailId: string | null; onOpen: (runId: string) => void; onCancel: (runId: string) => void; onRetry: (runId: string) => void; locale: Locale }) { return <div className="grid gap-5 py-6 xl:grid-cols-[1fr_360px]"><Panel title={copy.activity} eyebrow={copy.runs}><div className="mt-5 space-y-3">{runs.length === 0 ? <Empty icon={BarChart3} text={copy.noRuns} /> : runs.map((run) => <article key={run.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{run.objective}</p><p className="mt-1 text-xs text-muted-foreground">{run.leadAgent} · {new Date(run.createdAt).toLocaleString()}</p></div><Badge tone={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : run.status === "awaiting_approval" ? "warning" : "info"}>{statusLabel(run.status, copy)}</Badge></div>{run.errorMessageSafe ? <p className="mt-2 text-xs text-destructive">{run.errorMessageSafe}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onOpen(run.id)}>{runDetailId === run.id ? copy.close : copy.runDetails}</Button>{run.status === "failed" ? <Button size="sm" variant="outline" onClick={() => onRetry(run.id)}><RefreshCw className="mr-1 size-3" />{copy.retry}</Button> : null}{["queued", "running", "paused", "awaiting_approval", "failed"].includes(run.status) ? <Button size="sm" variant="ghost" onClick={() => onCancel(run.id)}><X className="mr-1 size-3" />{copy.cancel}</Button> : null}</div>{runDetailId === run.id && runDetail ? <RunDetailBody detail={runDetail} copy={copy} locale={locale} /> : null}</article>)}</div></Panel><Panel title={copy.specialist} eyebrow={copy.activity}><div className="mt-5 space-y-3">{specialists.map((item) => <div key={item.id} className="rounded-xl border border-border/70 p-3"><p className="text-sm font-semibold">{item.id}</p><p className="mt-1 text-xs text-muted-foreground">{item.alphaAgentId}</p><div className="mt-2 flex flex-wrap gap-1">{item.operations.map((operation) => <Badge key={operation}>{operation}</Badge>)}</div></div>)}</div></Panel></div> }
function healthBandLabel(band: string, copy: UiCopy) {
  return ({ critical: copy.bandCritical, weak: copy.bandWeak, moderate: copy.bandModerate, solid: copy.bandSolid, strong: copy.bandStrong, insufficient_evidence: copy.bandInsufficient } as Record<string, string>)[band] ?? band
}
function healthComponentLabel(key: string, copy: UiCopy) {
  return ({ profile_completeness: copy.componentProfile, documentation: copy.componentDocumentation, bookkeeping: copy.componentBookkeeping, liquidity: copy.componentLiquidity, compliance: copy.componentCompliance } as Record<string, string>)[key] ?? key
}
function healthNextActionLabel(action: string | null, copy: UiCopy) {
  if (!action) return null
  return ({ provide_evidence: copy.nextProvideEvidence, review_expiring_documents: copy.nextReviewExpiring, review_expenses: copy.nextReviewExpenses, complete_profile_and_documents: copy.nextCompleteProfile, maintain_current_processes: copy.nextMaintain } as Record<string, string>)[action] ?? action
}

function HealthPanel({ health, copy, onTab }: { health: Health | null; copy: UiCopy; onTab: (tab: Tab) => void }) {
  if (!health) return <div className="py-6"><Empty icon={Activity} text={copy.unavailable} /></div>
  const bandTone = health.blocked ? "warning" : health.band === "critical" || health.band === "weak" ? "danger" : health.band === "moderate" ? "info" : "success"
  return <div className="grid gap-5 py-6 xl:grid-cols-[1fr_340px]">
    <Panel title={copy.healthTitle} eyebrow={`${health.scoreVersion} · ${copy.healthRubric} ${health.rubricVersion}`}>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <FinanceMetric label={copy.healthScore} value={health.blocked || health.score == null ? "—" : `${health.score}/100`} />
        <FinanceMetric label={copy.healthCoverage} value={`${Math.round(health.coverage * 100)}%`} />
        <FinanceMetric label={copy.healthConfidence} value={`${Math.round(health.confidence * 100)}%`} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={bandTone}>{healthBandLabel(health.band, copy)}</Badge>
        {health.riskFlags.map((flag) => <Badge key={flag} tone="warning">{flag}</Badge>)}
      </div>
      {health.blocked ? <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100">{copy.healthBlocked}</p> : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{copy.healthDeterministic}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{copy.healthSnapshot}: {health.evidenceSnapshotId}</p>
      <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
        <h3 className="text-sm font-semibold">{copy.healthComponents}</h3>
        {health.components.map((component) => <div key={component.key} className="rounded-xl border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{healthComponentLabel(component.key, copy)}</span><span className="font-semibold">{Math.round(component.score)}/100</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(component.score)}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">{copy.healthCoverage}: {Math.round(component.coverage * 100)}% · {component.reasonCode}{component.period ? ` · ${component.period.from.slice(0, 7)}–${component.period.to.slice(0, 7)}` : ""}</p>
          {component.sourceRefs.length > 0 ? <p className="mt-1 text-[11px] text-muted-foreground">{copy.source}: {component.sourceRefs.slice(0, 4).map((reference) => `${reference.kind}:${reference.id.slice(0, 8)}`).join(", ")}</p> : null}
        </div>)}
      </div>
    </Panel>
    <div className="space-y-5">
      <Panel title={copy.healthMissing} eyebrow={copy.healthTitle}>
        <div className="mt-5 space-y-2">{health.missingEvidence.length === 0 ? <Empty text={copy.empty} /> : health.missingEvidence.map((item) => <div key={item} className="rounded-lg bg-amber-500/10 px-3 py-2 font-mono text-xs">{item}</div>)}</div>
      </Panel>
      {health.contradictions.length ? <Panel title={copy.healthRisks} eyebrow={copy.healthTitle}>
        <div className="mt-5 space-y-2">{health.contradictions.map((item) => <div key={item.code} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs"><p className="font-mono font-semibold">{item.code}</p><p className="mt-1 text-muted-foreground">{item.detail}</p></div>)}</div>
      </Panel> : null}
      <Panel title={copy.healthNextAction} eyebrow={copy.healthTitle}>
        <p className="mt-5 text-sm font-medium">{healthNextActionLabel(health.recommendedNextAction, copy) ?? copy.empty}</p>
        <button type="button" onClick={() => onTab("finance")} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.finance}<ArrowRight className="size-4" /></button>
      </Panel>
    </div>
  </div>
}
function Empty({ icon: Icon = FileText, text }: { icon?: typeof FileText; text: string }) { return <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground"><Icon className="size-5 shrink-0" />{text}</div> }
