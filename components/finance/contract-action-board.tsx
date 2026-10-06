"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Pencil, Quote, ShieldCheck, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  boardForContract,
  deriveMissingInfo,
  deriveNextSteps,
  deriveRiskFlags,
  type ContractBoard as BoardState,
  type ContractReviewFacts,
} from "@/lib/horizon/contracts/review"

export type BoardContract = {
  id: string
  title: string
  category: CategoryValue
  provider: string | null
  monthly_cost: number | null
  contract_number?: string | null
  start_date?: string | null
  end_date?: string | null
  cancellation_deadline?: string | null
  review_status?: "needs_review" | "confirmed"
  status: string
  document_id?: string | null
  extraction_confidence?: number | null
  extracted_facts?: Record<string, unknown> | null
}

type CategoryValue = "electricity" | "gas" | "internet" | "mobile" | "insurance" | "housing" | "subscription" | "other"
const categoryValues: CategoryValue[] = ["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"]

const BOARD_STYLES: Record<BoardState, string> = {
  good: "border-success/40 bg-success/10 text-success",
  attention: "border-primary/40 bg-primary/10 text-primary",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

/** Builds review facts from the stored contract row without inventing any value. */
export function factsFromContract(contract: BoardContract): ContractReviewFacts {
  const raw = contract.extracted_facts ?? {}
  const pick = (key: string): string => (typeof raw[key] === "string" ? (raw[key] as string) : "")
  return {
    title: contract.title,
    category: contract.category,
    provider: contract.provider ?? "",
    contractNumber: contract.contract_number ?? "",
    monthlyAmount: contract.monthly_cost,
    startDate: contract.start_date ?? "",
    endDate: contract.end_date ?? "",
    cancellationDeadline: contract.cancellation_deadline ?? "",
    summary: pick("summary"),
    confidence: contract.extraction_confidence ?? (typeof raw.confidence === "number" ? (raw.confidence as number) : null),
    evidence: stringArray(raw.evidence),
    nextSteps: stringArray(raw.recommendedNextSteps ?? raw.nextSteps),
    riskFlags: stringArray(raw.riskFlags),
  }
}

export function ContractActionBoard({
  contract,
  onUpdated,
  onDeleted,
}: {
  contract: BoardContract
  onUpdated: (contract: BoardContract) => void
  onDeleted: (id: string) => void
}) {
  const { t } = useLanguage()
  const copy = t.contractBoard as unknown as Record<string, string> & { board: Record<BoardState, string>; boardHint: Record<BoardState, string>; missingFields: Record<string, string> }
  const facts = useMemo(() => factsFromContract(contract), [contract])
  const board = boardForContract(contract)
  const missing = useMemo(() => deriveMissingInfo(facts), [facts])
  const steps = useMemo(() => deriveNextSteps(facts), [facts])
  const risks = useMemo(() => deriveRiskFlags(facts), [facts])
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [form, setForm] = useState(() => ({
    title: contract.title,
    category: contract.category as CategoryValue,
    provider: contract.provider ?? "",
    monthlyAmount: contract.monthly_cost == null ? "" : String(contract.monthly_cost),
    contractNumber: contract.contract_number ?? "",
    startDate: contract.start_date ?? "",
    endDate: contract.end_date ?? "",
    cancellationDeadline: contract.cancellation_deadline ?? "",
    reviewStatus: contract.review_status ?? "needs_review",
  }))

  async function save() {
    if (!form.title.trim()) return
    setBusy(true); setNotice("")
    const response = await fetch(`/api/contracts/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        category: form.category,
        provider: form.provider.trim(),
        monthlyAmount: form.monthlyAmount ? Number(form.monthlyAmount) : null,
        contractNumber: form.contractNumber.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        cancellationDeadline: form.cancellationDeadline,
        reviewStatus: form.reviewStatus,
      }),
    })
    const payload = await response.json().catch(() => ({})) as { contract?: BoardContract; code?: string }
    if (!response.ok || !payload.contract) setNotice(payload.code ?? copy.editFailed)
    else { onUpdated({ ...contract, ...payload.contract }); setEditing(false) }
    setBusy(false)
  }

  async function remove() {
    if (!window.confirm(copy.deleteConfirm)) return
    setBusy(true); setNotice("")
    const response = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" })
    if (!response.ok) { setNotice(copy.deleteFailed); setBusy(false); return }
    onDeleted(contract.id)
    setBusy(false)
  }

  async function addReminder() {
    setBusy(true); setNotice("")
    const response = await fetch(`/api/contracts/${contract.id}/reminder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    const payload = await response.json().catch(() => ({})) as { reminder?: unknown; code?: string }
    if (!response.ok || !payload.reminder) setNotice(payload.code === "REMINDER_DATE_REQUIRED" ? copy.reminderDateRequired : payload.code ?? copy.reminderFailed)
    else setNotice(copy.reminderAdded)
    setBusy(false)
  }

  function runStep(view: string) {
    if (view === "review_facts") { setEditing(true); return }
    if (view === "add_reminder") { void addReminder(); return }
    if (view === "optimize_tariff") { document.getElementById(`optimize-${contract.id}`)?.scrollIntoView({ behavior: "smooth" }); return }
    if (view === "prepare_kuendigung") { document.getElementById(`kuendigung-${contract.id}`)?.scrollIntoView({ behavior: "smooth" }) }
  }

  const stepLabel = (key: string) => copy[key] ?? key

  return <section className="mt-4 space-y-4 rounded-md border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold">{copy.title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${BOARD_STYLES[board]}`}>
        {board === "good" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
        {copy.board[board]}
      </span>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">{copy.boardHint[board]}</p>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.summaryLabel}</p>
        <p className="mt-2 text-sm leading-6">{facts.summary || copy.summaryEmpty}</p>
        <p className="mt-3 text-xs text-muted-foreground">{copy.confidence}: {facts.confidence == null ? "—" : `${Math.round(facts.confidence * 100)}%`}</p>
      </div>
      <div className="border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.missingLabel}</p>
        {missing.complete ? <p className="mt-2 text-sm text-muted-foreground">{copy.missingComplete}</p> : <div className="mt-2 flex flex-wrap gap-2">{missing.fields.map((field) => <span key={field} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">{copy.missingFields[field] ?? field}</span>)}</div>}
      </div>
    </div>

    <div className="border border-border p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="size-4 text-primary" aria-hidden="true" />{copy.nextStepsLabel}</p>
      {steps.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{copy.nextStepsEmpty}</p> : <ul className="mt-3 space-y-2">{steps.map((step) => <li key={step.id} className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/40 p-3"><div><p className="text-sm font-medium">{stepLabel(step.titleKey)}</p><p className="text-xs text-muted-foreground">{stepLabel(step.detailKey)}</p></div><Button size="sm" variant="outline" onClick={() => runStep(step.view)} disabled={busy}>{stepLabel(step.titleKey)}</Button></li>)}</ul>}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-border p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Quote className="size-4 text-primary" aria-hidden="true" />{copy.evidenceLabel}</p>
        {facts.evidence.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{copy.evidenceEmpty}</p> : <ul className="mt-2 space-y-2">{facts.evidence.map((snippet, index) => <li key={index} className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">„{snippet}“</li>)}</ul>}
      </div>
      <div className="border border-border p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />{copy.risksLabel}</p>
        {risks.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{copy.risksEmpty}</p> : <ul className="mt-2 space-y-2">{risks.map((risk) => <li key={risk.id} className="border border-border bg-background/40 p-3"><p className="text-sm font-medium">{stepLabel(risk.titleKey)}</p><p className="text-xs text-muted-foreground">{stepLabel(risk.detailKey)}</p></li>)}</ul>}
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)} disabled={busy}><Pencil className="mr-2 size-4" aria-hidden="true" />{copy.editTitle}</Button>
      <Button size="sm" variant="outline" onClick={() => void addReminder()} disabled={busy}><CalendarClock className="mr-2 size-4" aria-hidden="true" />{busy ? copy.reminderAdding : copy.reminderAdd}</Button>
      <Button size="sm" variant="outline" onClick={() => void remove()} disabled={busy}><Trash2 className="mr-2 size-4" aria-hidden="true" />{busy ? copy.deleting : copy.delete}</Button>
    </div>

    {editing && <div className="space-y-3 border border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-primary" aria-hidden="true" />{copy.editTitle}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Input aria-label={copy.editTitle} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Input aria-label="provider" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} />
        <select aria-label="category" className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as CategoryValue })}>{categoryValues.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <Input aria-label="monthlyAmount" type="number" min="0" step="0.01" value={form.monthlyAmount} onChange={(event) => setForm({ ...form, monthlyAmount: event.target.value })} />
        <Input aria-label="contractNumber" value={form.contractNumber} onChange={(event) => setForm({ ...form, contractNumber: event.target.value })} />
        <Input aria-label="startDate" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        <Input aria-label="endDate" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
        <Input aria-label="cancellationDeadline" type="date" value={form.cancellationDeadline} onChange={(event) => setForm({ ...form, cancellationDeadline: event.target.value })} />
        <select aria-label="reviewStatus" className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.reviewStatus} onChange={(event) => setForm({ ...form, reviewStatus: event.target.value as "needs_review" | "confirmed" })}>
          <option value="needs_review">{t.contractWorkspace.reviewOpen}</option>
          <option value="confirmed">{t.contractWorkspace.confirmed}</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void save()} disabled={busy}>{busy ? copy.saving : copy.save}</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>{copy.cancel}</Button></div>
    </div>}

    {notice && <p role="status" className="border border-border bg-secondary p-3 text-sm text-muted-foreground">{notice}</p>}
  </section>
}
