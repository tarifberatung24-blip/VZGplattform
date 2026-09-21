"use client"

import { useActionState } from "react"
import { confirmDocumentKind, type UnterlagenState } from "@/lib/horizon/unterlagen/actions"
import { getUnterlagenCopy } from "@/lib/horizon/unterlagen/copy"
import { analyseDocumentText, DOCUMENT_KIND_FACT_KEY } from "@/lib/horizon/unterlagen/analysis"
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/horizon/unterlagen/classify"

const initialState: UnterlagenState = { error: null, ok: false }

type Fact = { key: string; value?: string | null; confirmedAt?: string | null }

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
}: {
  caseId: string
  locale: string
  module: string
  /** Combined extracted text of the case's documents, or "" when none. */
  documentText: string
  facts: readonly Fact[]
  unconfirmedFactCount: number
}) {
  const [state, action, pending] = useActionState(confirmDocumentKind, initialState)
  const copy = getUnterlagenCopy(locale === "de" ? "de" : "bg")

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

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {copy.heading}
      </h2>
      <p className="mt-3 text-xs text-muted-foreground">{copy.intro}</p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold">{copy.classificationHeading}</p>
          <p className="text-sm font-medium">{copy.kinds[analysis.kind]}</p>
          {analysis.kindEvidence ? (
            <p className="text-xs text-muted-foreground">
              {copy.classificationEvidence}: <span className="italic">{analysis.kindEvidence}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.classificationUnclear}</p>
          )}

          <form action={action} className="mt-2 space-y-2">
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="document-kind" className="block text-xs font-medium">
              {copy.classificationCorrect}
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
                    {copy.kinds[kind]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {copy.classificationCorrect}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold">{copy.deadlineHeading}</p>
          <p className="text-sm font-medium">{copy.deadlineKinds[analysis.deadline.kind]}</p>
          {analysis.deadline.date ? <p className="text-sm">{analysis.deadline.date}</p> : null}
          {analysis.deadline.quote ? (
            <p className="text-xs text-muted-foreground">
              {copy.deadlineQuote}: <span className="italic">{analysis.deadline.quote}</span>
            </p>
          ) : null}
          {analysis.deadline.rule ? (
            <p className="text-xs text-muted-foreground">
              {copy.deadlineRule}: {analysis.deadline.rule}
            </p>
          ) : null}
          {analysis.deadline.requiresUserVerification && analysis.deadline.kind !== "unknown" ? (
            <p className="text-xs text-destructive">{copy.deadlineVerify}</p>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold">{copy.riskHeading}</p>
          <p className="text-xs text-muted-foreground">{copy.riskStates[analysis.risk.state]}</p>
          {analysis.risk.signals.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold">{copy.riskSignalsHeading}</p>
              <ul className="space-y-1">
                {analysis.risk.signals.map((signal) => (
                  <li key={signal.id} className="text-xs text-muted-foreground">
                    {copy.riskQuoteLabel}: <span className="italic">{signal.quote}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold">{copy.nextActionHeading}</p>
          <p className="text-sm font-medium">{copy.nextActions[analysis.nextAction]}</p>
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
