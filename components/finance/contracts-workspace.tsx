"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, FileText, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

type ContractCategory = "electricity" | "gas" | "internet" | "mobile" | "insurance" | "housing" | "subscription" | "other"
type Contract = { id: string; title: string; category: ContractCategory; provider: string | null; monthly_cost: number | null; status: string }

const categories: Array<{ value: ContractCategory; label: string }> = [
  { value: "electricity", label: "Strom" },
  { value: "gas", label: "Gas" },
  { value: "internet", label: "Internet" },
  { value: "mobile", label: "Mobile" },
  { value: "insurance", label: "Versicherung" },
  { value: "housing", label: "Wohnen" },
  { value: "subscription", label: "Abo" },
  { value: "other", label: "Sonstiges" },
]

export function ContractsWorkspace({ householdId, initialContracts, loadError }: { householdId: string; initialContracts: Contract[]; loadError?: string | null }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [form, setForm] = useState<{ title: string; category: ContractCategory; provider: string; monthly_cost: string }>({ title: "", category: "electricity", provider: "", monthly_cost: "" })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(loadError ?? "")
  const monthlyTotal = useMemo(() => contracts.reduce((sum, contract) => sum + (Number(contract.monthly_cost) || 0), 0), [contracts])
  const missingCost = contracts.filter((contract) => contract.monthly_cost == null).length

  async function addContract() {
    if (!form.title.trim() || !form.provider.trim()) {
      setMessage("Bitte Bezeichnung und Anbieter eintragen.")
      return
    }
    setSaving(true)
    setMessage("")
    const supabase = createClient()
    const { data, error } = await supabase.from("contracts").insert({ household_id: householdId, title: form.title.trim(), category: form.category, provider_name: form.provider.trim(), monthly_amount: form.monthly_cost ? Number(form.monthly_cost) : null, status: "draft" }).select("id,title,category,provider:provider_name,monthly_cost:monthly_amount,status").single()
    if (error) setMessage("Vertrag konnte nicht gespeichert werden.")
    else if (data) {
      setContracts((current) => [data, ...current])
      setForm({ title: "", category: "electricity", provider: "", monthly_cost: "" })
      setMessage("Gespeichert. Kintex Radar nutzt diesen Vertrag ab sofort als gespeicherte Quelle.")
    }
    setSaving(false)
  }

  return <section className="mt-8 space-y-6 border border-border bg-card p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contracts</p><h2 className="mt-2 text-2xl font-semibold">Laufende Kosten sammeln</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Erfasse reale Verträge. Empfehlungen bleiben deaktiviert, solange keine geprüften Partnerdaten verfügbar sind.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Verträge</p><p className="mt-2 text-2xl font-semibold">{contracts.length}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Monatlich erfasst</p><p className="mt-2 text-2xl font-semibold">{monthlyTotal ? `${monthlyTotal.toFixed(2)} €` : "NEEDS_DATA"}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Fehlende Kosten</p><p className="mt-2 text-2xl font-semibold">{missingCost}</p></div></div>
    <div className="grid gap-3 md:grid-cols-4"><Input aria-label="Bezeichnung" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Bezeichnung" /><select aria-label="Kategorie" className="h-10 border border-input bg-background px-3 text-sm text-foreground" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ContractCategory })}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select><Input aria-label="Anbieter" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="Anbieter" /><Input aria-label="Monatliche Kosten" type="number" min="0" step="0.01" value={form.monthly_cost} onChange={(event) => setForm({ ...form, monthly_cost: event.target.value })} placeholder="Monatlich in €" /></div>
    <div className="flex flex-wrap gap-3"><Button onClick={addContract} disabled={saving}>{saving ? "Speichert…" : "Vertrag hinzufügen"}</Button><Button asChild variant="outline"><Link href="/protected/home-office"><FileText className="size-4" aria-hidden="true" /> Vertrag per AI prüfen</Link></Button></div>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <div className="space-y-2">{contracts.length === 0 ? <p className="bg-secondary p-4 text-sm text-muted-foreground">Noch keine Verträge erfasst.</p> : contracts.map((contract) => <div key={contract.id} className="flex items-center justify-between border border-border p-4"><div><p className="font-medium">{contract.title}</p><p className="text-sm text-muted-foreground">{contract.provider ?? categories.find((category) => category.value === contract.category)?.label ?? contract.category}</p></div><div className="text-right"><p className="font-semibold">{contract.monthly_cost == null ? "NEEDS_DATA" : `${Number(contract.monthly_cost).toFixed(2)} € / Monat`}</p><p className="text-xs text-muted-foreground">{contract.status}</p></div></div>)}</div>
    <div className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground"><Radar className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>Kintex Radar liest nur gespeicherte Verträge. Ohne Beträge oder Dokumente wird keine Ersparnis berechnet.</p></div>
    {missingCost > 0 && <div className="flex items-start gap-3 border border-border p-4 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>{missingCost} Vertrag/Verträge brauchen noch monatliche Kosten, bevor Radar Kosten sinnvoll auswertet.</p></div>}
  </section>
}
