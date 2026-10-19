"use client"

import { useState } from "react"
import { Copy, FileText, Loader2, RotateCcw, Send } from "lucide-react"
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

  const errorMessage = output && !("loading" in output) && "error" in output
    ? getErrorMessage(isBg, output.code)
    : null

  return (
    <section className="paper flex flex-col gap-10 p-8 md:p-10">
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit(event)
        }}
      >
        <label className="flex flex-col gap-3">
          <span className="text-sm font-medium">
            {isBg ? "Какво трябва да пише в писмото?" : "Was soll im Brief stehen?"}
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={8}
            className="h-40 resize-y rounded-sm border border-border bg-background px-4 py-3 text-sm leading-7 placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            placeholder={
              isBg
                ? "Опиши накратко ситуацията и какво искаш да попиташ или поискаш..."
                : "Beschreibe kurz die Situation und was du fragen oder beantragen möchtest..."
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
            className="h-11 rounded-sm border border-border bg-background px-4 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
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
            <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={!!letter}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-none transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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

          {letter && (
            <button
              type="button"
              onClick={() => {
                setDescription("")
                setOutput(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <RotateCcw className="size-4" />
              {isBg ? "Подготви друго писмо" : "Weiteren Brief vorbereiten"}
            </button>
          )}
        </div>
      </form>


      {output && "german" in output && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            <LetterCard
              label={isBg ? "Немска версия" : "Deutsche Version"}
              content={output.german}
              onCopy={copyGerman}
              copyLabel={isBg ? "Копирай" : "Kopieren"}
            />
            <LetterCard
              label={isBg ? "Български превод" : "Bulgarische Übersetzung"}
              content={output.bulgarian}
              onCopy={null}
              placeholder={isBg ? "Преводът ще се появи тук." : "Die Übersetzung erscheint hier."}
            />
          </div>

          <div className="paper paper-inset flex flex-col gap-2 p-5 text-sm text-muted-foreground">
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
  copyLabel,
  placeholder,
}: {
  label: string
  content: string
  onCopy: (() => void) | null
  copyLabel?: string
  placeholder?: string
}) {
  const isEmpty = content.trim().length === 0
  const displayContent = isEmpty && placeholder ? placeholder : content

  return (
    <div className="flex flex-col gap-4 bg-card p-5">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-foreground">{label}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Copy className="size-3.5" />
            {copyLabel}
          </button>
        )}
      </div>
      <div className="paper paper-inset max-h-96 overflow-auto p-5 text-sm leading-7 whitespace-pre-wrap break-words">
        {displayContent}
      </div>
    </div>
  )
}

function getErrorMessage(isBg: boolean, code?: string) {
  if (code === "AUTHENTICATION_REQUIRED") {
    return isBg
      ? "Сесията ти е изтекла. Влез отново и опитай пак."
      : "Deine Sitzung ist abgelaufen. Melde dich erneut an und versuche es noch einmal."
  }
  if (code === "RATE_LIMITED") {
    return isBg
      ? "Направени са твърде много опити. Изчакай малко и опитай отново."
      : "Zu viele Versuche. Warte kurz und versuche es erneut."
  }
  return isBg
    ? "Писмото не беше създадено. Опитай отново след малко."
    : "Der Brief konnte nicht erstellt werden. Versuche es gleich noch einmal."
}
