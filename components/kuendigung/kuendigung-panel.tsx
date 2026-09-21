"use client"

import { useActionState } from "react"
import {
  prepareKuendigungDraft,
  type KuendigungGenerationState,
} from "@/lib/horizon/kuendigung/actions"
import { getKuendigungCopy } from "@/lib/horizon/kuendigung/copy"
import {
  assessTerminationTiming,
  readKuendigungFacts,
  type KuendigungFact,
} from "@/lib/horizon/kuendigung/facts"
import { readLetterOutputSha } from "@/lib/horizon/kuendigung/manifest"
import type { CaseApproval, CaseDraft, MissingInformation } from "@/lib/horizon/case/contract"

const initialState: KuendigungGenerationState = { status: null, detail: null }

type Fact = KuendigungFact & { critical?: boolean }

/**
 * P14 — the Kündigung entry inside a case.
 *
 * It does three things and asserts nothing beyond them:
 *
 * 1. shows which facts are still missing, from the case's own authoritative
 *    missing-information state, so the user asks only what is genuinely needed;
 * 2. states how the termination timing was arrived at, and says plainly when a
 *    date is not evidenced — the calculated case is labelled as a statutory
 *    ceiling the user must check, never as a date from their contract;
 * 3. prepares the German letter through the engine, which is refused until the
 *    facts are complete.
 *
 * It never claims a contract has been cancelled. The letter is generated, not
 * sent; the provider's confirmation is what ends the contract.
 */
export function KuendigungPanel({
  caseId,
  locale,
  module,
  facts,
  missing,
  drafts,
  approvals,
}: {
  caseId: string
  locale: string
  module: string
  facts: readonly Fact[]
  missing: MissingInformation | null
  drafts: readonly CaseDraft[]
  approvals: readonly CaseApproval[]
}) {
  const [state, action, pending] = useActionState(prepareKuendigungDraft, initialState)
  const copy = getKuendigungCopy(locale === "de" ? "de" : "bg")

  if (module !== "kuendigung") return null

  // The newest letter draft: identified by the output hash its body carries, so a
  // form draft in the same case is never mistaken for the letter.
  const letterDraft = drafts.find((draft) => readLetterOutputSha(draft.body) !== null) ?? null
  const letterApproval = letterDraft
    ? (approvals.find((entry) => entry.draftId === letterDraft.id) ?? null)
    : null
  // Download is offered only for the exact content that was approved.
  const downloadReady =
    letterDraft !== null &&
    letterApproval !== null &&
    letterApproval.approvedHash === letterDraft.contentHash

  const today = new Date().toISOString().slice(0, 10)
  const read = readKuendigungFacts(facts)
  const timing = assessTerminationTiming({ facts: read, today })

  const errorText =
    state.status === "unauthorized"
      ? copy.errorUnauthorized
      : state.status === "case_not_found"
        ? copy.errorCaseNotFound
        : state.status === "not_ready"
          ? copy.errorNotReady
          : state.status && state.status !== "draft_created"
            ? copy.errorFailed
            : null

  const missingKeys = missing?.missingFactKeys ?? []

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {copy.heading}
      </h2>
      <p className="mt-3 text-xs text-muted-foreground">{copy.intro}</p>

      <div className="mt-4 space-y-3">
        <div
          className={
            missingKeys.length === 0
              ? "rounded-md border border-primary/30 bg-primary/5 p-3"
              : "rounded-md border border-dashed border-border p-3"
          }
        >
          <p className="text-xs font-semibold">
            {missingKeys.length === 0 ? copy.readyHeading : copy.notReadyHeading}
          </p>
          {missingKeys.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{copy.missingIntro}</p>
              <ul className="mt-2 space-y-1">
                {missingKeys.map((key) => (
                  <li key={key} className="text-xs">
                    {key}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-semibold">{copy.timingHeading}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.timingLabel}: {copy.timingKind[timing.kind]}
          </p>
          {timing.date ? (
            <p className="mt-1 text-xs">
              {copy.documentedDate}: {timing.date}
            </p>
          ) : null}
          {timing.requiresUserVerification ? (
            <p className="mt-1 text-xs text-destructive">{copy.requiresVerification}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">{copy.noInvention}</p>
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-semibold">{copy.notSent}</p>
        </div>
      </div>

      <form action={action} className="mt-4">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          disabled={pending || missingKeys.length > 0}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.generatePending : copy.generate}
        </button>
      </form>

      {state.status === "draft_created" ? (
        <p role="status" className="mt-2 text-xs text-primary">
          {copy.draftIntro}
        </p>
      ) : null}

      {downloadReady ? (
        <a
          href={`/api/horizon/cases/${caseId}/letter`}
          className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
        >
          {copy.download}
        </a>
      ) : letterDraft ? (
        <p className="mt-2 text-xs text-muted-foreground">{copy.downloadGated}</p>
      ) : null}

      {errorText ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {errorText}
        </p>
      ) : null}
    </section>
  )
}