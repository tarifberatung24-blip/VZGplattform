"use client"

import { useActionState, useEffect, useState } from "react"
import {
  getSendPreview,
  submitSend,
  type SendPreview,
  type SendResult,
} from "@/lib/horizon/send/actions"
import type { SendBlocker } from "@/lib/horizon/send/send-plan"

/**
 * P11 — send an approved draft.
 *
 * The panel never decides anything. It loads the preview from the same policy the
 * send itself runs, so the requirements it shows are the requirements that would
 * actually stop the send; a preview computed by different rules would let a user
 * confirm something that is then refused, which teaches them the panel cannot be
 * trusted.
 *
 * Three separate confirmations are required, and they are deliberately not
 * collapsed into one:
 *   - the attachment selection, because the user must see what leaves the building;
 *   - the recipient, because the send engine never derives an address;
 *   - the send itself, because approving content is not the same act as delivering it.
 *
 * When no provider is configured, the panel says so and disables the control
 * instead of offering a button that can only fail. Nothing here fabricates a
 * delivery: a send that cannot happen is reported as not having happened.
 */

const initialState: SendResult = { status: "invalid", detail: "idle" }

function blockerText(blocker: SendBlocker, de: boolean): string {
  const map: Record<string, [string, string]> = {
    NO_DRAFT: ["Kein Entwurf ausgewählt.", "Няма избрана чернова."],
    NOT_APPROVED: ["Der Entwurf ist nicht freigegeben.", "Черновата не е одобрена."],
    CONTENT_CHANGED_SINCE_APPROVAL: [
      "Der Inhalt wurde nach der Freigabe geändert. Bitte erneut prüfen und freigeben.",
      "Съдържанието е променено след одобрението. Моля, прегледай и одобри отново.",
    ],
    REVIEW_BLOCKED: [
      "Die Prüfung hat diesen Entwurf blockiert. Ein Versand ist nicht möglich.",
      "Прегледът блокира тази чернова. Изпращане не е възможно.",
    ],
    MISSING_INFORMATION: [
      "Es fehlen noch Angaben. Bitte zuerst vervollständigen.",
      "Липсват данни. Моля, първо ги допълни.",
    ],
    UNCONFIRMED_FACTS: [
      "Es gibt unbestätigte Angaben. Bitte zuerst bestätigen.",
      "Има непотвърдени данни. Моля, първо ги потвърди.",
    ],
    RECIPIENT_MISSING: [
      "Es ist kein Empfänger hinterlegt. Es wird keiner geraten.",
      "Няма записан получател. Не се нагажда приблизително.",
    ],
    RECIPIENT_MALFORMED: [
      "Die Empfängeradresse ist ungültig. Bitte korrigieren.",
      "Адресът на получателя е невалиден. Моля, коригирай го.",
    ],
    RECIPIENT_NOT_CONFIRMED: [
      "Bitte den Empfänger ausdrücklich bestätigen.",
      "Моля, потвърди изрично получателя.",
    ],
    SEND_NOT_CONFIRMED: [
      "Bitte den Versand ausdrücklich bestätigen.",
      "Моля, потвърди изрично изпращането.",
    ],
    ATTACHMENT_NOT_SELECTED: [
      "Bitte die Anlagen auswählen.",
      "Моля, избери приложенията.",
    ],
    ATTACHMENT_CHANGED: [
      "Eine Anlage stimmt nicht mehr mit der geprüften Fassung überein. Es wird nichts gesendet.",
      "Приложение не съвпада с проверената версия. Нищо не се изпраща.",
    ],
    ATTACHMENT_UNREADABLE: [
      "Eine Anlage konnte nicht gelesen werden. Es wird nichts gesendet.",
      "Приложение не можа да бъде прочетено. Нищо не се изпраща.",
    ],
    ATTACHMENT_LIMIT_EXCEEDED: [
      "Die Anlagen sind zusammen zu groß. Es wird nichts gekürzt.",
      "Приложенията са твърде големи заедно. Нищо не се съкращава.",
    ],
    ALREADY_SENT: [
      "Diese Nachricht wurde bereits gesendet. Ein erneuter Versand muss ausdrücklich bestätigt werden.",
      "Това съобщение вече е изпратено. Повторно изпращане изисква изрично потвърждение.",
    ],
    PROVIDER_UNAVAILABLE: [
      "Es ist kein E-Mail-Anbieter konfiguriert. Es wurde nichts gesendet.",
      "Не е конфигуриран имейл доставчик. Нищо не е изпратено.",
    ],
    IS_SEND_RECORD: [
      "Dies ist ein Versandnachweis und keine versendbare Nachricht.",
      "Това е доказателство за изпращане, а не съобщение за изпращане.",
    ],
  }
  const entry = map[blocker]
  if (!entry) return blocker
  return de ? entry[0] : entry[1]
}

export function SendPanel({
  caseId,
  locale,
  draftId,
}: {
  caseId: string
  locale: string
  draftId: string | null
}) {
  const de = locale === "de"
  const [preview, setPreview] = useState<SendPreview | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [state, action, pending] = useActionState(submitSend, initialState)

  useEffect(() => {
    let active = true
    if (!draftId) {
      setPreview(null)
      return
    }
    void getSendPreview(caseId, draftId).then((next) => {
      if (!active) return
      setPreview(next)
      // Everything recorded is pre-selected, because the user already chose these
      // attachments when the draft was created; they can still deselect any of them.
      setSelected(next?.attachments.map((attachment) => attachment.storagePath) ?? [])
    })
    return () => {
      active = false
    }
  }, [caseId, draftId])

  const copy = de
    ? {
        title: "Versand",
        loading: "Wird geprüft …",
        none: "Kein freigegebener Entwurf zum Versand.",
        recipient: "Empfänger",
        noRecipient: "Kein Empfänger hinterlegt",
        subject: "Betreff",
        attachments: "Anlagen",
        noAttachments: "Keine Anlagen",
        requirements: "Offene Voraussetzungen",
        providerNone:
          "Es ist kein E-Mail-Anbieter konfiguriert. Der Versand ist daher nicht möglich und es wird nichts gesendet.",
        confirmRecipient: "Ich bestätige, dass genau dieser Empfänger richtig ist.",
        confirmSend: "Ich möchte diese Nachricht jetzt verbindlich senden.",
        confirmResend: "Ich möchte diese bereits gesendete Nachricht erneut senden.",
        submit: "Jetzt senden",
        working: "Wird gesendet …",
        sent: "Die Nachricht wurde an den Anbieter übergeben.",
        blocked: "Der Versand wurde nicht ausgeführt.",
        unavailable: "Der Versand war nicht möglich.",
        failed: "Der Anbieter hat die Nachricht abgelehnt.",
        messageId: "Anbieter-Nachrichten-ID",
      }
    : {
        title: "Изпращане",
        loading: "Проверява се …",
        none: "Няма одобрена чернова за изпращане.",
        recipient: "Получател",
        noRecipient: "Няма записан получател",
        subject: "Тема",
        attachments: "Приложения",
        noAttachments: "Няма приложения",
        requirements: "Неизпълнени условия",
        providerNone:
          "Не е конфигуриран имейл доставчик. Затова изпращане не е възможно и нищо не се изпраща.",
        confirmRecipient: "Потвърждавам, че точно този получател е правилният.",
        confirmSend: "Искам да изпратя това съобщение сега.",
        confirmResend: "Искам да изпратя отново вече изпратеното съобщение.",
        submit: "Изпрати сега",
        working: "Изпраща се …",
        sent: "Съобщението беше предадено на доставчика.",
        blocked: "Изпращането не беше извършено.",
        unavailable: "Изпращането не беше възможно.",
        failed: "Доставчикът отказа съобщението.",
        messageId: "ID на съобщението при доставчика",
      }

  if (!draftId) {
    return <p className="text-xs text-muted-foreground">{copy.none}</p>
  }
  if (!preview) {
    return <p className="text-xs text-muted-foreground">{copy.loading}</p>
  }

  const alreadySentBlocked = preview.blockers.includes("ALREADY_SENT")
  const canSend = preview.providerAvailable && !alreadySentBlocked

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium">{copy.title}</p>

      <div className="space-y-0.5 text-xs">
        <p>
          <span className="text-muted-foreground">{copy.recipient}: </span>
          {preview.to ?? copy.noRecipient}
        </p>
        <p>
          <span className="text-muted-foreground">{copy.subject}: </span>
          {preview.subject}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">{copy.attachments}</p>
        {preview.attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">{copy.noAttachments}</p>
        ) : (
          preview.attachments.map((attachment) => (
            <label key={attachment.storagePath} className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={selected.includes(attachment.storagePath)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, attachment.storagePath]
                      : current.filter((path) => path !== attachment.storagePath),
                  )
                }
                className="mt-0.5"
              />
              <span>
                {attachment.filename}
                <span className="block text-muted-foreground">
                  {attachment.sizeBytes} Bytes · SHA-256 {attachment.sha256.slice(0, 12)}…
                </span>
              </span>
            </label>
          ))
        )}
      </div>

      {preview.blockers.length > 0 && preview.providerAvailable ? (
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{copy.requirements}</p>
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blockerText(blocker, de)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!preview.providerAvailable ? (
        <p className="text-xs text-destructive">{copy.providerNone}</p>
      ) : null}

      {canSend ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="draftId" value={draftId} />
          {selected.map((path) => (
            <input key={path} type="hidden" name="selectedAttachmentPaths" value={path} />
          ))}

          <label className="flex items-start gap-2 text-xs">
            <input name="recipientConfirmed" type="checkbox" required className="mt-0.5" />
            <span>{copy.confirmRecipient}</span>
          </label>

          <label className="flex items-start gap-2 text-xs">
            <input name="sendConfirmed" type="checkbox" required className="mt-0.5" />
            <span>{copy.confirmSend}</span>
          </label>

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? copy.working : copy.submit}
          </button>
        </form>
      ) : null}

      {alreadySentBlocked ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="draftId" value={draftId} />
          {selected.map((path) => (
            <input key={path} type="hidden" name="selectedAttachmentPaths" value={path} />
          ))}
          <label className="flex items-start gap-2 text-xs">
            <input name="recipientConfirmed" type="checkbox" required className="mt-0.5" />
            <span>{copy.confirmRecipient}</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <input name="resendConfirmed" type="checkbox" required className="mt-0.5" />
            <span>{copy.confirmResend}</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <input name="sendConfirmed" type="checkbox" required className="mt-0.5" />
            <span>{copy.confirmSend}</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? copy.working : copy.submit}
          </button>
        </form>
      ) : null}

      {state.status === "sent" ? (
        <div role="status" className="space-y-0.5 text-xs text-primary">
          <p>{copy.sent}</p>
          <p className="text-muted-foreground">
            {copy.messageId}: {state.providerMessageId}
          </p>
        </div>
      ) : null}

      {state.status === "blocked" ? (
        <div role="alert" className="space-y-0.5 text-xs text-destructive">
          <p>{copy.blocked}</p>
          <ul className="list-inside list-disc">
            {state.blockers.map((blocker) => (
              <li key={blocker}>{blockerText(blocker, de)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "provider_unavailable" ? (
        <p role="alert" className="text-xs text-destructive">
          {copy.unavailable} {copy.providerNone}
        </p>
      ) : null}

      {state.status === "failed" ? (
        <p role="alert" className="text-xs text-destructive">
          {copy.failed}
        </p>
      ) : null}
    </div>
  )
}