"use client"

import { useActionState } from "react"
import {
  extractCaseDocument,
  type ExtractDocumentState,
} from "@/lib/horizon/intake/extract-actions"

const initialState: ExtractDocumentState = { error: null, ok: false, pageCount: 0 }

/**
 * P6 — reads one case document into page text.
 *
 * Extraction is triggered per document and explicitly, not on upload. Uploading a
 * file the user may only be parking on the case should not silently start OCR
 * over it, and reading a document is the point at which its contents start to
 * matter to the case, so it is a step the user takes knowingly.
 *
 * The status the server stored (`READY` / `NEEDS_CONFIRMATION` / `FAILED`) is
 * shown as a plain state rather than a success message, because "read" and
 * "understood" are not the same thing: a low-confidence read is labelled as
 * needing confirmation here exactly as it is in the facts it may later produce.
 */
export function DocumentExtractButton({
  caseId,
  documentId,
  locale,
  status,
}: {
  caseId: string
  documentId: string
  locale: string
  status: string
}) {
  const [state, formAction, pending] = useActionState(extractCaseDocument, initialState)
  const de = locale === "de"

  const copy = de
    ? {
        extract: "Auslesen",
        pending: "Wird gelesen …",
        done: (count: number) => `${count} Seite(n) gespeichert.`,
        missingCase: "Vorgang nicht gefunden.",
        missingDocument: "Dokument nicht gefunden.",
        caseNotFound: "Vorgang nicht gefunden.",
        unauthorized: "Anmeldung erforderlich.",
        storage: "Der Speicher ist nicht verfügbar. Bitte später erneut versuchen.",
        documentNotFound: "Dokument nicht gefunden.",
        unsupported: "Dieser Dateityp kann nicht ausgelesen werden.",
        failed: "Auslesen fehlgeschlagen. Bitte erneut versuchen.",
      }
    : {
        extract: "Изчети",
        pending: "Чете се …",
        done: (count: number) => `Записани ${count} страница(и).`,
        missingCase: "Случаят не е намерен.",
        missingDocument: "Документът не е намерен.",
        caseNotFound: "Случаят не е намерен.",
        unauthorized: "Изисква се вход.",
        storage: "Хранилището не е достъпно. Опитай по-късно.",
        documentNotFound: "Документът не е намерен.",
        unsupported: "Този тип файл не може да се изчете.",
        failed: "Изчитането не успя. Опитай отново.",
      }

  const errorText = (() => {
    switch (state.error) {
      case null:
        return null
      case "missing_case":
        return copy.missingCase
      case "missing_document":
        return copy.missingDocument
      case "CASE_NOT_FOUND":
        return copy.caseNotFound
      case "UNAUTHORIZED":
        return copy.unauthorized
      case "STORAGE_NOT_CONFIGURED":
        return copy.storage
      case "DOCUMENT_NOT_FOUND":
        return copy.documentNotFound
      case "UNSUPPORTED_TYPE":
        return copy.unsupported
      case "EXTRACTION_FAILED":
        return copy.failed
      default:
        return copy.failed
    }
  })()

  return (
    <form action={formAction} className="mt-1">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-60"
      >
        {pending ? copy.pending : copy.extract}
      </button>
      {state.ok ? (
        <span className="ml-2 text-xs text-muted-foreground">{copy.done(state.pageCount)}</span>
      ) : null}
      {errorText ? (
        <span role="alert" className="ml-2 text-xs text-red-700">
          {errorText}
        </span>
      ) : null}
      {!state.ok && !errorText && status === "FAILED" ? (
        <span className="ml-2 text-xs text-muted-foreground">{copy.failed}</span>
      ) : null}
    </form>
  )
}
