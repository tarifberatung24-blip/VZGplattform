"use client"

import { useActionState } from "react"
import { submitTextIntake, type TextIntakeState } from "@/lib/horizon/intake/actions"
import { TEXT_INTAKE_KINDS, TEXT_INTAKE_MAX_LENGTH } from "@/lib/horizon/intake/text"

const initialState: TextIntakeState = { error: null, ok: false }

/**
 * P6 text intake: paste text or email content into a case.
 *
 * Explains what the action does before the user commits: the text is stored as
 * given, nothing is extracted from it automatically, and any later draft still
 * requires review and approval. That keeps the surface from implying the text
 * has been interpreted or acted on.
 */
export function TextIntakeForm({ caseId, locale }: { caseId: string; locale: string }) {
  const [state, formAction, pending] = useActionState(submitTextIntake, initialState)
  const de = locale === "de"

  const copy = de
    ? {
        title: "Text oder E-Mail einfügen",
        hint: "Der Text wird unverändert gespeichert. Es werden keine Fristen, Beträge oder Empfänger automatisch daraus abgeleitet.",
        kindLabel: "Art der Eingabe",
        pasted: "Eingefügter Text",
        email: "E-Mail-Inhalt",
        textLabel: "Inhalt",
        submit: "Speichern",
        pending: "Wird gespeichert …",
        ok: "Gespeichert.",
        empty: "Bitte Text eingeben.",
        tooLong: `Der Text ist zu lang (max. ${TEXT_INTAKE_MAX_LENGTH} Zeichen).`,
        unknownKind: "Unbekannte Eingabeart.",
      }
    : {
        title: "Постави текст или имейл",
        hint: "Текстът се запазва непроменен. Никакви срокове, суми или получатели не се извличат автоматично от него.",
        kindLabel: "Вид на въвеждането",
        pasted: "Поставен текст",
        email: "Съдържание на имейл",
        textLabel: "Съдържание",
        submit: "Запази",
        pending: "Запазва се …",
        ok: "Запазено.",
        empty: "Моля, въведи текст.",
        tooLong: `Текстът е твърде дълъг (макс. ${TEXT_INTAKE_MAX_LENGTH} знака).`,
        unknownKind: "Непознат вид въвеждане.",
      }

  const errorText =
    state.error === "empty"
      ? copy.empty
      : state.error === "too_long"
        ? copy.tooLong
        : state.error === "unknown_kind"
          ? copy.unknownKind
          : state.error

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="locale" value={locale} />

      <p className="text-xs text-muted-foreground">{copy.hint}</p>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="text-intake-kind" className="text-xs font-medium">
          {copy.kindLabel}
        </label>
        <select
          id="text-intake-kind"
          name="kind"
          defaultValue={TEXT_INTAKE_KINDS[0]}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="pasted_text">{copy.pasted}</option>
          <option value="email_content">{copy.email}</option>
        </select>
      </div>

      <div>
        <label htmlFor="text-intake-content" className="text-xs font-medium">
          {copy.textLabel}
        </label>
        <textarea
          id="text-intake-content"
          name="text"
          rows={6}
          maxLength={TEXT_INTAKE_MAX_LENGTH}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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