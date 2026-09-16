"use client"

import { useRef, useState } from "react"
import { FileUp, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { validateDocument, DocumentValidationError } from "@/lib/documents/validation"

export type IntakeDocument = { name: string; size: number; type: string; text: string; file?: File }
type Props = { document: IntakeDocument | null; onSelect: (document: IntakeDocument) => void; onAnalyze: () => void; canAnalyze: boolean; isAnalyzed: boolean; error?: string | null; busy?: boolean; mode?: "demo" | "connected" }

export function DocumentIntake({ document, onSelect, onAnalyze, canAnalyze, isAnalyzed, error, busy, mode = "demo" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const connected = mode === "connected"
  const handleFile = async (file?: File) => {
    if (!file) return
    try { const metadata = await validateDocument(file); onSelect({ ...metadata, text: "", file }) }
    catch (cause) { onSelect({ name: cause instanceof DocumentValidationError ? cause.code : "FILE_INVALID_SIGNATURE", size: 0, type: "error", text: "" }) }
  }
  return <section className="border border-border bg-card p-6" aria-labelledby="intake-title">
    <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center bg-primary/10 text-primary"><FileUp aria-hidden="true" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 id="intake-title" className="font-semibold text-foreground">Bescheid анализ</h2><span className="border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{connected ? "Supabase + Cerebras AI" : "Локален режим"}</span></div><p className="mt-1 text-sm leading-6 text-muted-foreground">Качи официално писмо от Finanzamt, Jobcenter, Familienkasse или друга институция. PDF текстът се извлича автоматично, а JPG/PNG се прочитат чрез Cerebras Vision.</p></div></div>
    <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => void handleFile(event.target.files?.[0])} />
    <button type="button" className={`mt-5 flex w-full flex-col items-center justify-center border border-dashed border-border bg-background p-8 text-center transition ${dragging ? "border-primary bg-primary/5" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}><p className="text-sm font-medium text-foreground">{document ? document.name : "Избери файл или го пусни тук"}</p><p className="mt-1 text-xs text-muted-foreground">PDF, JPG или PNG · максимум 10 MB</p></button>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>Избери файл</Button><Button type="button" onClick={onAnalyze} disabled={!canAnalyze || isAnalyzed || busy}>{busy ? "Анализът се извършва …" : isAnalyzed ? "Анализирано" : "Анализирай Bescheid"}</Button></div>
    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-3.5" />{connected ? "Файлът остава в защитеното пространство; резултатът е само screening и изисква човешка проверка." : "Локална валидация · няма AI заявка."}</p>
  </section>
}
