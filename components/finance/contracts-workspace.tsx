"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, FileText, Radar, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import { OptimizeFlow } from "@/components/finance/optimize-flow"

type ContractCategory = "electricity" | "gas" | "internet" | "mobile" | "insurance" | "housing" | "subscription" | "other"
type Contract = {
  id: string; title: string; category: ContractCategory; provider: string | null; monthly_cost: number | null
  contract_number?: string | null; start_date?: string | null; end_date?: string | null; cancellation_deadline?: string | null
  review_status?: "needs_review" | "confirmed"; status: string; document_id?: string | null; extraction_confidence?: number | null
}
type ReviewFacts = {
  title: string; category: ContractCategory; provider: string; contractNumber: string; monthlyAmount: number | null
  startDate: string; endDate: string; cancellationDeadline: string; confidence: number | null; evidence: string[]
}

const categoryValues: ContractCategory[] = ["electricity", "gas", "internet", "mobile", "insurance", "housing", "subscription", "other"]
const emptyFacts: ReviewFacts = { title: "", category: "other", provider: "", contractNumber: "", monthlyAmount: null, startDate: "", endDate: "", cancellationDeadline: "", confidence: null, evidence: [] }

export function ContractsWorkspace({ householdId, initialContracts, loadError }: { householdId: string; initialContracts: Contract[]; loadError?: string | null }) {
  const { t } = useLanguage()
  const copy = t.contractWorkspace
  const [contracts, setContracts] = useState(initialContracts)
  const [form, setForm] = useState({ title: "", category: "electricity" as ContractCategory, provider: "", monthly_cost: "" })
  const [facts, setFacts] = useState<ReviewFacts | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(loadError ?? "")
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
      setFacts({ ...emptyFacts, ...analysisPayload.analysis, provider: analysisPayload.analysis.provider ?? "", contractNumber: analysisPayload.analysis.contractNumber ?? "", startDate: analysisPayload.analysis.startDate ?? "", endDate: analysisPayload.analysis.endDate ?? "", cancellationDeadline: analysisPayload.analysis.cancellationDeadline ?? "", evidence: analysisPayload.analysis.evidence ?? [] })
      setMessage(`„${uploadPayload.document.name}“ ${copy.extracted}`)
    } catch { setMessage(copy.networkError) } finally { setSaving(false) }
  }

  async function confirmReview() {
    if (!facts || !documentId) return
    setSaving(true)
    const response = await fetch("/api/documents/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, facts, confirm: true }) })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? copy.confirmationFailed)
    else { setContracts((current) => [payload.contract!, ...current.filter((item) => item.id !== payload.contract!.id)]); setFacts(null); setDocumentId(null); setMessage(copy.confirmedCreated) }
    setSaving(false)
  }

  return <section className="kintex-panel mt-8 space-y-6 p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold">{copy.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.contracts}</p><p className="mt-2 text-2xl font-semibold">{contracts.length}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.monthly}</p><p className="mt-2 text-2xl font-semibold">{monthlyTotal ? `${monthlyTotal.toFixed(2)} €` : "NEEDS_DATA"}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">{copy.missingCosts}</p><p className="mt-2 text-2xl font-semibold">{missingCost}</p></div></div>
    <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="size-4" aria-hidden="true" /> {copy.reviewFile}<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    {facts && <div className="space-y-4 border border-primary/40 bg-primary/5 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.reviewRequired}</p><h3 className="mt-1 font-semibold">{copy.editExtracted}</h3></div><div className="grid gap-3 md:grid-cols-2"><Input aria-label={copy.designation} value={facts.title} onChange={(event) => setFacts({ ...facts, title: event.target.value })} placeholder={copy.designation} /><Input aria-label={copy.provider} value={facts.provider} onChange={(event) => setFacts({ ...facts, provider: event.target.value })} placeholder={copy.provider} /><select aria-label={copy.category} className="h-10 border border-input bg-background px-3 text-sm" value={facts.category} onChange={(event) => setFacts({ ...facts, category: event.target.value as ContractCategory })}>{categoryValues.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}</select><Input aria-label={copy.contractNumber} value={facts.contractNumber} onChange={(event) => setFacts({ ...facts, contractNumber: event.target.value })} placeholder={copy.contractNumber} /><Input aria-label={copy.monthlyAmount} type="number" min="0" step="0.01" value={facts.monthlyAmount ?? ""} onChange={(event) => setFacts({ ...facts, monthlyAmount: event.target.value ? Number(event.target.value) : null })} placeholder={copy.monthlyAmount} /><Input aria-label={copy.endDate} type="date" value={facts.endDate} onChange={(event) => setFacts({ ...facts, endDate: event.target.value })} /></div><p className="text-xs text-muted-foreground">{copy.confidence}: {facts.confidence == null ? "NEEDS_DATA" : `${Math.round(facts.confidence * 100)}%`} · {copy.evidence}</p><Button onClick={() => void confirmReview()} disabled={saving}>{copy.confirmAndCreate}</Button></div>}
    <div className="grid gap-3 md:grid-cols-4"><Input aria-label={copy.designation} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={copy.designation} /><select aria-label={copy.category} className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ContractCategory })}>{categoryValues.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}</select><Input aria-label={copy.provider} value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder={copy.provider} /><Input aria-label={copy.monthlyCosts} type="number" min="0" step="0.01" value={form.monthly_cost} onChange={(event) => setForm({ ...form, monthly_cost: event.target.value })} placeholder={copy.monthlyCosts} /></div>
    <div className="flex flex-wrap gap-3"><Button onClick={() => void addContract()} disabled={saving}>{saving ? copy.saving : copy.addManually}</Button><Button asChild variant="outline"><Link href="/protected/home-office"><FileText className="size-4" /> {copy.explainWithAi}</Link></Button></div>
    {message && <p role="status" className="border border-border bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
    <div className="space-y-2">{contracts.length === 0 ? <p className="bg-secondary p-4 text-sm text-muted-foreground">{copy.noContracts}</p> : contracts.map((contract) => <div key={contract.id} className="border border-border p-4"><div className="flex items-center justify-between"><div><p className="font-medium">{contract.title}</p><p className="text-sm text-muted-foreground">{contract.provider ?? copy.categories[contract.category]}</p></div><div className="text-right"><p className="font-semibold">{contract.monthly_cost == null ? "NEEDS_DATA" : `${Number(contract.monthly_cost).toFixed(2)} ${copy.monthlyUnit}`}</p><p className="text-xs text-muted-foreground">{contract.review_status === "confirmed" ? copy.confirmed : copy.reviewOpen}</p></div></div><OptimizeFlow contract={contract} /></div>)}</div>
    <div className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground"><Radar className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{copy.radarNote}</p></div>
    {missingCost > 0 && <div className="flex items-start gap-3 border border-border p-4 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{missingCost} {copy.missingCostNote}</p></div>}
    <p className="text-xs text-muted-foreground">{copy.household} {householdId.slice(0, 8)}… · {copy.rls}</p>
  </section>
}
