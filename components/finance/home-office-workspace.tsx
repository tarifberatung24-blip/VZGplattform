"use client"

import { useState } from "react"
import { CheckCircle2, FileText, ShieldCheck, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DocumentIntake, type IntakeDocument } from "./document-intake"
import type { DemoAnalysis } from "@/lib/home-office/types"

type StoredDocument = { id: string; name: string; size: number; type: string; status: string }
type Step = "idle" | "uploading" | "analyzing" | "needs_review" | "reviewed"
const messages: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: "Разрешени са само PDF, JPG и PNG.", FILE_TOO_LARGE: "Файлът е по-голям от 10 MB.", FILE_EMPTY: "Файлът е празен.", FILE_INVALID_SIGNATURE: "Файлът не съответства на заявения формат.", FILE_NAME_INVALID: "Името на файла е невалидно.", UPLOAD_NOT_AUTHENTICATED: "Влезте отново в профила си.", STORAGE_NOT_CONFIGURED: "Защитеното хранилище не е конфигурирано.", SCHEMA_NOT_VERIFIED: "Supabase schema не е потвърдена.", AI_PROVIDER_NOT_CONFIGURED: "CEREBRAS_API_KEY липсва в production environment-а.", DOCUMENT_TEXT_NOT_EXTRACTED: "PDF файлът няма извличаем текст. Качете по-ясно сканиране като JPG/PNG.", DOCUMENT_DOWNLOAD_FAILED: "Файлът не може да бъде прочетен от защитеното хранилище.", ANALYSIS_FAILED: "Анализът не можа да бъде завършен.", REVIEW_FAILED: "Потвърждението не можа да бъде запазено.", REVIEW_NOT_AVAILABLE: "Документът още не е готов за потвърждение.",
}
function normalizeError(code: unknown) { return typeof code === "string" ? messages[code] ?? code : "Действието не можа да бъде завършено." }
function factsRecord(analysis: DemoAnalysis) { return Object.fromEntries(analysis.facts.map((fact) => [fact.label, { value: fact.value, confidence: fact.confidence }])) }

export function HomeOfficeWorkspace() {
  const [selected, setSelected] = useState<IntakeDocument | null>(null)
  const [stored, setStored] = useState<StoredDocument | null>(null)
  const [analysis, setAnalysis] = useState<DemoAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>("idle")
  const busy = step === "uploading" || step === "analyzing"
  const reset = () => { setSelected(null); setStored(null); setAnalysis(null); setError(null); setStep("idle") }
  const selectFile = (document: IntakeDocument) => { setError(document.type === "error" ? normalizeError(document.name) : null); setSelected(document.type === "error" ? null : document); setStored(null); setAnalysis(null); setStep("idle") }
  async function analyze() {
    if (!selected?.file) return
    setError(null); setStep("uploading")
    try {
      const form = new FormData(); form.append("file", selected.file)
      const uploadResponse = await fetch("/api/documents/upload", { method: "POST", body: form })
      const uploadPayload = await uploadResponse.json().catch(() => ({}))
      if (!uploadResponse.ok) throw new Error(normalizeError(uploadPayload.code))
      const document = uploadPayload.document as StoredDocument; setStored(document); setStep("analyzing")
      const response = await fetch("/api/documents/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: document.id }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(normalizeError(payload.code))
      setAnalysis(payload.analysis as DemoAnalysis); setStep("needs_review")
    } catch (cause) { setError(cause instanceof Error ? cause.message : normalizeError(null)); setStep("idle") }
  }
  async function confirmReview() {
    if (!stored || !analysis) return
    setError(null)
    try { const response = await fetch("/api/documents/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: stored.id, facts: factsRecord(analysis), confirm: true }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(normalizeError(payload.code)); setStored((current) => current ? { ...current, status: "processed" } : current); setStep("reviewed") }
    catch (cause) { setError(cause instanceof Error ? cause.message : normalizeError("REVIEW_FAILED")) }
  }
  return <main className="min-h-screen bg-background"><div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 lg:px-12"><section aria-labelledby="bescheid-title" className="border-b border-border pb-8"><div className="flex flex-wrap items-center gap-3"><span className="flex size-11 items-center justify-center bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" /></span><Badge variant="secondary">Human-in-the-loop · Cerebras</Badge></div><h1 id="bescheid-title" className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Bescheid анализ</h1><p className="mt-3 max-w-3xl text-pretty leading-7 text-muted-foreground">Качи писмо от германска институция и получи разбираемо обяснение на български: какъв е документът, какъв е срокът, какво трябва да направиш и за каква сума става дума.</p></section><div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]"><div className="flex flex-col gap-5"><DocumentIntake document={selected} onSelect={selectFile} onAnalyze={analyze} canAnalyze={Boolean(selected?.file)} isAnalyzed={Boolean(analysis)} error={error} busy={busy} mode="connected" /><section className="border border-border bg-card p-6" aria-labelledby="status-title"><div className="flex items-center justify-between gap-4"><h2 id="status-title" className="font-semibold text-foreground">Статус</h2><Button variant="ghost" size="sm" onClick={reset}>Нулирай</Button></div><ol className="mt-5 space-y-3 text-sm">{["Файлът е валидиран", "Запазен защитено", "AI анализът е готов", "Фактите са потвърдени"].map((label, index) => { const complete = index === 0 ? Boolean(selected) : index === 1 ? Boolean(stored) : index === 2 ? Boolean(analysis) : step === "reviewed"; return <li key={label} className="flex items-center gap-3"><CheckCircle2 className={`size-4 ${complete ? "text-success" : "text-muted-foreground"}`} aria-hidden="true" /><span className={complete ? "text-foreground" : "text-muted-foreground"}>{label}</span></li> })}</ol>{stored && <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">Document ID: {stored.id}</p>}</section></div><section className="border border-border bg-card p-6" aria-labelledby="summary-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Document Summary Card</p><h2 id="summary-title" className="mt-2 text-xl font-semibold text-foreground">Твоят преглед</h2></div>{selected && <Button variant="ghost" size="icon" aria-label="Нулирай изгледа" onClick={reset}><Trash2 className="size-4" aria-hidden="true" /></Button>}</div>{analysis ? <div className="mt-5 flex flex-col gap-5"><p className="border-l-2 border-primary bg-secondary p-4 text-sm leading-6 text-foreground">{analysis.summaryBg}</p><div className="grid gap-3 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Срок (Frist)</p><p className="mt-2 font-semibold text-foreground">{analysis.deadline}</p><p className="mt-1 text-xs text-muted-foreground">Увереност: {Math.round(analysis.deadlineConfidence * 100)}%</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Какво да направиш</p><p className="mt-2 text-sm font-semibold text-foreground">{analysis.requiredAction}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Сума</p><p className="mt-2 font-semibold text-foreground">{analysis.amountInvolved}</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-medium text-foreground">Следващи стъпки</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{analysis.recommendedNextSteps.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div><div><h3 className="font-medium text-foreground">Рискове и липсващи данни</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{[...analysis.risks, ...analysis.missingInformation].map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div></div><details className="border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Покажи доказателствата от писмото</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{analysis.evidenceSnippets.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></details><div className="flex flex-wrap items-center gap-3"><Button onClick={confirmReview} disabled={step === "reviewed"}>{step === "reviewed" ? "Потвърдено" : "Потвърди фактите"}</Button><Badge variant={step === "reviewed" ? "default" : "secondary"}>{step === "reviewed" ? "Запазено" : `Обща увереност ${Math.round(analysis.confidence * 100)}%`}</Badge></div><p className="text-xs leading-5 text-muted-foreground">Това е автоматичен screening, не е данъчен или правен съвет. Провери оригиналното писмо и се консултирай със специалист преди действие.</p></div> : <div className="mt-8 border border-dashed border-border p-8 text-center"><FileText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm leading-6 text-muted-foreground">Качи документ, за да видиш summary card-а. Не оставяй важен срок само на AI — провери оригинала.</p></div>}</section></div></div></main>
}
