"use client"

import { useActionState } from "react"
import { signGeneratedDocument, type SignatureState } from "@/lib/horizon/pdf/signature-actions"

const initialState: SignatureState = { status: null, detail: null, manualPath: null }

/**
 * P10 — visual signature of an approved generated document.
 *
 * This panel is deliberately explicit about what it does. It applies a *visual*
 * signature: the image and the date are drawn into the page. It is not a
 * qualified or advanced electronic signature and not a cryptographic one, and
 * the labels say so rather than letting a user infer more assurance than exists.
 *
 * The date field is a native date input so the value arriving at the engine is
 * unambiguous ISO. A free-text field would invite `03/04/2026`, which cannot be
 * resolved without guessing the user's convention — and guessing at the date on a
 * signed tax declaration is not acceptable.
 *
 * The confirmation checkbox is required because signing is an act of intent, not
 * a side effect of submitting a form.
 */
export function SignaturePanel({
  caseId,
  locale,
}: {
  caseId: string
  locale: string
}) {
  const [state, action, pending] = useActionState(signGeneratedDocument, initialState)
  const de = locale === "de"

  const copy = de
    ? {
        title: "Sichtbare Signatur",
        intro:
          "Diese Signatur ist eine sichtbare Signatur: Bild und Datum werden in das Dokument gezeichnet. Sie ist keine qualifizierte oder fortgeschrittene elektronische Signatur und keine kryptografische Signatur.",
        image: "Unterschriftsbild (PNG oder JPEG)",
        date: "Datum",
        confirm: "Ich möchte genau dieses freigegebene Dokument sichtbar unterschreiben.",
        submit: "Signatur anwenden",
        working: "Wird angewendet …",
        ok: "Die Signatur wurde angewendet. Ein neues signiertes Dokument wurde als Entwurf zur Prüfung gespeichert; das freigegebene Original bleibt unverändert.",
        failed: "Die Signatur konnte nicht angewendet werden.",
        unsupported_image_format:
          "Das Unterschriftsbild muss ein PNG oder JPEG sein. Andere Formate werden nicht verarbeitet.",
        image_too_large: "Das Unterschriftsbild ist zu groß.",
        image_empty: "Bitte ein Unterschriftsbild auswählen.",
        date_required: "Bitte ein eindeutiges Datum angeben.",
        not_confirmed: "Bitte die Bestätigung ausdrücklich setzen.",
        no_verified_placement:
          "Für dieses Dokument ist keine geprüfte Position der Unterschrift hinterlegt. Es wird nichts geschätzt — bitte das amtliche Formular manuell unterschreiben.",
        not_approved:
          "Dieses Dokument ist nicht (mehr) freigegeben. Eine Signatur ist erst nach Prüfung und Freigabe möglich.",
        approval_stale:
          "Das Dokument wurde nach der Freigabe geändert. Bitte die neue Fassung prüfen und erneut freigeben.",
        document_hash_mismatch:
          "Das Dokument stimmt nicht mit der freigegebenen Fassung überein. Aus Sicherheitsgründen wird nicht signiert.",
        document_not_found: "Kein erzeugtes Dokument gefunden, das signiert werden könnte.",
        case_not_found: "Vorgang nicht gefunden.",
        storage_unavailable: "Der private Speicher ist nicht verfügbar. Es wurde nichts gespeichert.",
        manual: "Amtliches Formular öffnen",
      }
    : {
        title: "Видима сигнатура",
        intro:
          "Тази сигнатура е видима: изображението и датата се нанасят върху документа. Тя не е квалифициран или усъвършенстван електронен подпис и не е криптографски подпис.",
        image: "Изображение на подписа (PNG или JPEG)",
        date: "Дата",
        confirm: "Искам да подпиша видимо точно този одобрен документ.",
        submit: "Приложи сигнатурата",
        working: "Прилага се …",
        ok: "Сигнатурата е приложена. Нов подписан документ е запазен като чернова за преглед; одобреният оригинал остава непроменен.",
        failed: "Сигнатурата не можа да бъде приложена.",
        unsupported_image_format:
          "Изображението на подписа трябва да е PNG или JPEG. Други формати не се обработват.",
        image_too_large: "Изображението на подписа е твърде голямо.",
        image_empty: "Моля, избери изображение на подписа.",
        date_required: "Моля, посочи еднозначна дата.",
        not_confirmed: "Моля, потвърди изрично.",
        no_verified_placement:
          "За този документ няма проверена позиция на подписа. Нищо не се нагажда приблизително — моля, подпиши официалния формуляр ръчно.",
        not_approved:
          "Този документ не е (вече) одобрен. Подписване е възможно само след преглед и одобрение.",
        approval_stale:
          "Документът е променен след одобрението. Моля, прегледай новата версия и я одобри отново.",
        document_hash_mismatch:
          "Документът не съвпада с одобрената версия. От съображения за сигурност не се подписва.",
        document_not_found: "Няма намерен създаден документ, който да бъде подписан.",
        case_not_found: "Случаят не е намерен.",
        storage_unavailable: "Частното хранилище не е достъпно. Нищо не е запазено.",
        manual: "Отвори официалния формуляр",
      }

  const isKnownStatus = (value: string): value is keyof typeof copy => value in copy
  const refusalText =
    state.status && state.status !== "signed" && isKnownStatus(state.status)
      ? copy[state.status]
      : null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium">{copy.title}</p>
      <p className="text-xs text-muted-foreground">{copy.intro}</p>

      <form action={action} className="space-y-2">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />

        <label className="block text-xs font-medium" htmlFor="signature-image">
          {copy.image}
        </label>
        <input
          id="signature-image"
          name="signatureImage"
          type="file"
          accept="image/png,image/jpeg"
          required
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />

        <label className="block text-xs font-medium" htmlFor="signature-date">
          {copy.date}
        </label>
        <input
          id="signature-date"
          name="signatureDate"
          type="date"
          required
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />

        <label className="flex items-start gap-2 text-xs" htmlFor="signature-confirm">
          <input id="signature-confirm" name="confirmSignature" type="checkbox" required className="mt-0.5" />
          <span>{copy.confirm}</span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.working : copy.submit}
        </button>
      </form>

      {state.status === "signed" ? (
        <p role="status" className="text-xs text-primary">
          {copy.ok}
        </p>
      ) : null}

      {refusalText ? (
        <div className="space-y-1">
          <p role="alert" className="text-xs text-destructive">
            {copy.failed} {refusalText}
          </p>
          {state.manualPath ? (
            <a
              href={state.manualPath}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-block text-xs font-medium text-primary hover:underline"
            >
              {copy.manual}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}