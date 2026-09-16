"use client"

import { useRef, useState } from "react"
import { FileUp, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { validateDocument, DocumentValidationError } from "@/lib/documents/validation"

export type IntakeDocument = { name: string; size: number; type: string; text: string; file?: File }

type Props = {
  document: IntakeDocument | null
  onSelect: (document: IntakeDocument) => void
  onTextChange?: (text: string) => void
  onAnalyze: () => void
  canAnalyze: boolean
  isAnalyzed: boolean
  error?: string | null
  busy?: boolean
  mode?: "demo" | "connected"
}

export function DocumentIntake({ document, onSelect, onTextChange, onAnalyze, canAnalyze, isAnalyzed, error, busy, mode = "demo" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const connected = mode === "connected"

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const metadata = await validateDocument(file)
      onSelect({ ...metadata, text: "", file })
    } catch (cause) {
      onSelect({ name: cause instanceof DocumentValidationError ? cause.code : "FILE_INVALID_SIGNATURE", size: 0, type: "error", text: "" })
    }
  }

  return (
    <section className="border border-border bg-card p-6" aria-labelledby="intake-title">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center bg-primary/10 text-primary"><FileUp aria-hidden="true" /></span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="intake-title" className="font-semibold text-foreground">Dokument hinzufügen</h2>
            <span className="border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{connected ? "Supabase + AI" : "Lokaler Demo-Modus"}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{connected ? "PDF, JPG oder PNG werden im geschützten Dokumentbereich gespeichert. Text für die AI-Prüfung wird bewusst separat bestätigt." : "PDF, JPG oder PNG bleiben nur in dieser Vorschau und werden nicht übertragen."}</p>
        </div>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button type="button" className={`mt-5 flex w-full flex-col items-center justify-center border border-dashed border-border bg-background p-6 text-center transition ${dragging ? "border-primary bg-primary/5" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}>
        <p className="text-sm font-medium text-foreground">{document ? document.name : "Datei auswählen oder hierher ziehen"}</p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, JPG oder PNG · maximal 10 MB</p>
      </button>
      {connected && document && document.type !== "error" && (
        <label className="mt-5 block text-sm font-medium text-foreground">
          Text für AI-Prüfung
          <Textarea className="mt-2 min-h-36 resize-y" value={document.text} onChange={(event) => onTextChange?.(event.target.value)} placeholder="Füge hier den relevanten Text aus dem Dokument ein. Die AI extrahiert Fakten, Risiken und nächste Schritte zur manuellen Prüfung." />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>Datei auswählen</Button>
        <Button type="button" onClick={onAnalyze} disabled={!canAnalyze || isAnalyzed || busy}>{busy ? "Analyse läuft …" : isAnalyzed ? "Analysiert" : "Analyze document"}</Button>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-3.5" />{connected ? "Geschützte Verarbeitung · Nutzer bestätigt Fakten vor Speicherung." : "Lokale Validierung · keine Supabase- oder AI-Anfrage."}</p>
    </section>
  )
}
