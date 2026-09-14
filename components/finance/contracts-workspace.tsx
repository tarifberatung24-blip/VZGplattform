"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, FileText, Radar, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ContractCategory = "electricity" | "gas" | "internet" | "mobile" | "insurance" | "housing" | "subscription" | "other"
type Contract = {
  id: string
  title: string
  category: ContractCategory
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
}
type ReviewFacts = {
  title: string
  category: ContractCategory
  provider: string
  contractNumber: string
  monthlyAmount: number | null
  startDate: string
  endDate: string
  cancellationDeadline: string
  confidence: number | null
  evidence: string[]
}

const categories: Array<{ value: ContractCategory; label: string }> = [
  { value: "electricity", label: "Strom" }, { value: "gas", label: "Gas" }, { value: "internet", label: "Internet" },
  { value: "mobile", label: "Mobile" }, { value: "insurance", label: "Versicherung" }, { value: "housing", label: "Wohnen" },
  { value: "subscription", label: "Abo" }, { value: "other", label: "Sonstiges" },
]

const emptyFacts: ReviewFacts = { title: "", category: "other", provider: "", contractNumber: "", monthlyAmount: null, startDate: "", endDate: "", cancellationDeadline: "", confidence: null, evidence: [] }

export function ContractsWorkspace({ householdId, initialContracts, loadError }: { householdId: string; initialContracts: Contract[]; loadError?: string | null }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [form, setForm] = useState({ title: "", category: "electricity" as ContractCategory, provider: "", monthly_cost: "" })
  const [facts, setFacts] = useState<ReviewFacts | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(loadError ?? "")
  const monthlyTotal = useMemo(() => contracts.reduce((sum, contract) => sum + (Number(contract.monthly_cost) || 0), 0), [contracts])
  const missingCost = contracts.filter((contract) => contract.monthly_cost == null).length

  async function addContract() {
    if (!form.title.trim()) { setMessage("Bitte eine Bezeichnung eintragen."); return }
    setSaving(true); setMessage("")
    const response = await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title.trim(), category: form.category, provider: form.provider.trim(), monthlyAmount: form.monthly_cost ? Number(form.monthly_cost) : null }) })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? "Vertrag konnte nicht gespeichert werden.")
    else { setContracts((current) => [payload.contract!, ...current]); setForm({ title: "", category: "electricity", provider: "", monthly_cost: "" }); setMessage("Vertrag gespeichert.") }
    setSaving(false)
  }

  async function upload(file?: File) {
    if (!file) return
    setSaving(true); setMessage("Dokument wird sicher gespeichert und digital ausgelesen.")
    try {
      const body = new FormData(); body.append("file", file)
      const uploaded = await fetch("/api/documents/upload", { method: "POST", body })
      const uploadPayload = await uploaded.json() as { document?: { id: string; name: string }; code?: string }
      if (!uploaded.ok || !uploadPayload.document) { setMessage(uploadPayload.code ?? "Upload fehlgeschlagen."); return }
      setDocumentId(uploadPayload.document.id)
      const extracted = await fetch("/api/documents/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: uploadPayload.document.id }) })
      const extractionPayload = await extracted.json() as { status?: string; code?: string }
      if (!extracted.ok || extractionPayload.status !== "extracted") { setMessage(extractionPayload.code === "OCR_NOT_CONFIGURED" || extractionPayload.status === "ocr_required" ? "Dieses Dokument ist ein Scan/Bild. OCR_PROVIDER ist nicht konfiguriert; bitte erfasse die Vertragsdaten manuell." : extractionPayload.code ?? "Textauslese fehlgeschlagen."); return }
      const analyzed = await fetch("/api/documents/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: uploadPayload.document.id, mode: "contract" }) })
      const analysisPayload = await analyzed.json() as { analysis?: Partial<ReviewFacts>; code?: string }
      if (!analyzed.ok || !analysisPayload.analysis) { setMessage(analysisPayload.code === "AI_PROVIDER_NOT_CONFIGURED" ? "GROQ_API_KEY ist nicht konfiguriert. Die Datei ist gespeichert; bitte erfasse die Daten manuell." : analysisPayload.code ?? "Analyse fehlgeschlagen."); return }
      setFacts({ ...emptyFacts, ...analysisPayload.analysis, provider: analysisPayload.analysis.provider ?? "", contractNumber: analysisPayload.analysis.contractNumber ?? "", startDate: analysisPayload.analysis.startDate ?? "", endDate: analysisPayload.analysis.endDate ?? "", cancellationDeadline: analysisPayload.analysis.cancellationDeadline ?? "", evidence: analysisPayload.analysis.evidence ?? [] })
      setMessage(`„${uploadPayload.document.name}“ wurde ausgelesen. Bitte alle Fakten prüfen und bestätigen.`)
    } catch { setMessage("Netzwerkfehler bei der Dokumentverarbeitung.") } finally { setSaving(false) }
  }

  async function confirmReview() {
    if (!facts || !documentId) return
    setSaving(true)
    const response = await fetch("/api/documents/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, facts, confirm: true }) })
    const payload = await response.json().catch(() => ({})) as { contract?: Contract; code?: string }
    if (!response.ok || !payload.contract) setMessage(payload.code ?? "Bestätigung fehlgeschlagen.")
    else { setContracts((current) => [payload.contract!, ...current.filter((item) => item.id !== payload.contract!.id)]); setFacts(null); setDocumentId(null); setMessage("Fakten bestätigt und Vertrag angelegt. Kintex Radar nutzt ihn ab sofort.") }
    setSaving(false)
  }

  return <section className="kintex-panel mt-8 space-y-6 p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contracts · Kintex Radar</p><h2 className="mt-2 text-2xl font-semibold">Verträge sicher erfassen</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">PDFs werden serverseitig ausgelesen. KI-Vorschläge bleiben unverifiziert, bis du sie bearbeitest und bestätigst.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Verträge</p><p className="mt-2 text-2xl font-semibold">{contracts.length}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Monatlich erfasst</p><p className="mt-2 text-2xl font-semibold">{monthlyTotal ? `${monthlyTotal.toFixed(2)} €` : "NEEDS_DATA"}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Fehlende Kosten</p><p className="mt-2 text-2xl font-semibold">{missingCost}</p></div></div>
    <label className="inline-flex cursor-pointer items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="size-4" aria-hidden="true" /> Vertrag als PDF/Bild prüfen<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    {facts && <div className="space-y-4 border border-primary/40 bg-primary/5 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prüfung erforderlich</p><h3 className="mt-1 font-semibold">Extrahierte Vertragsdaten bearbeiten</h3></div><div className="grid gap-3 md:grid-cols-2"><Input aria-label="Bezeichnung" value={facts.title} onChange={(event) => setFacts({ ...facts, title: event.target.value })} placeholder="Bezeichnung" /><Input aria-label="Anbieter" value={facts.provider} onChange={(event) => setFacts({ ...facts, provider: event.target.value })} placeholder="Anbieter" /><select aria-label="Kategorie" className="h-10 border border-input bg-background px-3 text-sm" value={facts.category} onChange={(event) => setFacts({ ...facts, category: event.target.value as ContractCategory })}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Input aria-label="Vertragsnummer" value={facts.contractNumber} onChange={(event) => setFacts({ ...facts, contractNumber: event.target.value })} placeholder="Vertragsnummer" /><Input aria-label="Monatlicher Betrag" type="number" min="0" step="0.01" value={facts.monthlyAmount ?? ""} onChange={(event) => setFacts({ ...facts, monthlyAmount: event.target.value ? Number(event.target.value) : null })} placeholder="Monatlicher Betrag in €" /><Input aria-label="Vertragsende" type="date" value={facts.endDate} onChange={(event) => setFacts({ ...facts, endDate: event.target.value })} /></div><p className="text-xs text-muted-foreground">Confidence: {facts.confidence == null ? "NEEDS_DATA" : `${Math.round(facts.confidence * 100)}%`} · Evidence bleibt mit dem Dokument verknüpft.</p><Button onClick={() => void confirmReview()} disabled={saving}>Fakten bestätigen und Vertrag erstellen</Button></div>}
    <div className="grid gap-3 md:grid-cols-4"><Input aria-label="Bezeichnung" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Bezeichnung" /><select aria-label="Kategorie" className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ContractCategory })}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select><Input aria-label="Anbieter" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="Anbieter" /><Input aria-label="Monatliche Kosten" type="number" min="0" step="0.01" value={form.monthly_cost} onChange={(event) => setForm({ ...form, monthly_cost: event.target.value })} placeholder="Monatlich in €" /></div>
    <div className="flex flex-wrap gap-3"><Button onClick={() => void addContract()} disabled={saving}>{saving ? "Speichert…" : "Vertrag manuell hinzufügen"}</Button><Button asChild variant="outline"><Link href="/protected/home-office"><FileText className="size-4" /> Vertrag per AI erklären</Link></Button></div>
    {message && <p role="status" className="border border-border bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
    <div className="space-y-2">{contracts.length === 0 ? <p className="bg-secondary p-4 text-sm text-muted-foreground">Noch keine Verträge erfasst.</p> : contracts.map((contract) => <div key={contract.id} className="flex items-center justify-between border border-border p-4"><div><p className="font-medium">{contract.title}</p><p className="text-sm text-muted-foreground">{contract.provider ?? categories.find((category) => category.value === contract.category)?.label ?? contract.category}</p></div><div className="text-right"><p className="font-semibold">{contract.monthly_cost == null ? "NEEDS_DATA" : `${Number(contract.monthly_cost).toFixed(2)} € / Monat`}</p><p className="text-xs text-muted-foreground">{contract.review_status === "confirmed" ? "Bestätigt" : "Prüfung offen"}</p></div></div>)}</div>
    <div className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground"><Radar className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>Kintex Radar speichert deduplizierte Signale mit Regelversion. Ohne Betrag oder bestätigte Daten wird keine Ersparnis erfunden.</p></div>
    {missingCost > 0 && <div className="flex items-start gap-3 border border-border p-4 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{missingCost} Vertrag/Verträge brauchen noch monatliche Kosten, bevor Radar sie vollständig auswertet.</p></div>}
    <p className="text-xs text-muted-foreground">Haushalt {householdId.slice(0, 8)}… · Datenzugriff ist durch Supabase RLS begrenzt.</p>
  </section>
}
