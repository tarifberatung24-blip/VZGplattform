"use client"

import { useActionState } from "react"
import { submitDocumentIntake, type DocumentIntakeState } from "@/lib/horizon/intake/document-actions"
import { CASE_DOCUMENT_MAX_BYTES } from "@/lib/horizon/intake/document"

const initialState: DocumentIntakeState = { error: null, ok: false }

/**
 * P6 file intake: PDF, photo, screenshot.
 *
 * Explains before the user commits that the file is stored as given and that
 * nothing is read out of it automatically, so the surface never implies the
 * document has already been interpreted, translated or acted on. Every failure
 * code the action can return has its own localized message — a raw storage or
 * database error is never shown.
 */
export function DocumentIntakeForm({ caseId, locale }: { caseId: string; locale: string }) {
  const [state, formAction, pending] = useActionState(submitDocumentIntake, initialState)
  const de = locale === "de"
  const maxMb = Math.round(CASE_DOCUMENT_MAX_BYTES / (1024 * 1024))

  const copy = de
    ? {
        label: "Datei anhängen (PDF, Foto, Screenshot)",
        hint: "Die Datei wird unverändert gespeichert. Es werden keine Fristen, Beträge oder Empfänger automatisch daraus abgeleitet.",
        kindLabel: "Was ist das?",
        pdf: "PDF-Dokument",
        photo: "Foto",
        screenshot: "Screenshot",
        submit: "Anhängen",
        pending: "Wird angehängt …",
        ok: "Angehängt.",
        missingFile: "Bitte eine Datei auswählen.",
        missingCase: "Vorgang nicht gefunden.",
        empty: "Die Datei ist leer.",
        tooLarge: `Die Datei ist zu groß (max. ${maxMb} MB).`,
        typeNotAllowed: "Dieser Dateityp wird nicht unterstützt (PDF, JPEG, PNG).",
        invalidSignature: "Die Datei entspricht nicht ihrem angegebenen Typ.",
        invalidName: "Der Dateiname ist ungültig.",
        caseNotFound: "Vorgang nicht gefunden.",
        unauthorized: "Anmeldung erforderlich.",
        storage: "Der Speicher ist nicht verfügbar. Bitte später erneut versuchen.",
        uploadFailed: "Anhängen fehlgeschlagen. Bitte erneut versuchen.",
      }
    : {
        label: "Прикачи файл (PDF, снимка, скрийншот)",
        hint: "Файлът се запазва непроменен. Никакви срокове, суми или получатели не се извличат автоматично от него.",
        kindLabel: "Какво е това?",
        pdf: "PDF документ",
        photo: "Снимка",
        screenshot: "Скрийншот",
        submit: "Прикачи",
        pending: "Прикачва се …",
        ok: "Прикачено.",
        missingFile: "Моля, избери файл.",
        missingCase: "Случаят не е намерен.",
        empty: "Файлът е празен.",
        tooLarge: `Файлът е твърде голям (макс. ${maxMb} MB).`,
        typeNotAllowed: "Този тип файл не се поддържа (PDF, JPEG, PNG).",
        invalidSignature: "Файлът не съответства на посочения тип.",
        invalidName: "Името на файла е невалидно.",
        caseNotFound: "Случаят не е намерен.",
        unauthorized: "Изисква се вход.",
        storage: "Хранилището не е достъпно. Опитай по-късно.",
        uploadFailed: "Прикачването не успя. Опитай отново.",
      }

  const errorText = (() => {
    switch (state.error) {
      case null:
        return null
      case "missing_file":
        return copy.missingFile
      case "missing_case":
        return copy.missingCase
      case "FILE_EMPTY":
        return copy.empty
      case "FILE_TOO_LARGE":
        return copy.tooLarge
      case "FILE_TYPE_NOT_ALLOWED":
        return copy.typeNotAllowed
      case "FILE_INVALID_SIGNATURE":
        return copy.invalidSignature
      case "FILE_NAME_INVALID":
        return copy.invalidName
      case "CASE_NOT_FOUND":
        return copy.caseNotFound
      case "UNAUTHORIZED":
        return copy.unauthorized
      case "STORAGE_NOT_CONFIGURED":
        return copy.storage
      case "UPLOAD_FAILED":
        return copy.uploadFailed
      default:
        return copy.uploadFailed
    }
  })()

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="locale" value={locale} />

      <p className="text-xs text-muted-foreground">{copy.hint}</p>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="document-intake-kind" className="text-xs font-medium">
          {copy.kindLabel}
        </label>
        <select
          id="document-intake-kind"
          name="kind"
          defaultValue="pdf"
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="pdf">{copy.pdf}</option>
          <option value="photo">{copy.photo}</option>
          <option value="screenshot">{copy.screenshot}</option>
        </select>
      </div>

      <div>
        <label htmlFor="document-intake-file" className="text-xs font-medium">
          {copy.label}
        </label>
        <input
          id="document-intake-file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.pending : copy.submit}
        </button>
        {state.ok ? (
          <p role="status" className="text-xs text-muted-foreground">
            {copy.ok}
          </p>
        ) : null}
      </div>

      {errorText ? (
        <p role="alert" className="text-xs text-destructive">
          {errorText}
        </p>
      ) : null}
    </form>
  )
}