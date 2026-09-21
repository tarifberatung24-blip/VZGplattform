/**
 * P11 — send policy.
 *
 * This module decides whether a send may proceed, and it decides nothing else.
 * It is pure: no I/O, no clock, no provider. That separation is deliberate — the
 * send decision is the highest-consequence decision in the product, so it must be
 * exhaustively testable without a mail server or a database.
 *
 * The rules, and why each exists:
 *
 * - Sending is never automatic. An explicit per-send confirmation is required,
 *   separate from the P8 approval of the content. Approving text means "this
 *   text is right"; sending means "deliver it now". Collapsing them would let a
 *   later send ride on an approval the user gave for a different purpose.
 *
 * - Only the exact current approved artifact may be sent. The draft's content
 *   hash must still match an approval, so a stale approval blocks the send
 *   rather than sending edited content under an earlier one.
 *
 * - Attachments are bound by SHA-256, not by path. A path can come to name
 *   different bytes; a hash cannot. Every attachment the user sees in the
 *   preview is therefore the exact byte sequence that gets sent, or the send is
 *   refused.
 *
 * - The recipient must already exist as recorded data and be explicitly
 *   confirmed. This module never derives an address.
 *
 * - A duplicate send is refused unless the user explicitly asks to resend. A
 *   failed attempt is retryable; a successful one is not, silently.
 */

import { isSendRecordDraft } from "./record"
import { checkRecipient, type RecipientRefusal } from "./recipient"

export const SEND_BLOCKERS = [
  "NO_DRAFT",
  "NOT_APPROVED",
  "CONTENT_CHANGED_SINCE_APPROVAL",
  "REVIEW_BLOCKED",
  "MISSING_INFORMATION",
  "UNCONFIRMED_FACTS",
  "RECIPIENT_MISSING",
  "RECIPIENT_MALFORMED",
  "RECIPIENT_NOT_CONFIRMED",
  "SEND_NOT_CONFIRMED",
  "ATTACHMENT_NOT_SELECTED",
  "ATTACHMENT_CHANGED",
  "ATTACHMENT_UNREADABLE",
  "ATTACHMENT_LIMIT_EXCEEDED",
  "ALREADY_SENT",
  "PROVIDER_UNAVAILABLE",
  "IS_SEND_RECORD",
] as const

export type SendBlocker =
  (typeof SEND_BLOCKERS)[number]
  | RecipientRefusal

/**
 * Total size cap for one message. A policy choice, not a provider limit: the
 * repository has no mail dependency, so there is no transport ceiling to inherit.
 * Exceeding it is refused rather than truncated, because a silently truncated
 * official document is worse than a refused send.
 */
export const SEND_ATTACHMENT_TOTAL_MAX_BYTES = 20 * 1024 * 1024

export type VerifiedAttachment = {
  storagePath: string
  filename: string
  contentType: string
  sizeBytes: number
  /** Recomputed from the bytes that will actually be sent. */
  sha256: string
  /** The bytes `sha256` was computed from, carried so they are the bytes sent. */
  bytes: Uint8Array
}

export type SendPlanInput = {
  /**
   * The draft to be sent. `model` is included so a send *record* — which is
   * itself stored as a draft — cannot be sent as if it were the message.
   */
  draft: {
    id: string
    contentHash: string
    reviewStatus: string
    recipient: string | null
    model: string | null
  } | null
  /** Whether an approval currently matches the draft's content hash. */
  approved: boolean
  /** True when an approval existed but the content changed afterwards. */
  approvalInvalidated: boolean
  missingComplete: boolean
  unconfirmedCriticalFactKeys: readonly string[]
  /** SHA-256 of each attachment as recorded when it was created. */
  expectedAttachments: readonly { storagePath: string; sha256: string }[]
  /** The attachment paths the user has explicitly selected for this send. */
  selectedAttachmentPaths: readonly string[]
  /** Actual byte facts for the selected attachments, already read. */
  actualAttachments: readonly VerifiedAttachment[]
  /** Explicit per-send confirmation. Not the same as the content approval. */
  sendConfirmed: boolean
  /** Explicit confirmation that this exact recipient is intended. */
  recipientConfirmed: boolean
  /** Whether a successful send of this exact message already exists. */
  alreadySent: boolean
  /** The user has explicitly asked to send this again despite an earlier success. */
  resendConfirmed: boolean
  /** Whether a usable provider is configured right now. */
  providerAvailable: boolean
}

export type SendPlan =
  | {
      ok: true
      to: string
      attachments: readonly VerifiedAttachment[]
      /** Stable identity of this exact message; drives duplicate detection. */
      idempotencyKey: string
    }
  | { ok: false; blockers: readonly SendBlocker[] }

/**
 * A deterministic digest of exactly what is being sent.
 *
 * Computed over content hash + recipient + attachment hashes, so the same
 * message produces the same key on a retry (allowing a retry of a failed send)
 * while any change to content, recipient or attachments produces a different key
 * (so a changed message is never mistaken for the one already sent).
 */
export function sendIdempotencyKey(input: {
  draftId: string
  contentHash: string
  to: string
  attachmentSha256: readonly string[]
  /**
   * Only set for an explicit, user-confirmed resend. Folding a nonce in changes
   * the key, which is precisely what lets a deliberate second send coexist with
   * duplicate protection — it can never happen by accident.
   */
  resendNonce?: string
}): string {
  const parts = [
    input.draftId,
    input.contentHash,
    input.to,
    [...input.attachmentSha256].sort().join(","),
  ]
  if (input.resendNonce) parts.push(`resend:${input.resendNonce}`)
  return parts.join("|")
}

/**
 * Decides whether the message may be handed to a provider.
 *
 * Blockers are collected rather than short-circuited so the interface can show
 * every outstanding requirement at once, instead of revealing them one
 * frustrating step at a time. The only early returns are for states where the
 * remaining checks would be meaningless or misleading.
 */
export function planSend(input: SendPlanInput): SendPlan {
  const blockers: SendBlocker[] = []

  if (!input.draft) return { ok: false, blockers: ["NO_DRAFT"] }

  // A send record is a draft, so it would otherwise be offered for sending like
  // any other. Refused outright rather than hidden, so the reason is recorded.
  if (isSendRecordDraft(input.draft.model)) {
    return { ok: false, blockers: ["IS_SEND_RECORD"] }
  }

  // Content must still be approved. The invalidation case is reported distinctly
  // because "you edited it after approving" and "you never approved it" call for
  // different actions from the user.
  if (!input.approved) {
    blockers.push(input.approvalInvalidated ? "CONTENT_CHANGED_SINCE_APPROVAL" : "NOT_APPROVED")
  }
  if (input.draft.reviewStatus === "block") blockers.push("REVIEW_BLOCKED")
  if (!input.missingComplete) blockers.push("MISSING_INFORMATION")
  if (input.unconfirmedCriticalFactKeys.length > 0) blockers.push("UNCONFIRMED_FACTS")

  // Recipient: recorded data plus explicit confirmation, never derived.
  const recipient = checkRecipient({
    recipient: input.draft.recipient,
    confirmed: input.recipientConfirmed,
  })
  if (!recipient.ok) blockers.push(recipient.code)

  // Attachments: only what the user selected, and only if the bytes still match
  // what was recorded. Paths are compared as a set so ordering is irrelevant.
  const selected = new Set(input.selectedAttachmentPaths)
  const expectedSelected = input.expectedAttachments.filter((attachment) =>
    selected.has(attachment.storagePath),
  )
  const actualByPath = new Map(input.actualAttachments.map((a) => [a.storagePath, a]))

  if (input.selectedAttachmentPaths.length !== expectedSelected.length) {
    blockers.push("ATTACHMENT_NOT_SELECTED")
  }
  for (const expected of expectedSelected) {
    const actual = actualByPath.get(expected.storagePath)
    if (!actual) {
      blockers.push("ATTACHMENT_UNREADABLE")
      continue
    }
    if (actual.sha256 !== expected.sha256) blockers.push("ATTACHMENT_CHANGED")
  }
  // An attachment the user selected but which was never part of this draft is
  // refused rather than quietly dropped: the user believes they are attaching it.
  if (actualByPath.size !== expectedSelected.length) blockers.push("ATTACHMENT_NOT_SELECTED")

  const totalBytes = expectedSelected.reduce(
    (sum, attachment) => sum + (actualByPath.get(attachment.storagePath)?.sizeBytes ?? 0),
    0,
  )
  if (totalBytes > SEND_ATTACHMENT_TOTAL_MAX_BYTES) blockers.push("ATTACHMENT_LIMIT_EXCEEDED")

  // Duplicate delivery: a success for this exact message already recorded.
  if (input.alreadySent) {
    // A failure is retryable; a recorded success is not repeated without an
    // explicit resend instruction.
    if (!input.resendConfirmed) blockers.push("ALREADY_SENT")
  }

  if (!input.sendConfirmed) blockers.push("SEND_NOT_CONFIRMED")

  if (!input.providerAvailable) blockers.push("PROVIDER_UNAVAILABLE")

  if (blockers.length > 0 || !recipient.ok) {
    return { ok: false, blockers: [...new Set(blockers)] }
  }

  const attachments = expectedSelected.map((expected) => actualByPath.get(expected.storagePath)!)

  return {
    ok: true,
    to: recipient.to,
    attachments,
    idempotencyKey: sendIdempotencyKey({
      draftId: input.draft.id,
      contentHash: input.draft.contentHash,
      to: recipient.to,
      attachmentSha256: attachments.map((attachment) => attachment.sha256),
      ...(input.alreadySent && input.resendConfirmed
        ? { resendNonce: `${input.actualAttachments.length}:${totalBytes}` }
        : {}),
    }),
  }
}

/** Whether a blocker list represents a retryable send that simply failed. */
export function isRetryable(blockers: readonly SendBlocker[]): boolean {
  return blockers.length === 0
}