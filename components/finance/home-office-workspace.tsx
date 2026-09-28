"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { CheckCircle2, FileText, ShieldCheck, Trash2 } from "lucide-react"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DocumentIntake, type IntakeDocument } from "./document-intake"
import type { DemoAnalysis } from "@/lib/home-office/types"

type StoredDocument = { id: string; name: string; size: number; type: string; status: string }
type Step = "idle" | "uploading" | "analyzing" | "needs_review" | "reviewed"

const messages: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: "Nur PDF, JPG oder PNG sind erlaubt.", FILE_TOO_LARGE: "Die Datei ist größer als 10 MB.", FILE_EMPTY: "Die Datei ist leer.", FILE_INVALID_SIGNATURE: "Die Datei passt nicht zum erwarteten Format.", FILE_NAME_INVALID: "Der Dateiname ist ungültig.", UPLOAD_NOT_AUTHENTICATED: "Bitte melde dich erneut an.", STORAGE_NOT_CONFIGURED: "Dokumentenspeicher ist noch nicht korrekt verbunden.", SCHEMA_NOT_VERIFIED: "Die Dokumentenverarbeitung ist derzeit nicht verfügbar.", AI_PROVIDER_NOT_CONFIGURED: "Die automatische Analyse ist derzeit nicht verfügbar.", ANALYSIS_FAILED: "Die Analyse konnte nicht gestartet werden.", REVIEW_FAILED: "Die Bestätigung konnte nicht gespeichert werden.", REVIEW_NOT_AVAILABLE: "Dieses Dokument ist noch nicht bereit zur Bestätigung.",
}

function normalizeError(code: unknown) { return typeof code === "string" ? messages[code] ?? code : "Die Aktion konnte nicht abgeschlossen werden." }
function factsRecord(analysis: DemoAnalysis) { return Object.fromEntries(analysis.facts.map((fact) => [fact.label, { value: fact.value, confidence: fact.confidence }])) }

export function HomeOfficeWorkspace() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [selected, setSelected] = useState<IntakeDocument | null>(null)
  const [stored, setStored] = useState<StoredDocument | null>(null)
  const [analysis, setAnalysis] = useState<DemoAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>("idle")
  const busy = step === "uploading" || step === "analyzing"
  const reset = () => { setSelected(null); setStored(null); setAnalysis(null); setError(null); setStep("idle") }
  const selectFile = (document: IntakeDocument) => { setError(document.type === "error" ? normalizeError(document.name) : null); setSelected(document.type === "error" ? null : document); setStored(null); setAnalysis(null); setStep("idle") }
  const updateText = (text: string) => setSelected((current) => current ? { ...current, text } : current)

  async function analyze() {
    if (!selected?.file || !selected.text.trim()) return
    setError(null); setStep("uploading")
    try {
      const form = new FormData(); form.append("file", selected.file)
      const uploadResponse = await fetch("/api/documents/upload", { method: "POST", body: form })
      const uploadPayload = await uploadResponse.json().catch(() => ({}))
      if (!uploadResponse.ok) throw new Error(normalizeError(uploadPayload.code))
      const document = uploadPayload.document as StoredDocument
      setStored(document); setStep("analyzing")
      const analyzeResponse = await fetch("/api/documents/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: document.id, text: selected.text }) })
      const analyzePayload = await analyzeResponse.json().catch(() => ({}))
      if (!analyzeResponse.ok) throw new Error(normalizeError(analyzePayload.code))
      setAnalysis(analyzePayload.analysis as DemoAnalysis); setStep("needs_review")
    } catch (cause) { setError(cause instanceof Error ? cause.message : normalizeError(null)); setStep("idle") }
  }

  async function confirmReview() {
    if (!stored || !analysis) return
    setError(null)
    try {
      const response = await fetch("/api/documents/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: stored.id, facts: factsRecord(analysis), confirm: true }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(normalizeError(payload.code))
      setStored((current) => current ? { ...current, status: "processed" } : current); setStep("reviewed")
    } catch (cause) { setError(cause instanceof Error ? cause.message : normalizeError("REVIEW_FAILED")) }
  }

  return <WorkspacePage><div className="flex flex-col gap-8"><section aria-labelledby="home-office-title" className="border-b border-border pb-8"><span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" /></span><h1 id="home-office-title" className="mt-5 text-3xl font-semibold tracking-tight">{de ? "Dokumentenprüfung" : "Проверка на документи"}</h1><p className="mt-3 max-w-2xl text-pretty leading-7 text-muted-foreground">{de ? "Dokument speichern, Text prüfen lassen, Fakten kontrollieren und erst nach deiner Bestätigung abschließen." : "Съхрани документ, провери текста, контролирай фактите и завърши едва след твоето потвърждение."}</p></section><section className="border-y border-border py-8" aria-labelledby="ai-roadmap-title"><p className="nm-kicker">{de ? "So arbeitet HORIZON" : "Как работи HORIZON"}</p><h2 id="ai-roadmap-title" className="mt-3 text-2xl font-semibold tracking-tight">{de ? "Schritt für Schritt, mit deiner Bestätigung." : "Стъпка по стъпка, с твоето потвърждение."}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{de ? "HORIZON schlägt vor, du bestätigst. Jeder Schritt bleibt nachvollziehbar und nichts wird ohne deine Freigabe weitergegeben." : "HORIZON предлага, ти потвърждаваш. Всяка стъпка остава проследима и нищо не се предава без твоето одобрение."}</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{(de ? [["1", "Dokument hochladen", "PDF, JPG oder PNG werden geprüft und sicher gespeichert."], ["2", "Automatisch vorbereiten", "HORIZON erstellt einen Vorschlag, keine Entscheidung."], ["3", "Fakten prüfen", "Du kontrollierst jede Angabe und änderst sie bei Bedarf."], ["4", "Selbst bestätigen", "Erst nach deiner Bestätigung gelten die Angaben als gesichert."], ["5", "Nächsten Schritt sehen", "Du behältst die Kontrolle über alles Weitere."]] : [["1", "Качване на документ", "PDF, JPG или PNG се проверяват и съхраняват сигурно."], ["2", "Автоматична подготовка", "HORIZON прави предложение, не решение."], ["3", "Проверка на фактите", "Ти контролираш всяка стойност и я променяш при нужда."], ["4", "Твоето потвърждение", "Едва след потвърждение данните се считат за сигурни."], ["5", "Следваща стъпка", "Запазваш контрола върху всичко останало."]]).map(([stage, title, output]) => <div key={stage} className="rounded-md border border-border bg-card p-4"><p className="font-mono text-xs text-muted-foreground">{stage}</p><h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{output}</p></div>)}</div></section><div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]"><div className="flex flex-col gap-5"><DocumentIntake document={selected} onSelect={selectFile} onTextChange={updateText} onAnalyze={analyze} canAnalyze={Boolean(selected?.file && selected.text.trim().length > 20)} isAnalyzed={Boolean(analysis)} error={error} busy={busy} mode="connected" /><section className="rounded-md border border-border bg-card p-6" aria-labelledby="assistant-status-title"><div className="flex items-center justify-between gap-4"><h2 id="assistant-status-title" className="font-semibold text-foreground">{de ? "Status" : "Състояние"}</h2><Button variant="ghost" size="sm" onClick={reset}>{de ? "Zurücksetzen" : "Нулирай"}</Button></div><ol className="mt-5 space-y-3 text-sm">{(de ? ["Datei validiert", "Sicher gespeichert", "Analyse erstellt", "Fakten bestätigt"] : ["Файлът е проверен", "Сигурно запазен", "Анализът е готов", "Фактите са потвърдени"]).map((label, index) => { const complete = index === 0 ? Boolean(selected) : index === 1 ? Boolean(stored) : index === 2 ? Boolean(analysis) : step === "reviewed"; return <li key={label} className="flex items-center gap-3"><CheckCircle2 className={`size-4 ${complete ? "text-success" : "text-muted-foreground"}`} aria-hidden="true" /><span className={complete ? "text-foreground" : "text-muted-foreground"}>{label}</span></li> })}</ol>{stored && <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">{de ? "Dokument-ID" : "ID на документа"}: {stored.id}</p>}</section></div><section className="rounded-md border border-border bg-card p-6" aria-labelledby="analysis-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{de ? "Prüfung durch dich bestätigt" : "Проверка, потвърдена от теб"}</p><h2 id="analysis-title" className="mt-2 font-semibold text-foreground">{de ? "Analyse und Faktenprüfung" : "Анализ и проверка на факти"}</h2></div>{selected && <Button variant="ghost" size="icon" aria-label={de ? "Ansicht zurücksetzen" : "Нулирай изгледа"} onClick={reset}><Trash2 className="size-4" aria-hidden="true" /></Button>}</div>{analysis ? <div className="mt-5 flex flex-col gap-5"><p className="border-l-2 border-primary bg-secondary p-4 text-sm leading-6 text-foreground">{analysis.summaryBg || analysis.summaryDe}</p><div className="grid gap-3 sm:grid-cols-2">{analysis.facts.map((fact) => <label key={fact.label} className="flex flex-col gap-1 text-sm text-muted-foreground">{fact.label}<input className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" value={fact.value} onChange={(event) => setAnalysis({ ...analysis, facts: analysis.facts.map((item) => item.label === fact.label ? { ...item, value: event.target.value } : item) })} /></label>)}</div><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-medium text-foreground">{de ? "Risiken" : "Рискове"}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="font-medium text-foreground">{de ? "Nächste Schritte" : "Следващи стъпки"}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{analysis.recommendedNextSteps.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="flex flex-wrap items-center gap-3"><Button onClick={confirmReview} disabled={step === "reviewed"}>{step === "reviewed" ? (de ? "Geprüft" : "Проверено") : (de ? "Fakten bestätigen" : "Потвърди фактите")}</Button><Badge variant={step === "reviewed" ? "default" : "secondary"}>{step === "reviewed" ? (de ? "Gespeichert" : "Запазено") : `${de ? "Sicherheit" : "Сигурност"} ${Math.round(analysis.confidence * 100)}%`}</Badge></div></div> : <div className="mt-8 rounded-md border border-dashed border-border p-8 text-center"><FileText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm leading-6 text-muted-foreground">{de ? "Lade ein Dokument hoch und füge den relevanten Text ein. Der Assistent speichert Fakten erst nach deiner Prüfung." : "Качи документ и постави релевантния текст. Асистентът запазва факти едва след твоята проверка."}</p></div>}</section></div></div></WorkspacePage>
}
