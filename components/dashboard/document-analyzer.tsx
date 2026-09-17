"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, FileSearch, Loader2, Upload } from "lucide-react"

export type DashboardDocument = {
  id: string
  original_filename: string
  processing_status: string | null
  created_at: string | null
  size_bytes: number | null
}

type Analysis = {
  summaryBg?: string
  documentType?: string
  deadline?: string
  amounts?: string[]
  risks?: string[]
  missingInformation?: string[]
  recommendedNextSteps?: string[]
  confidence?: number
}

const labels: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: "Позволени са само PDF, JPG и PNG файлове.",
  FILE_TOO_LARGE: "Файлът е по-голям от 10 MB.",
  FILE_EMPTY: "Файлът е празен.",
  FILE_INVALID_SIGNATURE: "Файлът не изглежда като валиден PDF или изображение.",
  OCR_NOT_CONFIGURED: "Този документ е сканиран. Нужно е OCR, преди да бъде анализиран.",
  AI_PROVIDER_NOT_CONFIGURED: "AI доставчикът не е конфигуриран на сървъра.",
  ANALYSIS_FAILED: "Анализът не завърши. Опитайте отново.",
  EXTRACTION_FAILED: "Не успяхме да прочетем текста от документа.",
}

function displayError(code?: string) {
  return (code && labels[code]) || code || "Възникна неочаквана грешка."
}

export function DocumentAnalyzer({ initialDocuments }: { initialDocuments: DashboardDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [selectedId, setSelectedId] = useState(initialDocuments[0]?.id ?? "")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [message, setMessage] = useState("")
  const [working, setWorking] = useState(false)

  async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { code?: string; analysis?: Analysis }
    if (!response.ok) throw new Error(payload.code || "REQUEST_FAILED")
    return payload
  }

  async function analyze(documentId: string) {
    setWorking(true)
    setMessage("")
    setAnalysis(null)
    setSelectedId(documentId)
    try {
      await postJson("/api/documents/extract", { documentId })
      const result = await postJson("/api/documents/analyze", { documentId })
      setAnalysis(result.analysis ?? null)
      setDocuments((current) => current.map((document) => document.id === documentId ? { ...document, processing_status: "needs_review" } : document))
    } catch (error) {
      setMessage(displayError(error instanceof Error ? error.message : undefined))
    } finally {
      setWorking(false)
    }
  }

  async function upload(file?: File) {
    if (!file) return
    setWorking(true)
    setMessage("")
    setAnalysis(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/documents/upload", { method: "POST", body: form })
      const payload = await response.json().catch(() => ({})) as { code?: string; document?: { id: string; name: string; size: number; status: string } }
      if (!response.ok || !payload.document) throw new Error(payload.code || "UPLOAD_FAILED")
      const document: DashboardDocument = {
        id: payload.document.id,
        original_filename: payload.document.name,
        processing_status: payload.document.status,
        created_at: new Date().toISOString(),
        size_bytes: payload.document.size,
      }
      setDocuments((current) => [document, ...current])
      setSelectedId(document.id)
      await analyze(document.id)
    } catch (error) {
      setMessage(displayError(error instanceof Error ? error.message : undefined))
      setWorking(false)
    }
  }

  return (
    <section className="mt-6 rounded-md border border-border bg-card p-4 shadow-none sm:p-5" aria-labelledby="document-analyzer-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/5 text-primary"><FileSearch className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">AI Document Analyzer</p>
            <h2 id="document-analyzer-title" className="mt-1 text-lg font-semibold">Анализ на документ на български</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Качи PDF или изображение. Първо извличаме текста, след това AI показва кратко резюме, срокове, суми и следващи стъпки. Всичко трябва да бъде проверено от човек.</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <Upload className="size-4" aria-hidden="true" />
          {working ? "Обработва се…" : "Качи и анализирай"}
          <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={working} onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>

      {documents.length > 0 && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="existing-document" className="text-sm font-medium">Избери качен документ</label>
          <select id="existing-document" value={selectedId} disabled={working} onChange={(event) => setSelectedId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm">
            {documents.map((document) => <option key={document.id} value={document.id}>{document.original_filename}</option>)}
          </select>
          <button type="button" disabled={!selectedId || working} onClick={() => analyze(selectedId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50">
            {working ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
            Анализирай
          </button>
        </div>
      )}

      {message && <div role="alert" className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message}</div>}

      {analysis && (
        <article className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Резултат</p><h3 className="mt-1 text-xl font-semibold">Предварителен преглед</h3></div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"><CheckCircle2 className="size-3.5" />{Math.round((analysis.confidence ?? 0) * 100)}% увереност</span>
          </div>
          <p className="mt-4 rounded-md bg-muted/60 p-4 text-sm leading-7">{analysis.summaryBg || "Няма генерирано резюме."}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><h4 className="text-sm font-semibold">Разпознати данни</h4><dl className="mt-2 space-y-2 text-sm text-muted-foreground"><div className="flex justify-between gap-3 border-b border-border/70 pb-2"><dt>Тип документ</dt><dd className="text-right text-foreground">{analysis.documentType || "Не е разпознат"}</dd></div><div className="flex justify-between gap-3 border-b border-border/70 pb-2"><dt>Срок</dt><dd className="text-right text-foreground">{analysis.deadline || "Не е разпознат"}</dd></div><div className="flex justify-between gap-3 border-b border-border/70 pb-2"><dt>Суми</dt><dd className="text-right text-foreground">{analysis.amounts?.join(", ") || "Няма"}</dd></div></dl></div>
            <div><h4 className="text-sm font-semibold">Следващи стъпки</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{(analysis.recommendedNextSteps?.length ? analysis.recommendedNextSteps : ["Провери резултата спрямо оригиналния документ."]).map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          {(analysis.risks?.length || analysis.missingInformation?.length) ? <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6"><h4 className="font-semibold">Внимание</h4><ul className="mt-2 list-disc space-y-1 pl-5">{[...(analysis.risks ?? []), ...(analysis.missingInformation ?? []).map((item) => `Липсва: ${item}`)].map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">AI резултатът е предварителен информационен преглед, а не данъчен, правен или финансов съвет. Провери оригинала и при важни срокове потърси квалифициран консултант.</p>
        </article>
      )}
    </section>
  )
}
