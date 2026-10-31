"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Info } from "lucide-react"
import type { UnterlagenState } from "@/lib/horizon/unterlagen/actions"
import { getUnterlagenCopy } from "@/lib/horizon/unterlagen/copy"
import { analyseDocumentText, DOCUMENT_KIND_FACT_KEY } from "@/lib/horizon/unterlagen/analysis"
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/horizon/unterlagen/classify"
import { locateEvidence, type EvidencePage } from "@/lib/horizon/unterlagen/evidence"
import { BrandText } from "@/components/brand/horizon-wordmark"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const initialState: UnterlagenState = { error: null, ok: false }

export type EvidenceSources = { pages: readonly EvidencePage[]; pastedTexts: readonly string[] }

type Fact = { key: string; value?: string | null; confirmedAt?: string | null }

function DocumentAnalysisInfoDialog({ locale, heading, description }: { locale: "bg" | "de"; heading: string; description: string }) {
  const [open, setOpen] = useState(false)
  const de = locale === "de"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-background text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={de ? "Wie diese Prüfung funktioniert" : "Как работи тази проверка"}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription className="pt-2 leading-6">{description}</DialogDescription>
          </DialogHeader>
          <Link
            href={`/${locale}/learning-center`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {de ? "Mehr lesen…" : "Прочети още…"}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * P16 — the "Unterlagen erklären" panel inside a case.
 *
 * Shows what was read out of the document and, just as importantly, what was not:
 * the classification with the phrase it rests on and a control to correct it, the
 * deadline with its evidence kind and quote, the risk state with its caveat, and
 * one next step. The user's correction is offered even when the engine is
 * confident, because the label is a machine reading and the user has the document.
 *
 * The analysis is computed from the stored page text; this component never
 * fabricates a value the engine did not derive.
 */
export function UnterlagenPanel({
  caseId,
  locale,
  module,
  documentText,
  facts,
  unconfirmedFactCount,
  evidenceSources,
}: {
  caseId: string
  locale: string
  module: string
  /** Combined extracted text of the case's documents, or "" when none. */
  documentText: string
  facts: readonly Fact[]
  unconfirmedFactCount: number
  /** The stored pages and pasted texts, so each quote can name its page. */
  evidenceSources?: EvidenceSources
}) {
  const router = useRouter()
  const [state, setState] = useState<UnterlagenState>(initialState)
  const [pending, setPending] = useState(false)
  const copy = getUnterlagenCopy(locale === "de" ? "de" : "bg")
  const de = locale === "de"

  if (module !== "unterlagen_erklaeren") return null

  const corrected = facts.find((fact) => fact.key === DOCUMENT_KIND_FACT_KEY && fact.confirmedAt)
  const correctedKind =
    corrected && (DOCUMENT_KINDS as readonly string[]).includes(String(corrected.value))
      ? (corrected.value as DocumentKind)
      : null

  const analysis = analyseDocumentText({
    text: documentText,
    correctedKind,
    unconfirmedFactCount,
  })

  const sources: EvidenceSources = evidenceSources ?? { pages: [], pastedTexts: [] }
  const whereFound = (quote: string | null) => {
    const location = locateEvidence(quote, sources)
    if (!location) return null
    const label =
      location.kind === "page"
        ? copy.evidenceOnPage(location.pageNo, location.documentName)
        : copy.evidenceInPastedText
    return <span className="ml-1 not-italic">({label})</span>
  }

  const errorText =
    state.error === "invalid_kind"
      ? copy.classificationUnclear
      : state.error === "unauthorized"
        ? copy.translateUnavailable
        : state.error === "case_not_found"
          ? copy.noExplanationYet
          : state.error
            ? copy.translateUnavailable
            : null

  async function confirmKind(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setPending(true)
    setState(initialState)
    try {
      const response = await fetch(`/api/horizon/cases/${caseId}/document-kind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: values.get("kind") }),
      })
      const payload = await response.json().catch(() => null) as UnterlagenState | null
      const nextState = payload && typeof payload.ok === "boolean"
        ? payload
        : { error: "failed" as const, ok: false }
      setState(nextState)
      if (nextState.ok) router.refresh()
    } catch {
      setState({ error: "failed", ok: false })
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="paper p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <BrandText text={copy.heading} />
        </h2>
        <DocumentAnalysisInfoDialog locale={de ? "de" : "bg"} heading={copy.heading} description={copy.intro} />
      </div>

      <div className="mt-3 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold"><BrandText text={copy.classificationHeading} /></p>
          <p className="text-sm font-medium"><BrandText text={copy.kinds[analysis.kind]} /></p>
          {analysis.kindEvidence ? (
            <p className="text-xs text-muted-foreground">
              {copy.classificationEvidence}: <span className="italic"><BrandText text={analysis.kindEvidence} /></span>
              {whereFound(analysis.kindEvidence)}
            </p>
          ) : <p className="text-xs text-muted-foreground">{de ? "Wähle die passende Art." : "Избери подходящия вид."}</p>}

          <form onSubmit={confirmKind} className="mt-2 space-y-2">
            <label htmlFor="document-kind" className="block text-xs font-medium">
              <BrandText text={copy.classificationCorrect} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="document-kind"
                name="kind"
                defaultValue={analysis.kind}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                {DOCUMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    <BrandText text={copy.kinds[kind]} />
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <BrandText text={copy.classificationCorrect} />
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold"><BrandText text={copy.deadlineHeading} /></p>
          <p className="text-sm font-medium"><BrandText text={copy.deadlineKinds[analysis.deadline.kind]} /></p>
          {analysis.deadline.date ? <p className="text-sm"><BrandText text={analysis.deadline.date} /></p> : null}
          {analysis.deadline.quote ? (
            <p className="text-xs text-muted-foreground">
              {copy.deadlineQuote}: <span className="italic"><BrandText text={analysis.deadline.quote} /></span>
              {whereFound(analysis.deadline.quote)}
            </p>
          ) : null}
          {analysis.deadline.requiresUserVerification && analysis.deadline.kind !== "unknown" ? (
            <p className="text-xs text-destructive"><BrandText text={copy.deadlineVerify} /></p>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold"><BrandText text={copy.riskHeading} /></p>
          <p className="text-xs text-muted-foreground"><BrandText text={copy.riskStates[analysis.risk.state]} /></p>
          {analysis.risk.signals.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold"><BrandText text={copy.riskSignalsHeading} /></p>
              <ul className="space-y-1">
                {analysis.risk.signals.map((signal) => (
                  <li key={signal.id} className="text-xs text-muted-foreground">
                    {copy.riskQuoteLabel}: <span className="italic"><BrandText text={signal.quote} /></span>
                    {whereFound(signal.quote)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold"><BrandText text={copy.nextActionHeading} /></p>
          <p className="text-sm font-medium"><BrandText text={copy.nextActions[analysis.nextAction]} /></p>
        </div>
      </div>

      {state.ok ? (
        <p role="status" className="mt-2 text-xs text-primary">
          {copy.classificationHeading}: {copy.kinds[analysis.kind]}
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {errorText}
        </p>
      ) : null}
    </section>
  )
}
