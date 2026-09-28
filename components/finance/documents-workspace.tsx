"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

type StoredDocument = {
  id: string
  original_filename: string
  mime_type: string | null
  size_bytes: number | null
  processing_status: string | null
  created_at: string | null
}

const statusLabel: Record<string, { bg: string; de: string }> = {
  uploaded: { bg: "Качено", de: "Hochgeladen" },
  awaiting_analysis: { bg: "В опашка за ръчна проверка", de: "Wartet auf manuelle Prüfung" },
  needs_review: { bg: "Нужна е проверка", de: "Prüfung erforderlich" },
  processed: { bg: "Обработено", de: "Verarbeitet" },
  failed: { bg: "Неуспешно", de: "Fehlgeschlagen" },
  analysis_not_configured: { bg: "Проверката не е конфигурирана", de: "Prüfung nicht konfiguriert" },
}

const errorLabel: Record<string, { bg: string; de: string }> = {
  FILE_TYPE_NOT_ALLOWED: { bg: "Позволени са само PDF, JPG или PNG.", de: "Nur PDF, JPG oder PNG sind erlaubt." },
  FILE_TOO_LARGE: { bg: "Файлът е по-голям от 10 MB.", de: "Die Datei ist größer als 10 MB." },
  FILE_EMPTY: { bg: "Файлът е празен.", de: "Die Datei ist leer." },
  FILE_INVALID_SIGNATURE: { bg: "Файлът не съвпада с очаквания формат.", de: "Die Datei passt nicht zum erwarteten Format." },
  STORAGE_NOT_CONFIGURED: { bg: "Supabase Storage не е свързан правилно.", de: "Supabase Storage ist nicht korrekt verbunden." },
  SCHEMA_NOT_VERIFIED: { bg: "Supabase схемата не е проверена.", de: "Das Supabase-Schema ist nicht verifiziert." },
}

export function DocumentsWorkspace({ initialDocuments, loadError }: { initialDocuments: StoredDocument[]; loadError?: string | null }) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [documents, setDocuments] = useState(initialDocuments)
  const [message, setMessage] = useState(loadError ?? "")
  const [uploading, setUploading] = useState(false)

  function localize(labels: Record<string, { bg: string; de: string }>, code: string) {
    return labels[code]?.[de ? "de" : "bg"] ?? code
  }

  async function upload(file?: File) {
    if (!file) return
    setUploading(true)
    setMessage("")
    const form = new FormData()
    form.append("file", file)
    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: form })
      const payload = await response.json().catch(() => ({})) as { code?: string; document?: { id: string; name: string; type: string; size: number; status: string } }
      if (!response.ok || !payload.document) {
        setMessage(errorLabel[payload.code ?? ""] ? localize(errorLabel, payload.code ?? "") : (payload.code ?? "UPLOAD_FAILED"))
        return
      }
      setDocuments((current) => [{ id: payload.document!.id, original_filename: payload.document!.name, mime_type: payload.document!.type, size_bytes: payload.document!.size, processing_status: payload.document!.status, created_at: new Date().toISOString() }, ...current])
      setMessage(de ? "Dokument gespeichert. Es kann jetzt für eine manuelle Angebots- oder Vertragsprüfung genutzt werden." : "Документът е запазен. Може да се използва за ръчна проверка на оферта или договор.")
    } catch {
      setMessage("UPLOAD_NETWORK_ERROR")
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="kintex-panel p-6" aria-labelledby="documents-workspace-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{de ? "Dokumente" : "Документи"}</p>
          <h2 id="documents-workspace-title" className="mt-2 text-2xl font-semibold text-foreground">{de ? "Dokumentenbereich" : "Документна зона"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{de ? "Echte Speicherung in Supabase Storage. Die Dokumente dienen der manuellen Prüfung von Angebot, Tarif oder Vertrag." : "Реално съхранение в Supabase Storage. Документите служат за ръчна проверка на оферта, тарифа или договор."}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Upload className="size-4" aria-hidden="true" />{uploading ? (de ? "Wird hochgeladen…" : "Качване…") : (de ? "Hochladen" : "Качи")}
          <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {message && <p role="status" className="mt-5 border border-border bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
      <div className="mt-6 divide-y divide-border border-y border-border">
        {documents.length === 0 ? <p className="py-6 text-sm text-muted-foreground">{de ? "Es wurden noch keine Dokumente hochgeladen." : "Все още няма качени документи."}</p> : documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3"><FileText className="size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{document.original_filename}</p><p className="text-xs text-muted-foreground">{document.size_bytes ? `${Math.round(document.size_bytes / 1024)} KB` : (de ? "Größe unbekannt" : "размерът е неизвестен")}</p></div></div>
            <span className="shrink-0 border border-border px-2 py-1 text-xs text-muted-foreground">{statusLabel[document.processing_status ?? ""] ? localize(statusLabel, document.processing_status ?? "") : (document.processing_status ?? (de ? "Hochgeladen" : "Качено"))}</span>
          </div>
        ))}
      </div>
      <Button asChild variant="outline" className="mt-5 h-auto max-w-full whitespace-normal py-2.5 text-center"><Link href="/zayavka">{de ? "Dokumentenprüfung anfragen" : "Заяви проверка по документ"}</Link></Button>
    </section>
  )
}
