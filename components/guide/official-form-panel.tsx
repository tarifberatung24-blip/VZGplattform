"use client"

import { useActionState } from "react"
import { prepareOfficialForm, type PdfGenerationState } from "@/lib/horizon/pdf/actions"
import { FMS_2025_TEMPLATES } from "@/lib/horizon/pdf/registry"

const initialState: PdfGenerationState = { status: null, detail: null, manualPath: null }

/**
 * P9 — official form preparation.
 *
 * This surface prepares an official form for review; it does not produce a
 * filled PDF. What the user gets is a reviewable manifest recording which
 * official template was used, its source and hash, the mapping version, and
 * every value that would be written. Approving it happens in the existing draft
 * review panel, which is what binds approval to these exact inputs.
 *
 * When the form cannot be produced — an unsupported format, a non-fillable
 * template, or the absence of a PDF writer — the refusal is shown plainly and a
 * link to the official source is offered, so the user is never left with a
 * dead end or, worse, an unchanged form presented as generated output.
 */
export function OfficialFormPanel({
  caseId,
  locale,
}: {
  caseId: string
  locale: string
}) {
  const [state, action, pending] = useActionState(prepareOfficialForm, initialState)
  const de = locale === "de"

  const copy = de
    ? {
        intro:
          "Amtliches Formular vorbereiten. Es werden ausschließlich bestätigte Angaben eingesetzt; fehlende Angaben bleiben leer.",
        form: "Amtliches Formular",
        year: "Steuerjahr",
        submit: "Formular vorbereiten",
        preparing: "Wird vorbereitet …",
        ok: "Die Vorbereitung wurde als Entwurf gespeichert. Bitte unten prüfen und freigeben.",
        refused: "Dieses Formular kann nicht automatisch ausgefüllt werden.",
        manual: "Amtliches Formular öffnen",
        template_not_found: "Die amtliche Vorlage wurde nicht gefunden.",
        tax_year_required:
          "Für dieses Steuerjahr liegt keine geprüfte amtliche Vorlage vor. Es werden keine Angaben aus einem anderen Jahr übernommen.",
        source_hash_mismatch:
          "Die amtliche Vorlage stimmt nicht mit der geprüften Fassung überein. Aus Sicherheitsgründen wird nichts erzeugt.",
        unsupported_xfa:
          "Dieses Formular ist ein XFA-Formular und wird nicht unterstützt.",
        not_fillable:
          "Diese amtliche Vorlage enthält keine ausfüllbaren Felder.",
        unknown_field:
          "Ein Feld der Zuordnung existiert in dieser Vorlage nicht.",
        no_verified_mapping:
          "Für diese amtliche Vorlage sind noch keine geprüften Koordinaten hinterlegt. Es wird nichts geschätzt.",
        value_too_wide:
          "Ein bestätigter Wert passt nicht in das vorgesehene Feld. Der Wert wird nicht gekürzt.",
        unsupported_format_value:
          "Ein bestätigter Wert entspricht nicht dem erwarteten Format. Er wird nicht umgedeutet.",
        storage_unavailable: "Der private Speicher ist nicht verfügbar. Es wurde nichts gespeichert.",
        nothing_to_fill:
          "Es sind noch keine bestätigten Angaben vorhanden, die eingesetzt werden könnten.",
        case_not_found: "Vorgang nicht gefunden.",
        failed: "Vorbereitung fehlgeschlagen.",
      }
    : {
        intro:
          "Подготовка на официален формуляр. Използват се само потвърдени данни; липсващите остават празни.",
        form: "Официален формуляр",
        year: "Данъчна година",
        submit: "Подготви формуляра",
        preparing: "Подготвя се …",
        ok: "Подготовката е запазена като чернова. Прегледай и одобри по-долу.",
        refused: "Този формуляр не може да бъде попълнен автоматично.",
        manual: "Отвори официалния формуляр",
        template_not_found: "Официалният образец не е намерен.",
        tax_year_required:
          "За тази данъчна година няма проверен официален образец. Не се пренасят данни от друга година.",
        source_hash_mismatch:
          "Официалният образец не съвпада с проверената версия. От съображения за сигурност не се създава нищо.",
        unsupported_xfa: "Този формуляр е XFA и не се поддържа.",
        not_fillable: "Този официален образец няма попълваеми полета.",
        unknown_field: "Поле от съответствието не съществува в този образец.",
        no_verified_mapping:
          "За този официален образец още няма проверени координати. Нищо не се нагажда приблизително.",
        value_too_wide:
          "Потвърдена стойност не се побира в предвиденото поле. Стойността не се съкращава.",
        unsupported_format_value:
          "Потвърдена стойност не отговаря на очаквания формат. Не се претълкува.",
        storage_unavailable: "Частното хранилище не е достъпно. Нищо не е запазено.",
        nothing_to_fill: "Още няма потвърдени данни, които да бъдат въведени.",
        case_not_found: "Случаят не е намерен.",
        failed: "Подготовката не успя.",
      }

  const refusalText =
    state.status && state.status !== "draft_created" && state.status in copy
      ? copy[state.status as keyof typeof copy]
      : null

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{copy.intro}</p>

      <form action={action} className="space-y-2">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="taxYear" value="2025" />

        <label className="block text-xs font-medium" htmlFor="pdf-template">
          {copy.form}
        </label>
        <select
          id="pdf-template"
          name="templateId"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          defaultValue={FMS_2025_TEMPLATES[0]?.id}
        >
          {FMS_2025_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.formName}
              {template.formId ? ` (${template.formId})` : ""} · {template.version}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.preparing : copy.submit}
        </button>
      </form>

      {state.status === "draft_created" ? (
        <div className="space-y-1">
          <p role="status" className="text-xs text-primary">
            {copy.ok}
          </p>
          {state.detail ? <p className="text-xs text-amber-600">{state.detail}</p> : null}
        </div>
      ) : null}

      {refusalText ? (
        <div className="space-y-1">
          <p role="alert" className="text-xs text-destructive">
            {copy.refused} {refusalText}
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