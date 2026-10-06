"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, Bell, FileText, Pencil, Radar, Save, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { OptimizeFlow } from "@/components/finance/optimize-flow"
import { ContractActionBoard } from "@/components/finance/contract-action-board"
import { startKuendigungFromContract } from "@/lib/horizon/contracts/actions"
import { getContractsCopy } from "@/lib/horizon/contracts/copy"

type ContractCategory = "electricity" | "gas" | "internet" | "mobile" | "insurance" | "housing" | "subscription" | "other"
type Contract = {
  id: string; title: string; category: ContractCategory; provider: string | null; monthly_cost: number | null
  contract_number?: string | null; start_date?: string | null; end_date?: string | null; cancellation_deadline?: string | null
  review_status?: "needs_review" | "confirmed"; status: string; document_id?: string | null; extraction_confidence?: number | null; extracted_facts?: Record<string, unknown> | null
}
type ReviewFacts = {
  title: string; category: ContractCategory; provider: string; contractNumber: string; monthlyAmount: number | null
  startDate: string; endDate: string; cancellationDeadline: string; summary?: string; recommendedNextSteps?: string[]; missingInformation?: string[]; riskFlags?: string[]; confidence: number | null; evidence: string[]
}

function getActionState(contract: Contract, locale: "bg" | "de") {
  const de = locale === "de"
  const deadline = contract.cancellation_deadline || contract.end_date
  const days = deadline ? Math.ceil((new Date(`${deadline}T23:59:59`).getTime() - Date.now()) / 86400000) : null
  if (contract.review_status !== "confirmed") return { tone: "attention", status: de ? "Aufmerksamkeit nötig" : "Изисква внимание", next: de ? "Daten prüfen und bestätigen" : "Прегледай и потвърди данните" }
  if (contract.monthly_cost == null) return { tone: "attention", status: de ? "Aufmerksamkeit nötig" : "Изисква внимание", next: de ? "Monatliche Kosten ergänzen" : "Добави месечната цена" }
  if (days != null && days <= 60) return { tone: "urgent", status: de ? "Dringend" : "Спешно", next: de ? "Frist prüfen oder nächsten Schritt vorbereiten" : "Провери срока или подготви действие" }
  return { tone: "good", status: de ? "In Ordnung" : "Добре", next: de ? "Vertrag beobachten und bei Bedarf eine Erinnerung setzen" : "Следи договора и запази напомняне при нужда" }
}

const categoryValues: ContractCategory[] = ["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"]
const emptyFacts: ReviewFacts = { title: "", category: "other", provider: "", contractNumber: "", monthlyAmount: null, startDate: "", endDate: "", cancellationDeadline: "", confidence: null, evidence: [], recommendedNextSteps: [], missingInformation: [], riskFlags: [] }

export function ContractsWorkspace({ householdId, initialContracts, loadError }: { householdId: string; initialContracts: Contract[]; loadError?: string | null }) {
  const { t, locale } = useLanguage()
  const copy = t.contractWorkspace
  const p17 = getContractsCopy(locale)
  const [contracts, setContracts] = useState(initialContracts)
  const [form, setForm] = useState({ title: "", category: "electricity" as ContractCategory, provider: "", monthly_cost: "" })
  const [facts, setFacts] = useState<ReviewFacts | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(loadError ?? "")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Contract>>({})
  const [reminderId, setReminderId] = useState<string | null>(null)
  const [reminderDate, setReminderDate] = useState("")
  const [optimizeId, setOptimizeId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedContract = contracts.find((contract) => contract.id === selectedId) ?? contracts[0] ?? null
  const monthlyTotal = useMemo(() => contracts.reduce((sum, contract) => sum + (Number(contract.monthly_cost) || 0), 0), [contracts])
  const missingCost = contracts.filter((contract) => contract.monthly_cost == null).length

  async function addContract() {
    if (!form.title.trim()) { setMessage(copy.saveError); return }
    setSaving(true); setMessage("")
    const response = await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title.trim(), category: form.category, provider: form.provider.trim(), monthlyAmount: form.monthly_cost ? Number(form.monthly_cost) : null }) })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? copy.saveError)
    else { setContracts((current) => [payload.contract!, ...current]); setForm({ title: "", category: "electricity", provider: "", monthly_cost: "" }); setMessage(copy.saved) }
    setSaving(false)
  }

  async function upload(file?: File) {
    if (!file) return
    setSaving(true); setMessage(copy.secureStored)
    try {
      const body = new FormData(); body.append("file", file)
      const uploaded = await fetch("/api/documents/upload", { method: "POST", body })
      const uploadPayload = await uploaded.json() as { document?: { id: string; name: string }; code?: string }
      if (!uploaded.ok || !uploadPayload.document) { setMessage(uploadPayload.code ?? copy.uploadFailed); return }
      setDocumentId(uploadPayload.document.id)
      const extracted = await fetch("/api/documents/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: uploadPayload.document.id }) })
      const extractionPayload = await extracted.json() as { status?: string; code?: string }
      if (!extracted.ok || extractionPayload.status !== "extracted") { setMessage(extractionPayload.code === "OCR_NOT_CONFIGURED" || extractionPayload.status === "ocr_required" ? copy.ocrRequired : extractionPayload.code ?? copy.extractionFailed); return }
      const analyzed = await fetch("/api/documents/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: uploadPayload.document.id, mode: "contract" }) })
      const analysisPayload = await analyzed.json() as { analysis?: Partial<ReviewFacts>; code?: string }
      if (!analyzed.ok || !analysisPayload.analysis) { setMessage(analysisPayload.code === "AI_PROVIDER_NOT_CONFIGURED" ? copy.aiNotConfigured : analysisPayload.code ?? copy.analysisFailed); return }
      setFacts({ ...emptyFacts, ...analysisPayload.analysis, provider: analysisPayload.analysis.provider ?? "", contractNumber: analysisPayload.analysis.contractNumber ?? "", startDate: analysisPayload.analysis.startDate ?? "", endDate: analysisPayload.analysis.endDate ?? "", cancellationDeadline: analysisPayload.analysis.cancellationDeadline ?? "", summary: analysisPayload.analysis.summary ?? "", recommendedNextSteps: analysisPayload.analysis.recommendedNextSteps ?? [], missingInformation: analysisPayload.analysis.missingInformation ?? [], riskFlags: analysisPayload.analysis.riskFlags ?? [], evidence: analysisPayload.analysis.evidence ?? [] })
      setMessage(`„${uploadPayload.document.name}“ ${copy.extracted}`)
    } catch { setMessage(copy.networkError) } finally { setSaving(false) }
  }

  async function confirmReview(action: "leave" | "optimize" | "questions" = "leave") {
    if (!facts || !documentId) return
    setSaving(true)
    const response = await fetch("/api/documents/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, facts, confirm: true }) })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? copy.confirmationFailed)
    else { setContracts((current) => [payload.contract!, ...current.filter((item) => item.id !== payload.contract!.id)]); setFacts(null); setDocumentId(null); setOptimizeId(action === "optimize" ? payload.contract!.id : null); setMessage(action === "questions" ? copy.questionsPrepared : copy.confirmedCreated) }
    setSaving(false)
  }

  function beginEdit(contract: Contract) {
    setEditingId(contract.id)
    setEditForm({ ...contract })
    setMessage("")
  }

  async function saveEdit() {
    if (!editingId || !editForm.title || !editForm.category) return
    setSaving(true)
    const response = await fetch(`/api/contracts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        category: editForm.category,
        provider: editForm.provider ?? "",
        monthlyAmount: editForm.monthly_cost == null ? null : Number(editForm.monthly_cost),
        contractNumber: editForm.contract_number ?? "",
        startDate: editForm.start_date ?? "",
        endDate: editForm.end_date ?? "",
        cancellationDeadline: editForm.cancellation_deadline ?? "",
        reviewStatus: editForm.review_status ?? "confirmed",
      }),
    })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? copy.saveError)
    else { setContracts((items) => items.map((item) => item.id === editingId ? payload.contract! : item)); setEditingId(null); setEditForm({}); setMessage(copy.editSaved) }
    setSaving(false)
  }

  async function deleteContract(id: string) {
    if (!window.confirm(copy.deleteConfirm)) return
    setSaving(true)
    const response = await fetch(`/api/contracts/${id}`, { method: "DELETE" })
    const payload = await response.json().catch(() => ({})) as { code?: string }
    if (!response.ok) setMessage(payload.code ?? copy.saveError)
    else { setContracts((items) => items.filter((item) => item.id !== id)); setMessage(copy.deleteSaved) }
    setSaving(false)
  }

  async function saveReminder(id: string) {
    if (!reminderDate) return
    setSaving(true)
    const response = await fetch(`/api/contracts/${id}/reminder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueAt: new Date(`${reminderDate}T09:00:00`).toISOString() }) })
    const payload = await response.json().catch(() => ({})) as { code?: string }
    setMessage(response.ok ? copy.reminderSaved : payload.code ?? copy.reminderFailed)
    if (response.ok) { setReminderId(null); setReminderDate("") }
    setSaving(false)
  }

  return <section className="kintex-panel mt-8 space-y-6 p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold">{copy.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.contracts}</p><p className="mt-2 text-2xl font-semibold">{contracts.length}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.monthly}</p><p className="mt-2 text-2xl font-semibold">{monthlyTotal ? `${monthlyTotal.toFixed(2)} €` : copy.missingData}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.missingCosts}</p><p className="mt-2 text-2xl font-semibold">{missingCost}</p></div></div>
    <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="size-4" aria-hidden="true" /> {copy.reviewFile}<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    {facts && <div className="space-y-4 border border-primary/40 bg-primary/5 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.reviewRequired}</p><h3 className="mt-1 font-semibold">{copy.editExtracted}</h3></div><div className="rounded-md border border-primary/20 bg-background/60 p-4"><p className="text-sm font-semibold">{copy.aiReview}: {copy.aiSummary}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{facts.summary || copy.missingData}</p>{facts.recommendedNextSteps?.length ? <><p className="mt-4 text-sm font-semibold">{copy.nextSteps}</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{facts.recommendedNextSteps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ol></> : null}{facts.riskFlags?.length ? <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-sm font-semibold">{copy.riskFlags}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{facts.riskFlags.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{facts.missingInformation?.length ? <div className="mt-4 rounded-md border border-primary/20 p-3"><p className="text-sm font-semibold">{copy.missingInformation}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{facts.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{facts.evidence.length ? <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">{copy.evidence}</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{facts.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}</div><div className="grid gap-3 md:grid-cols-2"><Input aria-label={copy.designation} value={facts.title} onChange={(event) => setFacts({ ...facts, title: event.target.value })} placeholder={copy.designation} /><Input aria-label={copy.provider} value={facts.provider} onChange={(event) => setFacts({ ...facts, provider: event.target.value })} placeholder={copy.provider} /><select aria-label={copy.category} className="h-10 border border-input bg-background px-3 text-sm" value={facts.category} onChange={(event) => setFacts({ ...facts, category: event.target.value as ContractCategory })}>{categoryValues.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}</select><Input aria-label={copy.contractNumber} value={facts.contractNumber} onChange={(event) => setFacts({ ...facts, contractNumber: event.target.value })} placeholder={copy.contractNumber} /><Input aria-label={copy.monthlyAmount} type="number" min="0" step="0.01" value={facts.monthlyAmount ?? ""} onChange={(event) => setFacts({ ...facts, monthlyAmount: event.target.value ? Number(event.target.value) : null })} placeholder={copy.monthlyAmount} /><Input aria-label={copy.endDate} type="date" value={facts.endDate} onChange={(event) => setFacts({ ...facts, endDate: event.target.value })} /></div><p className="text-xs text-muted-foreground">{copy.confidence}: {facts.confidence == null ? copy.missingData : `${Math.round(facts.confidence * 100)}%`} · {copy.evidence}</p><div className="flex flex-wrap gap-2"><Button onClick={() => void confirmReview("leave")} disabled={saving}>{copy.leaveContract}</Button><Button variant="outline" onClick={() => void confirmReview("optimize")} disabled={saving}>{copy.optimizeContract}</Button><Button variant="ghost" onClick={() => void confirmReview("questions")} disabled={saving}>{copy.prepareQuestions}</Button></div></div>}
    <div className="grid gap-3 md:grid-cols-4"><Input aria-label={copy.designation} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={copy.designation} /><select aria-label={copy.category} className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ContractCategory })}>{categoryValues.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}</select><Input aria-label={copy.provider} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder={copy.provider} /><Input aria-label={copy.monthlyCosts} type="number" min="0" step="0.01" value={form.monthly_cost} onChange={(event) => setForm({ ...form, monthly_cost: event.target.value })} placeholder={copy.monthlyCosts} /></div>
    <div className="flex flex-wrap gap-3"><Button onClick={() => void addContract()} disabled={saving}>{saving ? copy.saving : copy.addManually}</Button><Button asChild variant="outline"><Link href={localizedPath("/assistant", locale)}><FileText className="size-4" /> {copy.explainWithAi}</Link></Button></div>
    {message && <p role="status" className="border border-border bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
    <div className="space-y-2">{contracts.length === 0 ? <p className="bg-secondary p-4 text-sm text-muted-foreground">{copy.noContracts}</p> : contracts.map((contract) => { const action = getActionState(contract, locale); const tone = action.tone === "urgent" ? "border-destructive/50 bg-destructive/5" : action.tone === "attention" ? "border-primary/40 bg-primary/5" : "border-success/30 bg-success/5"; return <div key={contract.id} className="border border-border p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{contract.title}</p><p className="text-sm text-muted-foreground">{contract.provider ?? copy.categories[contract.category]}</p></div><div className="text-right"><p className="font-semibold">{contract.monthly_cost == null ? copy.missingData : `${Number(contract.monthly_cost).toFixed(2)} ${copy.monthlyUnit}`}</p><p className="text-xs text-muted-foreground">{contract.review_status === "confirmed" ? copy.confirmed : copy.reviewOpen}</p></div></div><div className={`mt-4 rounded-md border p-3 ${tone}`}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.actionBoard}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">{action.status}</span><span className="text-sm text-muted-foreground">{action.next}</span></div></div>{editingId === contract.id ? <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><Input aria-label={copy.designation} value={String(editForm.title ?? "")} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /><Input aria-label={copy.provider} value={String(editForm.provider ?? "")} onChange={(event) => setEditForm({ ...editForm, provider: event.target.value })} /><Input aria-label={copy.monthlyAmount} type="number" min="0" step="0.01" value={editForm.monthly_cost ?? ""} onChange={(event) => setEditForm({ ...editForm, monthly_cost: event.target.value ? Number(event.target.value) : null })} /><Input aria-label={copy.endDate} type="date" value={String(editForm.end_date ?? "")} onChange={(event) => setEditForm({ ...editForm, end_date: event.target.value })} /><div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={() => void saveEdit()} disabled={saving}><Save className="mr-2 size-4" />{copy.editSaved}</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-2 size-4" />Отказ</Button></div></div> : null}<div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={() => beginEdit(contract)} disabled={saving}><Pencil className="mr-2 size-4" />{copy.editContract}</Button><Button variant="outline" size="sm" onClick={() => { setReminderId(reminderId === contract.id ? null : contract.id); setReminderDate(contract.cancellation_deadline ?? contract.end_date ?? "") }} disabled={saving}><Bell className="mr-2 size-4" />{copy.reminder}</Button><Button variant="ghost" size="sm" onClick={() => void deleteContract(contract.id)} disabled={saving}><Trash2 className="mr-2 size-4" />{copy.deleteContract}</Button></div>{reminderId === contract.id ? <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"><label className="text-xs text-muted-foreground">{copy.reminderDate}<Input type="date" className="mt-1" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} /></label><Button size="sm" onClick={() => void saveReminder(contract.id)} disabled={saving || !reminderDate}>{copy.reminder}</Button></div> : null}<OptimizeFlow contract={contract} autoStart={optimizeId === contract.id} /><form action={startKuendigungFromContract} className="mt-3 flex flex-wrap items-center gap-2"><input type="hidden" name="contractId" value={contract.id} /><input type="hidden" name="locale" value={locale} /><Button type="submit" variant="outline" size="sm" disabled={saving}>{p17.startKuendigung}</Button>{contract.review_status !== "confirmed" ? <span className="text-xs text-muted-foreground">{p17.unconfirmedWarning}</span> : null}</form></div> })}</div>
     <div id="contract-action-board" className="mt-6">{selectedContract ? <ContractActionBoard contract={selectedContract} onUpdated={(updated) => setContracts((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))} onDeleted={(id) => { setContracts((current) => current.filter((item) => item.id !== id)); setSelectedId(null) }} /> : <p className="border border-border bg-secondary p-4 text-sm text-muted-foreground">{t.contractBoard.boardEmpty}</p>}</div>
     <div className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground"><Radar className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{copy.radarNote}</p></div>
    {missingCost > 0 && <div className="flex items-start gap-3 border border-border p-4 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{missingCost} {copy.missingCostNote}</p></div>}
    <p className="text-xs text-muted-foreground">{copy.household} {householdId.slice(0, 8)}… · {copy.rls}</p>
    <p className="text-xs text-muted-foreground">{p17.neutralAnalysis}</p>
  </section>
}
