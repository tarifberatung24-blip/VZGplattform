"use client"

import { useActionState } from "react"
import { completeCase, reopenCase, type ClosureState } from "@/lib/horizon/case/closure-actions"
import { canApplyCaseAction } from "@/lib/horizon/case/lifecycle"
import type { HorizonCaseStatus } from "@/lib/horizon/case/contract"

const initialState: ClosureState = { error: null, ok: false }

/**
 * Close or reopen a case.
 *
 * The case is not deleted by closing it: `complete` only marks it finished, and
 * `reopen` brings it back so a customer who hears from an authority continues the
 * same case rather than starting a second one. The control offered depends on the
 * status the server already resolved, and the server refuses a move the
 * transition table does not allow, so this surface never claims a transition it
 * cannot make.
 */
export function CaseClosurePanel({
  caseId,
  locale,
  status,
}: {
  caseId: string
  locale: string
  status: string
}) {
  const [closeState, closeAction, closePending] = useActionState(completeCase, initialState)
  const [reopenState, reopenAction, reopenPending] = useActionState(reopenCase, initialState)
  const de = locale === "de"

  const copy = de
    ? {
        closed: "Dieser Vorgang ist abgeschlossen.",
        cancelled: "Dieser Vorgang ist abgebrochen.",
        hint: "Der Vorgang wird nicht gelöscht. Du kannst ihn später wieder öffnen.",
        notYet:
          "Abschließen ist möglich, sobald der Entwurf freigegeben und der Versand abgeschlossen ist.",
        complete: "Vorgang abschließen",
        completing: "Wird abgeschlossen …",
        reopen: "Vorgang wieder öffnen",
        reopening: "Wird geöffnet …",
        done: "Der Vorgang ist abgeschlossen.",
        reopened: "Der Vorgang ist wieder offen.",
        missing_case: "Vorgang nicht gefunden.",
        NOT_ALLOWED: "Das ist in diesem Zustand nicht möglich.",
        FAILED: "Aktion fehlgeschlagen. Bitte erneut versuchen.",
      }
    : {
        closed: "Този случай е приключен.",
        cancelled: "Този случай е прекратен.",
        hint: "Случаят не се изтрива. Можеш да го отвориш отново по-късно.",
        notYet:
          "Приключването е възможно, след като черновата е одобрена и изпращането е завършено.",
        complete: "Приключи случая",
        completing: "Приключва се …",
        reopen: "Отвори отново случая",
        reopening: "Отваря се …",
        done: "Случаят е приключен.",
        reopened: "Случаят е отворен отново.",
        missing_case: "Случаят не е намерен.",
        NOT_ALLOWED: "Това не е възможно в това състояние.",
        FAILED: "Действието не успя. Опитай отново.",
      }

  const errorText = (error: ClosureState["error"]) =>
    error ? copy[error as keyof typeof copy] ?? copy.FAILED : null

  const isClosed = status === "completed" || status === "cancelled"
  // The transition table decides, not this component: `complete` is only offered
  // from a status the table allows it from, so the button is never shown for a
  // move the server would refuse.
  const canComplete = canApplyCaseAction(status as HorizonCaseStatus, "complete")
  const activeError = errorText(closeState.error ?? reopenState.error)

  return (
    <div className="space-y-2">
      {isClosed ? (
        <>
          <p className="text-xs font-medium text-foreground">
            {status === "cancelled" ? copy.cancelled : copy.closed}
          </p>
          <form action={reopenAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={reopenPending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {reopenPending ? copy.reopening : copy.reopen}
            </button>
            {reopenState.ok ? (
              <p role="status" className="text-xs text-muted-foreground">
                {copy.reopened}
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{canComplete ? copy.hint : copy.notYet}</p>
          {canComplete ? (
            <form action={closeAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="caseId" value={caseId} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                disabled={closePending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                {closePending ? copy.completing : copy.complete}
              </button>
              {closeState.ok ? (
                <p role="status" className="text-xs text-muted-foreground">
                  {copy.done}
                </p>
              ) : null}
            </form>
          ) : null}
        </>
      )}

      {activeError ? (
        <p role="alert" className="text-xs text-destructive">
          {activeError}
        </p>
      ) : null}
    </div>
  )
}
