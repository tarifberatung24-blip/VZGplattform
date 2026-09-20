"use server"

/**
 * P11 — send actions.
 *
 * This is the only place a message is handed to a transport, and it is written so
 * that every path ends in a recorded outcome. There is no path that reports
 * success without a provider message id, and no path that sends without a current
 * approval.
 *
 * Order of operations, and why:
 *
 * 1. Authenticate and resolve the case through the request-scoped, RLS-enforced
 *    client. A send is never attempted for a case the caller does not own.
 * 2. Re-read the draft, its approval and its missing-information state *now*.
 *    Nothing is trusted from the client, including the recipient and the
 *    attachment list.
 * 3. Read each recorded attachment and recompute its SHA-256 from the bytes. The
 *    hash compared against the record is of what will actually be sent.
 * 4. Ask `planSend` whether this may proceed. All policy lives there; this module
 *    only gathers the facts it needs.
 * 5. Check the provider *before* creating any record, so an unconfigured
 *    deployment cannot leave a half-written attempt or consume an idempotency key.
 * 6. Only then hand the message to the provider, and persist whatever the
 *    provider truthfully reported.
 *
 * A blocked or unavailable send is still recorded as its own draft plus audit
 * event. That is deliberate: the user needs to see that nothing was sent, and an
 * absent record is indistinguishable from a send that was never requested.
 */

import { createCaseEngine } from "@/lib/horizon/case"
import { assessDraftRelease } from "@/lib/horizon/case/release"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { computeSha256 } from "@/lib/horizon/pdf/source"
import { isSendProviderAvailable, resolveProvider } from "./registry"
import { planSend, type SendBlocker, type VerifiedAttachment } from "./send-plan"
import { checkRecipient, redactRecipient } from "./recipient"
import { renderSendBody, renderSendSubject, SEND_RECORD_MODEL, type SendState } from "./record"

const CASE_DOCUMENT_BUCKET = "source-documents"

/** An attachment as recorded on the draft, before its bytes are read. */
type RecordedAttachment = { storagePath: string; filename: string; sha256: string }

export type SendResult =
  | {
      status: "sent"
      state: "SENT"
      providerMessageId: string
      providerKey: string
      recipientRedacted: string
      attachments: readonly { filename: string; sha256: string }[]
    }
  | { status: "blocked"; state: "BLOCKED"; blockers: readonly SendBlocker[] }
  | { status: "provider_unavailable"; state: "PROVIDER_UNAVAILABLE"; reason: string }
  | { status: "failed"; state: "FAILED"; classification: string; detail: string }
  | { status: "invalid"; detail: string }

export type SendPreview = {
  to: string | null
  subject: string
  body: string
  attachments: readonly {
    filename: string
    storagePath: string
    sizeBytes: number
    sha256: string
  }[]
  blockers: readonly SendBlocker[]
  providerKey: string
  providerAvailable: boolean
}

/**
 * Reads the attachment rows recorded on a draft.
 *
 * The draft's `attachments` column is a jsonb array. Malformed or partial entries
 * are dropped rather than repaired: an attachment whose hash cannot be
 * established cannot be verified before sending, so it must not silently become
 * part of a set the user believes is verified.
 */
function readRecordedAttachments(value: unknown): RecordedAttachment[] {
  if (!Array.isArray(value)) return []
  const out: RecordedAttachment[] = []
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const record = entry as Record<string, unknown>
    const storagePath = typeof record.storagePath === "string" ? record.storagePath : null
    const filename = typeof record.filename === "string" ? record.filename : null
    const sha256 = typeof record.sha256 === "string" ? record.sha256 : null
    if (!storagePath || !filename || !sha256) continue
    out.push({ storagePath, filename, sha256 })
  }
  return out
}

/**
 * Reads attachment bytes from private storage and returns their real size and
 * hash.
 *
 * Uses the admin client because the bytes live in a private bucket and the
 * download must not depend on a client-side URL. Ownership is already enforced:
 * the draft, and the attachment paths recorded on it, were read through the
 * RLS-enforced session client for this case.
 */
async function readRecordedAttachmentBytes(
  recorded: readonly RecordedAttachment[],
): Promise<VerifiedAttachment[] | null> {
  if (recorded.length === 0) return []
  const admin = createAdminClient()
  if (!admin) return null

  const verified: VerifiedAttachment[] = []
  for (const attachment of recorded) {
    const downloaded = await admin.storage
      .from(CASE_DOCUMENT_BUCKET)
      .download(attachment.storagePath)
    if (downloaded.error || !downloaded.data) return null
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer())
    verified.push({
      storagePath: attachment.storagePath,
      filename: attachment.filename,
      contentType: downloaded.data.type || "application/octet-stream",
      sizeBytes: bytes.byteLength,
      sha256: await computeSha256(bytes),
    })
  }
  return verified
}

/** A recorded success for this exact draft. */
function hasPriorSent(
  audit: readonly { action: string; metadata: unknown }[],
  draftId: string,
): boolean {
  return audit.some((event) => {
    if (event.action !== "email_send_attempted") return false
    const metadata = event.metadata as Record<string, unknown> | null
    if (!metadata) return false
    return metadata.state === "SENT" && metadata.sourceDraftId === draftId
  })
}

/** Loads everything the send decision needs, for one owned draft. */
async function loadSendContext(input: { caseId: string; draftId: string }) {
  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) return null

  const drafts = await engine.repository.listDrafts(input.caseId)
  if (drafts.error) return null
  const draft = (drafts.data ?? []).find((item) => item.id === input.draftId)
  if (!draft) return null

  const [approvals, missing, rawAttachments, audit, provider, providerAvailable] = await Promise.all([
    engine.repository.listApprovals(input.caseId),
    engine.repository.getMissingInformation(input.caseId),
    engine.repository.getDraftAttachments(input.caseId, input.draftId),
    engine.repository.listAudit(input.caseId),
    resolveProvider(),
    isSendProviderAvailable(),
  ])

  const recorded = readRecordedAttachments(rawAttachments.data)
  const verified = await readRecordedAttachmentBytes(recorded)

  return {
    draft,
    approvals: approvals.data ?? [],
    missing: missing.data,
    recorded,
    verified,
    audit: audit.data ?? [],
    provider,
    providerAvailable,
  }
}

/**
 * Builds the preview the user sees before confirming.
 *
 * Runs the *same* policy as the send, so the blockers shown are the blockers that
 * would actually stop it. A preview computed by different rules would let a user
 * confirm something that is then refused, which teaches them the preview cannot
 * be trusted.
 *
 * Confirmation flags are passed as false on purpose: the preview must report them
 * as outstanding until the user actually gives them, rather than presenting a
 * pre-satisfied checklist.
 */
export async function getSendPreview(
  caseId: string,
  draftId: string,
  selectedAttachmentPaths: readonly string[] = [],
): Promise<SendPreview | null> {
  const context = await loadSendContext({ caseId, draftId })
  if (!context || context.verified === null) return null

  const release = assessDraftRelease({
    draft: context.draft,
    approvals: context.approvals,
    missing: context.missing,
  })

  const plan = planSend({
    draft: {
      id: context.draft.id,
      contentHash: context.draft.contentHash,
      reviewStatus: context.draft.reviewStatus,
      recipient: context.draft.recipient,
      model: context.draft.model,
    },
    approved: release.releasable && !release.approvalInvalidated,
    approvalInvalidated: release.approvalInvalidated,
    missingComplete: context.missing?.complete ?? true,
    unconfirmedCriticalFactKeys: context.missing?.unconfirmedCriticalFactKeys ?? [],
    expectedAttachments: context.recorded.map((attachment) => ({
      storagePath: attachment.storagePath,
      sha256: attachment.sha256,
    })),
    selectedAttachmentPaths,
    actualAttachments: context.verified,
    sendConfirmed: false,
    recipientConfirmed: false,
    alreadySent: hasPriorSent(context.audit, draftId),
    resendConfirmed: false,
    providerAvailable: context.providerAvailable,
  })

  return {
    to: context.draft.recipient,
    subject: context.draft.subject,
    body: context.draft.body,
    attachments: context.verified.map((attachment) => ({
      filename: attachment.filename,
      storagePath: attachment.storagePath,
      sizeBytes: attachment.sizeBytes,
      sha256: attachment.sha256,
    })),
    blockers: plan.ok ? ["SEND_NOT_CONFIRMED", "RECIPIENT_NOT_CONFIRMED"] : plan.blockers,
    providerKey: context.provider.key,
    providerAvailable: context.providerAvailable,
  }
}

/**
 * Records the outcome as a draft plus an audit event.
 *
 * Best-effort by design: if persistence fails, the delivery outcome is still what
 * the provider truthfully reported and is returned to the caller. A recording
 * failure must never be reported as a send failure, because that would invite a
 * retry of something that already happened.
 */
async function recordOutcome(input: {
  caseId: string
  draftId: string
  state: SendState
  recipientRedacted: string
  providerKey: string
  providerMessageId?: string
  contentHash: string
  attachments: readonly {
    filename: string
    sha256: string
    sizeBytes: number
    storagePath: string
  }[]
  originalSubject: string
  originalBody: string
  originalRecipient: string | null
  blockerCodes?: readonly string[]
  failureDetail?: string
  idempotencyKey: string
  correlationId: string
  resend?: boolean
}): Promise<void> {
  try {
    const engine = await createCaseEngine()
    if (!engine.repository) return

    await engine.repository.saveDraft(input.caseId, {
      subject: renderSendSubject(input.originalSubject, input.state),
      body: renderSendBody({
        state: input.state,
        recipientRedacted: input.recipientRedacted,
        providerKey: input.providerKey,
        providerMessageId: input.providerMessageId,
        contentHash: input.contentHash,
        attachments: input.attachments,
        blockerCodes: input.blockerCodes,
        failureDetail: input.failureDetail,
        originalBody: input.originalBody,
      }),
      recipient: input.originalRecipient,
      model: SEND_RECORD_MODEL,
      promptVersion: "p11-send-record",
    })

    await engine.repository.appendAudit(input.caseId, "email_send_attempted", {
      state: input.state,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      providerKey: input.providerKey,
      recipientRedacted: input.recipientRedacted,
      contentHash: input.contentHash,
      sourceDraftId: input.draftId,
      attachments: input.attachments.map((attachment) => ({
        storagePath: attachment.storagePath,
        filename: attachment.filename,
        sha256: attachment.sha256,
        sizeBytes: attachment.sizeBytes,
      })),
      providerMessageId: input.providerMessageId,
      blockerCodes: input.blockerCodes,
      failureDetail: input.failureDetail,
      resend: input.resend ?? false,
    })
  } catch {
    // Intentionally swallowed: see doc comment above. The caller still receives
    // the true provider outcome.
  }
}

export async function sendApprovedDraft(input: {
  caseId: string
  draftId: string
  selectedAttachmentPaths: readonly string[]
  recipientConfirmed: boolean
  sendConfirmed: boolean
  resendConfirmed?: boolean
}): Promise<SendResult> {
  const context = await loadSendContext({ caseId: input.caseId, draftId: input.draftId })
  if (!context) return { status: "invalid", detail: "draft_not_found" }
  if (context.verified === null) return { status: "invalid", detail: "attachments_unreadable" }

  const release = assessDraftRelease({
    draft: context.draft,
    approvals: context.approvals,
    missing: context.missing,
  })

  const plan = planSend({
    draft: {
      id: context.draft.id,
      contentHash: context.draft.contentHash,
      reviewStatus: context.draft.reviewStatus,
      recipient: context.draft.recipient,
      model: context.draft.model,
    },
    approved: release.releasable && !release.approvalInvalidated,
    approvalInvalidated: release.approvalInvalidated,
    missingComplete: context.missing?.complete ?? true,
    unconfirmedCriticalFactKeys: context.missing?.unconfirmedCriticalFactKeys ?? [],
    expectedAttachments: context.recorded.map((attachment) => ({
      storagePath: attachment.storagePath,
      sha256: attachment.sha256,
    })),
    selectedAttachmentPaths: input.selectedAttachmentPaths,
    actualAttachments: context.verified,
    sendConfirmed: input.sendConfirmed,
    recipientConfirmed: input.recipientConfirmed,
    alreadySent: hasPriorSent(context.audit, input.draftId),
    resendConfirmed: input.resendConfirmed ?? false,
    providerAvailable: context.providerAvailable,
  })

  const correlationId = crypto.randomUUID()
  const recipientRedacted = context.draft.recipient
    ? redactRecipient(context.draft.recipient)
    : "***"

  if (!plan.ok) {
    const state: SendState = plan.blockers.includes("PROVIDER_UNAVAILABLE")
      ? "PROVIDER_UNAVAILABLE"
      : "BLOCKED"

    await recordOutcome({
      caseId: input.caseId,
      draftId: input.draftId,
      state,
      recipientRedacted,
      providerKey: context.provider.key,
      contentHash: context.draft.contentHash,
      attachments: [],
      originalSubject: context.draft.subject,
      originalBody: context.draft.body,
      originalRecipient: context.draft.recipient,
      blockerCodes: plan.blockers,
      idempotencyKey: "n/a",
      correlationId,
      resend: input.resendConfirmed ?? false,
    })

    if (state === "PROVIDER_UNAVAILABLE") {
      return { status: "provider_unavailable", state, reason: "no_provider_configured" }
    }
    return { status: "blocked", state, blockers: plan.blockers }
  }

  // Re-validated so the address handed to the provider is the validated value,
  // not a second read that could differ from the one policy saw.
  const validated = checkRecipient({
    recipient: context.draft.recipient,
    confirmed: input.recipientConfirmed,
  })
  if (!validated.ok) return { status: "invalid", detail: validated.code }

  const outcome = await context.provider.send({
    to: plan.to,
    subject: context.draft.subject,
    body: context.draft.body,
    attachments: plan.attachments.map((attachment) => ({
      storagePath: attachment.storagePath,
      filename: attachment.filename,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      sha256: attachment.sha256,
    })),
  })

  const sentAttachments = plan.attachments.map((attachment) => ({
    storagePath: attachment.storagePath,
    filename: attachment.filename,
    sha256: attachment.sha256,
    sizeBytes: attachment.sizeBytes,
  }))

  if (outcome.status === "SENT") {
    await recordOutcome({
      caseId: input.caseId,
      draftId: input.draftId,
      state: "SENT",
      recipientRedacted,
      providerKey: context.provider.key,
      providerMessageId: outcome.providerMessageId,
      contentHash: context.draft.contentHash,
      attachments: sentAttachments,
      originalSubject: context.draft.subject,
      originalBody: context.draft.body,
      originalRecipient: context.draft.recipient,
      idempotencyKey: plan.idempotencyKey,
      correlationId,
      resend: input.resendConfirmed ?? false,
    })
    return {
      status: "sent",
      state: "SENT",
      providerMessageId: outcome.providerMessageId,
      providerKey: context.provider.key,
      recipientRedacted,
      attachments: plan.attachments.map((attachment) => ({
        filename: attachment.filename,
        sha256: attachment.sha256,
      })),
    }
  }

  if (outcome.status === "UNAVAILABLE") {
    await recordOutcome({
      caseId: input.caseId,
      draftId: input.draftId,
      state: "PROVIDER_UNAVAILABLE",
      recipientRedacted,
      providerKey: context.provider.key,
      contentHash: context.draft.contentHash,
      attachments: [],
      originalSubject: context.draft.subject,
      originalBody: context.draft.body,
      originalRecipient: context.draft.recipient,
      blockerCodes: [outcome.reason],
      idempotencyKey: plan.idempotencyKey,
      correlationId,
    })
    return { status: "provider_unavailable", state: "PROVIDER_UNAVAILABLE", reason: outcome.reason }
  }

  await recordOutcome({
    caseId: input.caseId,
    draftId: input.draftId,
    state: "FAILED",
    recipientRedacted,
    providerKey: context.provider.key,
    contentHash: context.draft.contentHash,
    attachments: sentAttachments,
    originalSubject: context.draft.subject,
    originalBody: context.draft.body,
    originalRecipient: context.draft.recipient,
    failureDetail: `${outcome.classification}: ${outcome.detail}`,
    idempotencyKey: plan.idempotencyKey,
    correlationId,
  })
  return {
    status: "failed",
    state: "FAILED",
    classification: outcome.classification,
    detail: outcome.detail,
  }
}
/**
 * Form-shaped entry point for `useActionState`.
 *
 * It only extracts and type-checks the fields; every decision stays in
 * `sendApprovedDraft`. Checkbox presence is treated as the confirmation, and an
 * absent field is `false` rather than an error, because an unchecked box is a
 * legitimate "no" and must not be indistinguishable from a malformed request.
 */
export async function submitSend(
  _previous: SendResult,
  formData: FormData,
): Promise<SendResult> {
  const caseId = formData.get("caseId")
  const draftId = formData.get("draftId")
  if (typeof caseId !== "string" || caseId.length === 0) {
    return { status: "invalid", detail: "case_not_found" }
  }
  if (typeof draftId !== "string" || draftId.length === 0) {
    return { status: "invalid", detail: "draft_not_found" }
  }

  return sendApprovedDraft({
    caseId,
    draftId,
    selectedAttachmentPaths: formData.getAll("selectedAttachmentPaths").filter(
      (value): value is string => typeof value === "string",
    ),
    recipientConfirmed: formData.get("recipientConfirmed") === "on",
    sendConfirmed: formData.get("sendConfirmed") === "on",
    resendConfirmed: formData.get("resendConfirmed") === "on",
  })
}
