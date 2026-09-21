import { describe, expect, it, vi } from "vitest"

// `server-only` throws outside a React Server Component graph; the send engine is
// server-only by design, so the guard is stubbed for these unit tests.
vi.mock("server-only", () => ({}))

import {
  planSend,
  sendIdempotencyKey,
  SEND_ATTACHMENT_TOTAL_MAX_BYTES,
  type SendPlanInput,
} from "./send-plan"
import { checkRecipient, redactRecipient } from "./recipient"
import { isSendRecordDraft, renderSendBody, renderSendSubject, SEND_RECORD_MODEL } from "./record"
import { unavailableProvider } from "./registry"

const HASH_A = "a".repeat(64)
const HASH_B = "b".repeat(64)

/** A fully valid send request, so each test changes exactly one thing. */
function base(overrides: Partial<SendPlanInput> = {}): SendPlanInput {
  return {
    draft: {
      id: "draft-1",
      contentHash: HASH_A,
      reviewStatus: "pending",
      recipient: "leistungen@arbeitsagentur.de",
      model: "test-model",
    },
    approved: true,
    approvalInvalidated: false,
    missingComplete: true,
    unconfirmedCriticalFactKeys: [],
    expectedAttachments: [],
    selectedAttachmentPaths: [],
    actualAttachments: [],
    sendConfirmed: true,
    recipientConfirmed: true,
    alreadySent: false,
    resendConfirmed: false,
    providerAvailable: true,
    ...overrides,
  }
}

function blockersOf(overrides: Partial<SendPlanInput>) {
  const plan = planSend(base(overrides))
  if (plan.ok) throw new Error("expected refusal")
  return plan.blockers
}

describe("a send requires explicit confirmation", () => {
  it("accepts a fully confirmed request", () => {
    const plan = planSend(base())
    expect(plan.ok).toBe(true)
    if (!plan.ok) throw new Error("expected ok")
    expect(plan.to).toBe("leistungen@arbeitsagentur.de")
  })

  it("refuses when the per-send confirmation is absent", () => {
    // Approving content and sending it are different acts; this is the one that
    // stops an approval from being treated as permission to deliver.
    expect(blockersOf({ sendConfirmed: false })).toContain("SEND_NOT_CONFIRMED")
  })

  it("refuses when the recipient was not explicitly confirmed", () => {
    expect(blockersOf({ recipientConfirmed: false })).toContain("RECIPIENT_NOT_CONFIRMED")
  })
})

describe("only a currently approved artifact may be sent", () => {
  it("refuses a send that was never approved", () => {
    expect(blockersOf({ approved: false })).toContain("NOT_APPROVED")
  })

  it("reports a changed-after-approval document distinctly from an unapproved one", () => {
    // The two need different words on screen: one means "you never approved it",
    // the other "you approved an earlier version and then edited it".
    const blockers = blockersOf({ approved: false, approvalInvalidated: true })
    expect(blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
    expect(blockers).not.toContain("NOT_APPROVED")
  })

  it("refuses while facts the draft depends on are unconfirmed", () => {
    expect(blockersOf({ unconfirmedCriticalFactKeys: ["tax_id"] })).toContain("UNCONFIRMED_FACTS")
  })

  it("refuses when required information is still missing", () => {
    expect(blockersOf({ missingComplete: false })).toContain("MISSING_INFORMATION")
  })

  it("refuses a draft whose review is blocked", () => {
    const blockers = blockersOf({
      draft: { id: "d", contentHash: HASH_A, reviewStatus: "block", recipient: "a@b.de", model: null },
    })
    expect(blockers).toContain("REVIEW_BLOCKED")
  })
})

describe("a recipient is never invented or repaired", () => {
  it("refuses a missing recipient", () => {
    const blockers = blockersOf({
      draft: { id: "d", contentHash: HASH_A, reviewStatus: "pending", recipient: null, model: null },
    })
    expect(blockers).toContain("RECIPIENT_MISSING")
  })

  it("refuses instead of guessing when the address is malformed", () => {
    const check = checkRecipient({ recipient: "arbeitsagentur", confirmed: true })
    expect(check.ok).toBe(false)
    if (check.ok) throw new Error("expected refusal")
    expect(check.code).toBe("RECIPIENT_MALFORMED")
  })

  it("rejects an obvious injection attempt", () => {
    expect(checkRecipient({ recipient: "a@b.de\nBcc: attacker@evil.test", confirmed: true }).ok).toBe(false)
    expect(checkRecipient({ recipient: "a@b.de, c@d.de", confirmed: true }).ok).toBe(false)
  })

  it("preserves the local part casing rather than normalising it", () => {
    // Lowercasing a local part can change which mailbox receives a message.
    const check = checkRecipient({ recipient: "Leistungen.Team@Arbeitsagentur.de", confirmed: true })
    expect(check.ok).toBe(true)
    if (!check.ok) throw new Error("expected ok")
    expect(check.to).toBe("Leistungen.Team@Arbeitsagentur.de")
  })

  it("redacts a recipient for audit without collapsing distinct addresses", () => {
    expect(redactRecipient("leistungen@arbeitsagentur.de")).toBe("le***@arbeitsagentur.de")
    expect(redactRecipient("ab@x.de")).not.toBe(redactRecipient("cd@x.de"))
    expect(redactRecipient("leistungen@arbeitsagentur.de")).not.toContain("leistungen@")
  })
})

describe("attachments are bound to the exact bytes", () => {
  const recorded = [{ storagePath: "o/c/a-1.pdf", sha256: HASH_A }]
  const readable = [
    {
      storagePath: "o/c/a-1.pdf",
      filename: "a-1.pdf",
      contentType: "application/pdf",
      sizeBytes: 1000,
      sha256: HASH_A,
      bytes: new Uint8Array([1, 2, 3]),
    },
  ]

  it("sends only what was selected and verified", () => {
    const plan = planSend(
      base({
        expectedAttachments: recorded,
        selectedAttachmentPaths: ["o/c/a-1.pdf"],
        actualAttachments: readable,
      }),
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) throw new Error("expected ok")
    expect(plan.attachments).toHaveLength(1)
    expect(plan.attachments[0].sha256).toBe(HASH_A)
  })

  it("refuses when the bytes no longer match the recorded hash", () => {
    // A path can come to name different bytes; the hash is what binds the preview
    // the user saw to what is actually delivered.
    const plan = planSend(
      base({
        expectedAttachments: recorded,
        selectedAttachmentPaths: ["o/c/a-1.pdf"],
        actualAttachments: [{ ...readable[0], sha256: HASH_B }],
      }),
    )
    expect(plan.ok).toBe(false)
    if (plan.ok) throw new Error("expected refusal")
    expect(plan.blockers).toContain("ATTACHMENT_CHANGED")
  })

  it("refuses a selected attachment that is not part of the draft", () => {
    // Silently dropping it would let the user believe they attached it.
    expect(
      blockersOf({
        expectedAttachments: recorded,
        selectedAttachmentPaths: ["o/c/a-1.pdf", "o/c/unknown.pdf"],
        actualAttachments: readable,
      }),
    ).toContain("ATTACHMENT_NOT_SELECTED")
  })

  it("refuses when a recorded attachment cannot be read", () => {
    expect(
      blockersOf({
        expectedAttachments: recorded,
        selectedAttachmentPaths: ["o/c/a-1.pdf"],
        actualAttachments: [],
      }),
    ).toContain("ATTACHMENT_UNREADABLE")
  })

  it("refuses an oversized message rather than truncating it", () => {
    const blockers = blockersOf({
      expectedAttachments: recorded,
      selectedAttachmentPaths: ["o/c/a-1.pdf"],
      actualAttachments: [
        { ...readable[0], sizeBytes: SEND_ATTACHMENT_TOTAL_MAX_BYTES + 1 },
      ],
    })
    expect(blockers).toContain("ATTACHMENT_LIMIT_EXCEEDED")
  })
})

describe("no fake delivery success", () => {
  it("reports provider unavailability as a clean state, not a send", () => {
    const blockers = blockersOf({ providerAvailable: false })
    expect(blockers).toContain("PROVIDER_UNAVAILABLE")
  })

  it("the default provider truthfully reports it cannot send", async () => {
    expect(await unavailableProvider.isAvailable()).toBe(false)
    const result = await unavailableProvider.send({
      to: "a@b.de",
      subject: "s",
      body: "b",
      attachments: [],
    })
    expect(result.status).toBe("UNAVAILABLE")
    if (result.status !== "UNAVAILABLE") throw new Error("expected unavailable")
    expect(result.reason).toBe("no_provider_configured")
  })
})

describe("duplicate sends are protected against", () => {
  it("refuses to repeat a recorded success without an explicit resend", () => {
    expect(blockersOf({ alreadySent: true })).toContain("ALREADY_SENT")
  })

  it("allows an explicit, user-confirmed resend", () => {
    const plan = planSend(base({ alreadySent: true, resendConfirmed: true }))
    expect(plan.ok).toBe(true)
  })

  it("changes the identity when the message changes", () => {
    // Same message => same key, so a retry of a failed send is recognisable.
    const a = sendIdempotencyKey({ draftId: "d", contentHash: HASH_A, to: "a@b.de", attachmentSha256: [] })
    const b = sendIdempotencyKey({ draftId: "d", contentHash: HASH_A, to: "a@b.de", attachmentSha256: [] })
    expect(a).toBe(b)

    // Any change to content, recipient or attachments => different key, so a
    // changed message can never be mistaken for the one already sent.
    expect(sendIdempotencyKey({ draftId: "d", contentHash: HASH_B, to: "a@b.de", attachmentSha256: [] })).not.toBe(a)
    expect(sendIdempotencyKey({ draftId: "d", contentHash: HASH_A, to: "x@b.de", attachmentSha256: [] })).not.toBe(a)
    expect(sendIdempotencyKey({ draftId: "d", contentHash: HASH_A, to: "a@b.de", attachmentSha256: [HASH_B] })).not.toBe(a)
  })

  it("gives a confirmed resend its own identity", () => {
    const once = sendIdempotencyKey({ draftId: "d", contentHash: HASH_A, to: "a@b.de", attachmentSha256: [] })
    const twice = sendIdempotencyKey({
      draftId: "d",
      contentHash: HASH_A,
      to: "a@b.de",
      attachmentSha256: [],
      resendNonce: "1:0",
    })
    expect(twice).not.toBe(once)
  })
})

describe("a send record cannot itself be sent", () => {
  it("recognises a send record by its marker", () => {
    expect(isSendRecordDraft(SEND_RECORD_MODEL)).toBe(true)
    expect(isSendRecordDraft("gpt-4")).toBe(false)
    expect(isSendRecordDraft(null)).toBe(false)
  })

  it("refuses to send a send record", () => {
    const blockers = blockersOf({
      draft: {
        id: "rec-1",
        contentHash: HASH_A,
        reviewStatus: "pending",
        recipient: "a@b.de",
        model: SEND_RECORD_MODEL,
      },
    })
    expect(blockers).toContain("IS_SEND_RECORD")
  })
})

describe("the recorded body states the outcome plainly", () => {
  it("never claims delivery without a provider message id", () => {
    const body = renderSendBody({
      state: "PROVIDER_UNAVAILABLE",
      recipientRedacted: "le***@arbeitsagentur.de",
      providerKey: "none",
      contentHash: HASH_A,
      attachments: [],
      originalBody: "Original",
    })
    expect(body).toContain("Status: PROVIDER_UNAVAILABLE")
    expect(body).not.toContain("Anbieter-Nachrichten-ID")
  })

  it("records the provider message id when delivery was accepted", () => {
    const body = renderSendBody({
      state: "SENT",
      recipientRedacted: "le***@arbeitsagentur.de",
      providerKey: "some-transport",
      providerMessageId: "msg-123",
      contentHash: HASH_A,
      attachments: [{ filename: "a.pdf", sha256: HASH_A, sizeBytes: 10 }],
      originalBody: "Original",
    })
    expect(body).toContain("Anbieter-Nachrichten-ID: msg-123")
    expect(body).toContain("a.pdf")
  })

  it("does not include the plaintext recipient", () => {
    const body = renderSendBody({
      state: "SENT",
      recipientRedacted: "le***@arbeitsagentur.de",
      providerKey: "t",
      providerMessageId: "m",
      contentHash: HASH_A,
      attachments: [],
      originalBody: "Original",
    })
    expect(body).not.toContain("leistungen@")
  })

  it("labels each state unambiguously in the subject", () => {
    expect(renderSendSubject("Antrag", "SENT")).toContain("Gesendet")
    expect(renderSendSubject("Antrag", "FAILED")).toContain("fehlgeschlagen")
    expect(renderSendSubject("Antrag", "PROVIDER_UNAVAILABLE")).toContain("nicht möglich")
    expect(renderSendSubject("Antrag", "BLOCKED")).toContain("blockiert")
  })
})