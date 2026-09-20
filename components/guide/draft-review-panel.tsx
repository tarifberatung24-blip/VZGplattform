"use client"

import { useActionState } from "react"
import {
  submitDraftApproval,
  submitDraftReview,
  type DraftReviewState,
} from "@/lib/horizon/case/review-actions"
import type { DraftReleaseAssessment, DraftReleaseBlocker } from "@/lib/horizon/case/release"
import type { CaseDraft } from "@/lib/horizon/case/contract"

const initialState: DraftReviewState = { error: null, ok: false }

/**
 * P8 — draft review and explicit user approval.
 *
 * The draft body is shown verbatim and is never edited here: what the user reads
 * is exactly what the hash covers, so approving on this screen means approving
 * the text that will be exported. When an approval stops matching because the
 * content changed, the panel says so plainly and the approve control returns,
 * rather than presenting a stale approval as still valid.
 */
export function DraftReviewPanel({
  caseId,
  locale,
  draft,
  release,
}: {
  caseId: string
  locale: string
  draft: CaseDraft | null
  release: DraftReleaseAssessment
}) {
  const [reviewState, reviewAction, reviewPending] = useActionState(
    submitDraftReview,
    initialState,
  )
  const [approvalState, approvalAction, approvalPending] = useActionState(
    submitDraftApproval,
    initialState,
  )
  const de = locale === "de"

  const copy = de
    ? {
        title: "Entwurf prüfen und freigeben",
        none: "Noch kein Entwurf vorhanden.",
        version: "Version",
        recipient: "Empfänger",
        noRecipient: "Kein Empfänger hinterlegt",
        approve: "Entwurf freigeben",
        approved: "Freigegeben.",
        approving: "Wird freigegeben …",
        acknowledgement:
          "Ich habe den Text vollständig gelesen und bestätige, dass er so verwendet werden darf.",
        reviewPass: "Geprüft",
        reviewRevise: "Überarbeiten",
        reviewBlock: "Blockieren",
        reviewing: "Wird gespeichert …",
        releaseOk: "Dieser Entwurf ist freigegeben und unverändert.",
        blockers: {
          NO_DRAFT: "Es gibt noch keinen Entwurf.",
          UNCONFIRMED_FACTS: "Es sind noch Fakten unbestätigt, auf denen der Entwurf beruht.",
          MISSING_INFORMATION: "Es fehlen noch Angaben.",
          REVIEW_BLOCKED: "Der Entwurf ist als blockiert markiert.",
          NOT_APPROVED: "Dieser Entwurf wurde noch nicht freigegeben.",
          CONTENT_CHANGED_SINCE_APPROVAL:
            "Der Text wurde nach der Freigabe geändert. Die frühere Freigabe gilt dafür nicht.",
          missing_draft: "Entwurf nicht gefunden.",
          missing_case: "Vorgang nicht gefunden.",
          ACKNOWLEDGEMENT_REQUIRED: "Bitte die Bestätigung ankreuzen.",
          FAILED: "Aktion fehlgeschlagen. Bitte erneut versuchen.",
        },
      }
    : {
        title: "Преглед и одобрение на чернова",
        none: "Още няма чернова.",
        version: "Версия",
        recipient: "Получател",
        noRecipient: "Няма зададен получател",
        approve: "Одобри черновата",
        approved: "Одобрено.",
        approving: "Одобрява се …",
        acknowledgement:
          "Прочетох текста изцяло и потвърждавам, че може да бъде използван в този вид.",
        reviewPass: "Прегледано",
        reviewRevise: "За преработка",
        reviewBlock: "Блокирай",
        reviewing: "Запазва се …",
        releaseOk: "Тази чернова е одобрена и непроменена.",
        blockers: {
          NO_DRAFT: "Още няма чернова.",
          UNCONFIRMED_FACTS: "Има непотвърдени факти, на които черновата се основава.",
          MISSING_INFORMATION: "Липсват още данни.",
          REVIEW_BLOCKED: "Черновата е отбелязана като блокирана.",
          NOT_APPROVED: "Тази чернова още не е одобрена.",
          CONTENT_CHANGED_SINCE_APPROVAL:
            "Текстът е променен след одобрението. Предишното одобрение не важи за него.",
          missing_draft: "Черновата не е намерена.",
          missing_case: "Случаят не е намерен.",
          ACKNOWLEDGEMENT_REQUIRED: "Моля, отметни потвърждението.",
          FAILED: "Действието не успя. Опитай отново.",
        },
      }

  if (!draft) {
    return <p className="text-xs text-muted-foreground">{copy.none}</p>
  }

  const blockerText = (blocker: DraftReleaseBlocker | DraftReviewState["error"]) =>
    blocker && blocker in copy.blockers
      ? copy.blockers[blocker as keyof typeof copy.blockers]
      : blocker
        ? copy.blockers.FAILED
        : null

  const activeError = blockerText(approvalState.error ?? reviewState.error)

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-3">
        <p className="text-sm font-medium">{draft.subject}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {copy.version} {draft.version} ·{" "}
          {draft.recipient ? `${copy.recipient}: ${draft.recipient}` : copy.noRecipient}
        </p>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-xs">
          {draft.body}
        </pre>
      </div>

      {release.releasable ? (
        <p role="status" className="text-xs text-primary">
          {copy.releaseOk}
        </p>
      ) : (
        <ul className="space-y-1 text-xs text-amber-600">
          {release.blockers.map((blocker) => (
            <li key={blocker} className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1">
              {copy.blockers[blocker]}
            </li>
          ))}
        </ul>
      )}

      <form action={reviewAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="draftId" value={draft.id} />
        <button
          type="submit"
          name="status"
          value="pass"
          disabled={reviewPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {reviewPending ? copy.reviewing : copy.reviewPass}
        </button>
        <button
          type="submit"
          name="status"
          value="revise"
          disabled={reviewPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {copy.reviewRevise}
        </button>
        <button
          type="submit"
          name="status"
          value="block"
          disabled={reviewPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {copy.reviewBlock}
        </button>
      </form>

      <form action={approvalAction} className="space-y-2">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="draftId" value={draft.id} />

        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" name="acknowledged" value="yes" className="mt-0.5" />
          <span>{copy.acknowledgement}</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={approvalPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {approvalPending ? copy.approving : copy.approve}
          </button>
          {approvalState.ok ? (
            <p role="status" className="text-xs text-muted-foreground">
              {copy.approved}
            </p>
          ) : null}
        </div>

        {activeError ? (
          <p role="alert" className="text-xs text-destructive">
            {activeError}
          </p>
        ) : null}
      </form>
    </div>
  )
}
