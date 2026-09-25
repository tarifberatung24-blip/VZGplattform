/**
 * P11 — the send-record marker.
 *
 * Kept in its own module, separate from `record.ts`, because `record.ts` is
 * `server-only` while the marker has to be readable from the client: the case
 * workspace uses it to point the send panel at the newest *sendable* draft
 * rather than at the newest draft, which after a send is the send record itself.
 * Duplicating the string in the component was the alternative and was rejected —
 * the marker must never drift, so there is exactly one definition.
 */

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
 * The draft the send panel should point at: the newest draft that is not a send
 * record, or null when there is none.
 *
 * `drafts` is expected in the repository's newest-first order. Returning null
 * rather than falling back to the newest draft is deliberate: the newest draft
 * after a send is the record of that send, and silently offering it would both
 * hide the explicit-resend path and present a delivery receipt as a sendable
 * message.
 */
export function pickSendableDraft<T extends { model: string | null | undefined }>(
  drafts: readonly T[],
): T | null {
  return drafts.find((draft) => !isSendRecordDraft(draft.model)) ?? null
}
