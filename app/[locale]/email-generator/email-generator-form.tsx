"use client"

import { useState } from "react"
import { Copy, FileText, Loader2, Send } from "lucide-react"
import { requestLetter, type LetterResult, type Recipient } from "./generate-letter-client"

type OutputState =
  | null
  | { loading: true }
  | LetterResult

export function EmailGeneratorForm({ locale }: { locale: string }) {
  const isBg = locale === "bg"
  const [description, setDescription] = useState("")
  const [recipient, setRecipient] = useState<Recipient>("Finanzamt")
  const [output, setOutput] = useState<OutputState>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOutput({ loading: true })
    const result = await requestLetter({ description, recipient, locale })
    setOutput(result)
  }

  const copyGerman = async () => {
    if (!output || "loading" in output || "error" in output) return
    if (!("german" in output)) return
    try {
      await navigator.clipboard.writeText(output.german)
    } catch {
      // no-op on clip failure
    }
  }

  const isLetterResult = output && "german" in output && !("loading" in output)
  const letter = isLetterResult ? output : null

  return (
    <section className="flex flex-col gap-8 rounded-2xl border border-border/60 bg-card/40 bg-slate-950/40 backdrop-blur p-6 shadow-sm">
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit(event)
        }}
      >
        <label className="flex flex-col gap-3">
          <span className="text-sm font-medium">
            {isBg ? "Вашето запитване (на български)" : "Ihre Anfrage (bulgarisch)"}
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={8}
            className="h-32 resize-y rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            placeholder={
              isBg
                ? "Опишете пократко ситуацията и какво искате да поискате или да попитате от администрацията..."
                : "Beschreiben Sie kurz die Situation und was Sie von der Behörde wissen oder beantragen möchten..."
            }
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {isBg ? "Получател" : "Empfänger"}
          </span>
          <select
            value={recipient}
            onChange={(event) => setRecipient(event.target.value as Recipient)}
            className="h-11 rounded-xl border border-border bg-muted/20 px-4 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            <option value="Finanzamt">Finanzamt</option>
            <option value="Jobcenter">Jobcenter</option>
            <option value="Familienkasse">Familienkasse</option>
            <option value="Health Insurance">Health Insurance</option>
            <option value="Other">Other / Allgemein</option>
          </select>
        </div>

        <div className="flex flex-col gap-3">
          {output && "loading" in output && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {isBg ? "Генерация на писмо..." : "Brief wird generiert..."}
            </div>
          )}

          {output && !("loading" in output) && "error" in output && (
            <p className="text-sm text-foreground">
              {isBg
                ? "Неуспешно генериране. Можете да опитате отново."
                : "Erstellung fehlgeschlagen. Sie können es erneut versuchen."}
              {("message" in output) && output.message ? ` (${output.message})` : ""}
            </p>
          )}

          <button
            type="submit"
            disabled={!!letter}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {output && "german" in output ? (
              <>
                <FileText className="size-4" />
                {isBg ? "Писмото е готово" : "Brief bereit"}
              </>
            ) : (
              <>
                <Send className="size-4" />
                {isBg ? "Генерирай писмо" : "Brief generieren"}
              </>
            )}
          </button>
        </div>
      </form>


      {output && "german" in output && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <LetterCard
              label={isBg ? "Немски版本" : "Deutsche Version"}
              content={output.german}
              onCopy={copyGerman}
            />
            <LetterCard
              label={isBg ? "Български превод" : "Bulgarische Übersetzung"}
              content={output.bulgarian}
              onCopy={null}
              placeholder={isBg ? "Преводът ще се появи тук." : "Die Übersetzung erscheint hier."}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {isBg ? "Използвани заместители:" : "Verwendete Platzhalter:"}
            </span>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {isBg ? (
                <>
                  <li>Име: {output.placeholders.name}</li>
                  <li>Адрес: {output.placeholders.address}</li>
                  <li>Дата: {output.placeholders.date}</li>
                  <li>Номер на клиента: {output.placeholders.customerNumber}</li>
                </>
              ) : (
                <>
                  <li>Name: {output.placeholders.name}</li>
                  <li>Adresse: {output.placeholders.address}</li>
                  <li>Datum: {output.placeholders.date}</li>
                  <li>Kundennummer: {output.placeholders.customerNumber}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

function LetterCard({
  label,
  content,
  onCopy,
  placeholder,
}: {
  label: string
  content: string
  onCopy: (() => void) | null
  placeholder?: string
}) {
  const isEmpty = content.trim().length === 0
  const displayContent = isEmpty && placeholder ? placeholder : content

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-foreground">{label}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Copy className="size-3.5" />
            Kopieren
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-auto rounded-lg bg-card/40 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {displayContent}
      </div>
    </div>
  )
}
