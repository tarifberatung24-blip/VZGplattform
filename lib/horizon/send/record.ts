/**
 * P11 — send record.
 *
 * A send is persisted as an ordinary case artifact: the record is the body of a
 * new draft, and the delivery outcome is a case audit event. Reusing both is a
 * deliberate choice over introducing a new table.
 *
 * Reasons: the case engine already gives these rows owner-scoped RLS and
 * column-scoped grants that were added by an approved migration; the approval
 * engine already binds a draft to an exact content hash; and the audit spine
 * already orders events per case. A parallel `sends` table would duplicate all
 * three, need its own migration and RLS review, and would become a second place
 * where "was this approved" is answered.
 *
 * The delivery state lives in the audit event's metadata rather than being
 * folded into the draft's own content hash, because a delivery outcome is not
 * part of what the user approved — the *message* is. Keeping them separate means
 * recording a failure can never invalidate the approval of the message itself.
 */

import "server-only"

export const SEND_EVENT_PREFIX = "email_send"

/**
 * Marker written to `correspondence_drafts.model` for a send record.
 *
 * A send record is stored as a draft, which means it appears wherever drafts are
 * listed — and a draft is a thing the UI offers to send. Without a marker, the
 * record of a delivery could itself be sent as if it were the customer's message.
 * The marker is what lets the send engine refuse that, and it must stay stable:
 * changing it would make existing send records look sendable again.
 *
 * `model` is used because it is NOT NULL and no real model is involved in a send
 * record, so there is no value to collide with.
 */
export const SEND_RECORD_MODEL = "horizon-send-record"

/** Whether a draft is a send record rather than a message to be sent. */
export function isSendRecordDraft(model: string | null | undefined): boolean {
  return model === SEND_RECORD_MODEL
}

/**
 * The delivery states a send can be in.
 *
 * There is no `SENT` without a provider message id, so a state that merely means
 * "we tried" cannot be confused with one that means "a mail system accepted it".
 */
export const SEND_STATES = [
  "BLOCKED",
  "PROVIDER_UNAVAILABLE",
  "FAILED",
  "SENT",
] as const

export type SendState = (typeof SEND_STATES)[number]

export type SendEventMetadata = {
  /** Correlates the audit rows of one send. */
  correlationId: string
  state: SendState
  /** `sendIdempotencyKey` — the identity of the exact message. */
  idempotencyKey: string
  /** Provider key, recorded so the transport is auditable. */
  providerKey: string
  /** Redacted recipient. Never the plaintext address. */
  recipientRedacted: string
  /** The approval-bound content hash at the moment of the decision. */
  contentHash: string
  templateId?: string
  /** Attachment provenance: path, filename and hash of each sent file. */
  attachments: readonly {
    storagePath: string
    filename: string
    sha256: string
    sizeBytes: number
  }[]
  /** Present only when the provider accepted the message. */
  providerMessageId?: string
  /** Present only when the provider refused or errored. */
  failureClassification?: string
  failureDetail?: string
  /** Why the send never reached a provider, as machine-readable codes. */
  blockerCodes?: readonly string[]
  /** Distinguishes a deliberate resend from an accidental duplicate. */
  resend?: boolean
}

/**
 * Renders the record that the user reviews and that carries the send's
 * provenance. Fixed order, no re-sorting, and never re-derived from a parsed
 * manifest: it is composed from values already in hand so reproduction cannot
 * drift from what was actually sent.
 */
export function renderSendBody(input: {
  state: SendState
  recipientRedacted: string
  providerKey: string
  providerMessageId?: string
  contentHash: string
  attachments: readonly { filename: string; sha256: string; sizeBytes: number }[]
  blockerCodes?: readonly string[]
  failureDetail?: string
  originalBody: string
}): string {
  const lines = [
    "E-Mail-Versand (Aufzeichnung)",
    `Status: ${input.state}`,
    `Empfänger (geschützt): ${input.recipientRedacted}`,
    `Anbieter: ${input.providerKey}`,
    `Freigabe-Inhaltshash: ${input.contentHash}`,
  ]
  if (input.providerMessageId) lines.push(`Anbieter-Nachrichten-ID: ${input.providerMessageId}`)
  if (input.failureDetail) lines.push(`Fehler: ${input.failureDetail}`)
  if (input.blockerCodes && input.blockerCodes.length > 0) {
    lines.push(`Blockiert durch: ${input.blockerCodes.join(", ")}`)
  }

  if (input.attachments.length === 0) {
    lines.push("Anhänge: keine")
  } else {
    lines.push("Anhänge:")
    for (const attachment of input.attachments) {
      lines.push(`- ${attachment.filename} (${attachment.sizeBytes} Bytes, SHA-256 ${attachment.sha256})`)
    }
  }

  lines.push("", "--- Inhalt der Nachricht ---", input.originalBody)
  return lines.join("\n")
}

export function renderSendSubject(originalSubject: string, state: SendState): string {
  const prefix =
    state === "SENT"
      ? "Gesendet"
      : state === "FAILED"
        ? "Versand fehlgeschlagen"
        : state === "PROVIDER_UNAVAILABLE"
          ? "Versand nicht möglich"
          : "Versand blockiert"
  return `${prefix}: ${originalSubject}`
}