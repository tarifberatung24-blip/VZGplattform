"use client"

import { FileText } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"

export type DemoFacts = { sender: string; documentType: string; amount: string; deadline: string }
type Props = { facts: DemoFacts | null; confirmed: boolean; onChange: (facts: DemoFacts) => void; onSave: () => void }

export function DocumentFactsReview({ facts, confirmed, onChange, onSave }: Props) {
  const update = (key: keyof DemoFacts, value: string) => onChange({ ...(facts ?? { sender: "", documentType: "", amount: "", deadline: "" }), [key]: value })
  return <section className="rounded-2xl border border-border bg-card p-6" aria-labelledby="facts-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Analyse · DEMO DATA</p><h2 id="facts-title" className="mt-2 font-semibold text-foreground">Fakten prüfen und bearbeiten</h2></div><FileText className="size-5 text-muted-foreground" aria-hidden="true" /></div>{facts ? <div className="mt-5 flex flex-col gap-3">{([ ["sender", "Absender"], ["documentType", "Dokumenttyp"], ["amount", "Betrag"], ["deadline", "Explizite Frist"] ] as const).map(([key, label]) => <label key={key} className="flex flex-col gap-1 text-sm text-muted-foreground">{label}<input className="rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" value={facts[key]} onChange={(event) => update(key, event.target.value)} /></label>)}</div> : <p className="mt-5 text-sm leading-6 text-muted-foreground">Nach der lokalen Analyse erscheinen hier überprüfbare Vorschläge.</p>}<div className="mt-5 flex flex-wrap items-center gap-2"><StatusBadge status={confirmed ? "USER_CONFIRMED" : "UNVERIFIED"} />{facts && <button type="button" onClick={onSave} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">Lokal speichern</button>}<span className="text-xs text-muted-foreground">{confirmed ? "Lokal bestätigt · nicht persistent" : "Bestätigung durch dich erforderlich"}</span></div></section>
}
