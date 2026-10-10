"use client"

import { useRef, useState } from "react"
import { FileUp, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { Textarea } from "@/components/ui/textarea"
import { validateDocument, DocumentValidationError } from "@/lib/documents/validation"
import { BrandText } from "@/components/brand/horizon-wordmark"

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
  const { t, locale } = useLanguage()
  const de = locale === "de"
  const copy = de
    ? { title: "Dokument hinzufügen", badge: "Geschützt gespeichert", badgeDemo: "Lokaler Vorschaumodus", bodyConnected: "PDF, JPG oder PNG werden im geschützten Dokumentbereich gespeichert. Ausgewählte Inhalte können für die angeforderte Analyse an einen AI-Anbieter übermittelt werden; das Ergebnis wird in HORIZON gespeichert. Bitte keine unnötigen sensiblen Daten hochladen. Dokumente und Ergebnisse werden innerhalb von 30 Tagen nach Kontolöschung aus dem aktiven System entfernt, sofern keine gesetzliche Aufbewahrung entgegensteht.", bodyDemo: "PDF, JPG oder PNG bleiben nur in dieser Vorschau und werden nicht übertragen.", drop: "Datei auswählen oder hierher ziehen", limits: "PDF, JPG oder PNG · maximal 10 MB", textLabel: "Relevanter Text für die Prüfung", textPlaceholder: "Füge hier den relevanten Text aus dem Dokument ein.", footer: "Geschützte Verarbeitung · Speicherung in privaten Speichern · du bestätigst Angaben vor der Speicherung." }
    : { title: "Добави документ", badge: "Сигурно съхранение", badgeDemo: "Локален режим на преглед", bodyConnected: "PDF, JPG или PNG се съхраняват в защитената зона за документи. Избрано съдържание може да бъде изпратено до AI доставчик за поискания анализ; резултатът се съхранява в HORIZON. Не качвай ненужни чувствителни данни. Документите и резултатите се изтриват от активната система в рамките на 30 дни след изтриване на акаунта, освен ако законово съхранение не възпрепятства това.", bodyDemo: "PDF, JPG или PNG остават само в този преглед и не се предават.", drop: "Избери файл или го плъзни тук", limits: "PDF, JPG или PNG · максимум 10 MB", textLabel: "Релевантен текст за проверката", textPlaceholder: "Постави тук релевантния текст от документа.", footer: "Защитена обработка · съхранение в частни хранилища · потвърждаваш данните преди запис." }

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
    <section className="rounded-md border border-border bg-card p-6" aria-labelledby="intake-title">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileUp aria-hidden="true" /></span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="intake-title" className="font-semibold text-foreground"><BrandText text={copy.title} /></h2>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{connected ? copy.badge : copy.badgeDemo}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{connected ? copy.bodyConnected : copy.bodyDemo}</p>
        </div>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button type="button" className={`mt-5 flex w-full flex-col items-center justify-center rounded-md border border-dashed border-border bg-background p-6 text-center transition ${dragging ? "border-primary bg-primary/5" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}>
        <p className="text-sm font-medium text-foreground">{document ? document.name : copy.drop}</p>
        <p className="mt-1 text-xs text-muted-foreground"><BrandText text={copy.limits} /></p>
      </button>
      {connected && document && document.type !== "error" && (
        <label className="mt-5 block text-sm font-medium text-foreground">
          <BrandText text={copy.textLabel} />
          <Textarea className="mt-2 min-h-36 resize-y" value={document.text} onChange={(event) => onTextChange?.(event.target.value)} placeholder={copy.textPlaceholder} />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-md shadow-none" onClick={() => inputRef.current?.click()}><BrandText text={t.cleanup.document.choose} /></Button>
        <Button type="button" className="rounded-md shadow-none" onClick={onAnalyze} disabled={!canAnalyze || isAnalyzed || busy}>{busy ? t.cleanup.document.checking : isAnalyzed ? t.cleanup.document.checked : t.cleanup.document.prepare}</Button>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-3.5" /><BrandText text={copy.footer} /></p>
    </section>
  )
}
