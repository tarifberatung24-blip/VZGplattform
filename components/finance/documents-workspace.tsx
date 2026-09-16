"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

type StoredDocument = {
  id: string
  original_filename: string
  mime_type: string | null
  size_bytes: number | null
  processing_status: string | null
  created_at: string | null
}

const statusLabel: Record<string, string> = {
  uploaded: "Uploaded",
  awaiting_analysis: "Awaiting analysis",
  needs_review: "Needs review",
  processed: "Processed",
  failed: "Failed",
  analysis_not_configured: "AI not configured",
}

const errorLabel: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: "Nur PDF, JPG oder PNG sind erlaubt.",
  FILE_TOO_LARGE: "Die Datei ist größer als 10 MB.",
  FILE_EMPTY: "Die Datei ist leer.",
  FILE_INVALID_SIGNATURE: "Die Datei passt nicht zum erwarteten Format.",
  STORAGE_NOT_CONFIGURED: "Supabase Storage ist nicht korrekt verbunden.",
  SCHEMA_NOT_VERIFIED: "Supabase Schema ist nicht verifiziert.",
}

export function DocumentsWorkspace({ initialDocuments, loadError }: { initialDocuments: StoredDocument[]; loadError?: string | null }) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [message, setMessage] = useState(loadError ?? "")
  const [uploading, setUploading] = useState(false)

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
        setMessage(errorLabel[payload.code ?? ""] ?? payload.code ?? "UPLOAD_FAILED")
        return
      }
      setDocuments((current) => [{ id: payload.document!.id, original_filename: payload.document!.name, mime_type: payload.document!.type, size_bytes: payload.document!.size, processing_status: payload.document!.status, created_at: new Date().toISOString() }, ...current])
      setMessage("Dokument gespeichert. Für AI-Prüfung öffne den Assistant.")
    } catch {
      setMessage("UPLOAD_NETWORK_ERROR")
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="border border-border bg-card p-6" aria-labelledby="documents-workspace-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Documents</p>
          <h2 id="documents-workspace-title" className="mt-2 text-2xl font-semibold text-foreground">Документна зона</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Реално съхранение в Supabase Storage. AI анализът се стартира от AI Home Office Assistant след потребителско потвърждение.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Upload className="size-4" aria-hidden="true" />{uploading ? "Uploading…" : "Upload"}
          <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {message && <p role="status" className="mt-5 border border-border bg-secondary p-3 text-sm text-muted-foreground">{message}</p>}
      <div className="mt-6 divide-y divide-border border-y border-border">
        {documents.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Все още няма качени документи.</p> : documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3"><FileText className="size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{document.original_filename}</p><p className="text-xs text-muted-foreground">{document.size_bytes ? `${Math.round(document.size_bytes / 1024)} KB` : "size unknown"}</p></div></div>
            <span className="shrink-0 border border-border px-2 py-1 text-xs text-muted-foreground">{statusLabel[document.processing_status ?? ""] ?? document.processing_status ?? "Uploaded"}</span>
          </div>
        ))}
      </div>
      <Button asChild variant="outline" className="mt-5"><Link href="/protected/home-office">Open AI Assistant</Link></Button>
    </section>
  )
}
