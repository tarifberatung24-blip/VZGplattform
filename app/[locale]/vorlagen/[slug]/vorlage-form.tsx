"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Download, Loader2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { renderVorlagePdf } from "@/lib/horizon/vorlagen/pdf"
import { findVorlage } from "@/lib/horizon/vorlagen"
import type { Locale } from "@/lib/i18n/dictionaries"
import type { VorlageFacts } from "@/lib/horizon/vorlagen"

/**
 * The form, the live preview and the download, in one client component.
 *
 * Everything happens in the browser. A template's `build` is a pure function and
 * the PDF writer is plain JavaScript, so the reader sees the finished German letter
 * while typing and can save it without anything being sent anywhere. That is the
 * difference from a page that offers a blank PDF: there the reader has to invent
 * the German, here the letter is already written, and their data never leaves the
 * page until they choose to send it.
 *
 * The preview is built by the *same* function the download uses, so what the reader
 * reads is what they get. Two implementations — one for the preview, one for the
 * file — would eventually disagree, and the reader would sign the wrong one.
 */

type Props = {
  slug: string
  locale: Locale
}

const copy = {
  bg: {
    preview: "Преглед на писмото",
    previewHint: "Това е писмото, което ще изтеглиш. Обновява се, докато пишеш.",
    download: "Изтегли като PDF",
    preparing: "Подготвям…",
    missing: "Липсващи данни",
    missingHint: "Тези полета са празни. Писмото е съставено без тях — попълни ги, ако искаш да влязат.",
    unsupported:
      "Някои знаци не могат да се отпечатат в PDF (например кирилица в името). Изтегли текста и го попълни на ръка, или напиши името с латински букви за PDF.",
    empty: "Попълни полетата, за да видиш писмото.",
    required: "задължително",
    error: "PDF не можа да се създаде.",
    copy: "Копирай текста",
    copied: "Копирано",
    copyFailed: "Копирането не успя. Маркирай текста и го копирай ръчно.",
  },
  de: {
    preview: "Briefvorschau",
    previewHint: "Das ist der Brief, den du herunterlädst. Er aktualisiert sich beim Tippen.",
    download: "Als PDF herunterladen",
    preparing: "Wird erstellt…",
    missing: "Fehlende Angaben",
    missingHint: "Diese Felder sind leer. Der Brief wurde ohne sie erstellt – ausfüllen, wenn sie hinein sollen.",
    unsupported:
      "Einige Zeichen lassen sich im PDF nicht darstellen (z. B. kyrillische Namen). Text kopieren und von Hand einsetzen, oder den Namen im PDF lateinisch schreiben.",
    empty: "Felder ausfüllen, um den Brief zu sehen.",
    required: "Pflichtfeld",
    error: "PDF konnte nicht erstellt werden.",
    copy: "Text kopieren",
    copied: "Kopiert",
    copyFailed: "Kopieren fehlgeschlagen. Text markieren und von Hand kopieren.",
  },
} as const

export function VorlageForm({ slug, locale }: Props) {
  const template = findVorlage(slug)
  const [facts, setFacts] = useState<VorlageFacts>({})
  const [busy, setBusy] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const text = copy[locale]

  // Rebuilt on every keystroke: the builder is string manipulation over a handful
  // of fields, so there is nothing worth deferring here, and a stale preview is the
  // one thing this component must not show.
  const letter = useMemo(() => (template ? template.build(facts) : null), [template, facts])

  if (!template) return null

  const setField = (key: string, value: string) => {
    setFacts((current) => ({ ...current, [key]: value }))
  }

  const missingLabels = (letter?.omittedFactKeys ?? []).map(
    (key) => template.fields.find((field) => field.key === key)?.label[locale] ?? key,
  )

  async function copyText() {
    if (!letter) return
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(letter.body)
      setCopied(true)
      // Reset the acknowledgement so the button returns to its normal label and
      // the next copy is not a silent no-op the reader cannot see.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access is denied in some browsers and in insecure contexts, so
      // this is a real path rather than an impossible one.
      setCopyError(true)
    }
  }

  async function download() {
    if (!template) return
    setBusy(true)
    setPdfError(null)
    try {
      // The letter's own date pins the PDF's metadata, so the same input produces
      // the same file rather than one that changes with the wall clock.
      const letterDateIso = facts.letter_date?.trim() || new Date().toISOString().slice(0, 10)
      const result = await renderVorlagePdf({ template, facts, letterDateIso })
      if (!result.ok) {
        setPdfError(result.detail === "unsupported_characters" ? text.unsupported : text.error)
        return
      }
      const blob = new Blob([result.bytes as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${template.slug}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        {template.fields.map((field) => {
          const id = `field-${field.key}`
          return (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={id} className="flex items-center gap-2">
                {field.label[locale]}
                {field.required && <span className="text-xs font-normal text-muted-foreground">({text.required})</span>}
              </Label>
              {field.kind === "multiline" ? (
                <Textarea
                  id={id}
                  rows={3}
                  value={facts[field.key] ?? ""}
                  onChange={(event) => setField(field.key, event.target.value)}
                  placeholder={field.placeholder?.[locale]}
                />
              ) : (
                <Input
                  id={id}
                  type={field.kind === "date" ? "date" : "text"}
                  value={facts[field.key] ?? ""}
                  onChange={(event) => setField(field.key, event.target.value)}
                  placeholder={field.placeholder?.[locale]}
                />
              )}
              {field.hint && <p className="text-xs leading-5 text-muted-foreground">{field.hint[locale]}</p>}
            </div>
          )
        })}
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{text.preview}</h2>
          <div className="flex gap-2">
            <Button onClick={copyText} disabled={!letter} size="sm" variant="outline">
              {copied ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {copied ? text.copied : text.copy}
            </Button>
            <Button onClick={download} disabled={busy} size="sm">
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-3.5" aria-hidden="true" />
              )}
              {busy ? text.preparing : text.download}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.previewHint}</p>

        {copyError && (
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            {text.copyFailed}
          </p>
        )}

        {pdfError && (
          <p className="mt-4 flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-5">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
            <span>{pdfError}</span>
          </p>
        )}

        {missingLabels.length > 0 && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold">{text.missing}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.missingHint}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {missingLabels.map((label) => (
                <li key={label} className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-4 font-mono text-xs leading-6">
          {letter && letter.body.trim().length > 0 ? letter.body : text.empty}
        </pre>
      </div>
    </div>
  )
}
