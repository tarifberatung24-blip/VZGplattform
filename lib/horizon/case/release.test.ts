import { describe, expect, it } from "vitest"
import { assessDraftRelease, canApproveDraft, DRAFT_RELEASE_BLOCKERS } from "./release"
import type { CaseApproval, CaseDraft, MissingInformation } from "./contract"

const draft = (overrides: Partial<CaseDraft> = {}): CaseDraft => ({
  id: "draft-1",
  caseId: "case-1",
  version: 1,
  subject: "Kündigung",
  body: "Sehr geehrte Damen und Herren, …",
  recipient: "Firma",
  contentHash: "a".repeat(64),
  reviewStatus: "pending",
  model: "test-model",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

const approval = (overrides: Partial<CaseApproval> = {}): CaseApproval => ({
  id: "approval-1",
  caseId: "case-1",
  draftId: "draft-1",
  approvedHash: "a".repeat(64),
  approvedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

const complete: MissingInformation = {
  missingFactKeys: [],
  unconfirmedCriticalFactKeys: [],
  complete: true,
}

describe("assessDraftRelease", () => {
  it("releases only a draft whose current content is approved and whose inputs are settled", () => {
    const result = assessDraftRelease({ draft: draft(), missing: complete, approvals: [approval()] })
    expect(result.releasable).toBe(true)
    expect(result.blockers).toEqual([])
  })

  it("blocks release when there is no draft", () => {
    const result = assessDraftRelease({ draft: null, missing: complete, approvals: [] })
    expect(result.releasable).toBe(false)
    expect(result.blockers).toEqual(["NO_DRAFT"])
  })

  /**
   * The central P8 invariant: approval binds to a content hash, so editing the
   * draft after approval must invalidate it without touching the historic
   * approval row. If this regressed, a user could edit approved text and the
   * system would still report it as approved.
   */
  it("blocks release when the content changed after approval", () => {
    const edited = draft({ contentHash: "b".repeat(64) })
    const result = assessDraftRelease({ draft: edited, missing: complete, approvals: [approval()] })
    expect(result.releasable).toBe(false)
    expect(result.blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
    expect(result.approvalInvalidated).toBe(true)
  })

  it("distinguishes never-approved from approved-then-edited", () => {
    const never = assessDraftRelease({ draft: draft(), missing: complete, approvals: [] })
    expect(never.blockers).toContain("NOT_APPROVED")
    expect(never.blockers).not.toContain("CONTENT_CHANGED_SINCE_APPROVAL")
    expect(never.approvalInvalidated).toBe(false)

    const edited = assessDraftRelease({
      draft: draft({ contentHash: "b".repeat(64) }),
      missing: complete,
      approvals: [approval()],
    })
    expect(edited.blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
    expect(edited.blockers).not.toContain("NOT_APPROVED")
  })

  it("does not let an approval of a different draft version release this one", () => {
    const other = approval({ draftId: "draft-2" })
    const result = assessDraftRelease({ draft: draft(), missing: complete, approvals: [other] })
    expect(result.releasable).toBe(false)
    expect(result.blockers).toContain("NOT_APPROVED")
    // The other draft's approval must not be reinterpreted as an edit.
    expect(result.approvalInvalidated).toBe(false)
  })

  it("blocks release while facts the draft depends on are unconfirmed", () => {
    const result = assessDraftRelease({
      draft: draft(),
      missing: { missingFactKeys: [], unconfirmedCriticalFactKeys: ["recipient"], complete: false },
      approvals: [approval()],
    })
    expect(result.releasable).toBe(false)
    expect(result.blockers).toContain("UNCONFIRMED_FACTS")
    expect(result.blockers).toContain("MISSING_INFORMATION")
  })

  it("blocks release when the draft is marked blocked", () => {
    const result = assessDraftRelease({
      draft: draft({ reviewStatus: "block" }),
      missing: complete,
      approvals: [approval()],
    })
    expect(result.releasable).toBe(false)
    expect(result.blockers).toContain("REVIEW_BLOCKED")
  })

  it("rejects any unknown hash shape rather than treating it as approved", () => {
    for (const approvedHash of ["", "not-a-hash", "a".repeat(63), "A".repeat(64)]) {
      const result = assessDraftRelease({
        draft: draft(),
        missing: complete,
        approvals: [approval({ approvedHash })],
      })
      expect(result.releasable).toBe(false)
    }
  })

  it("uses only the declared blocker vocabulary", () => {
    expect([...DRAFT_RELEASE_BLOCKERS]).toEqual([
      "NO_DRAFT",
      "UNCONFIRMED_FACTS",
      "MISSING_INFORMATION",
      "REVIEW_BLOCKED",
      "NOT_APPROVED",
      "CONTENT_CHANGED_SINCE_APPROVAL",
    ])
  })
})

describe("canApproveDraft", () => {
  it("allows approval of a draft whose facts are confirmed", () => {
    expect(canApproveDraft({ draft: draft(), missing: complete })).toEqual({
      allowed: true,
      reason: null,
    })
  })

  /** Approving text generated from an unverified fact would appear to endorse it. */
  it("refuses approval while critical facts are unconfirmed", () => {
    const gate = canApproveDraft({
      draft: draft(),
      missing: { missingFactKeys: [], unconfirmedCriticalFactKeys: ["recipient"], complete: false },
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("UNCONFIRMED_FACTS")
  })

  it("refuses approval of a blocked draft", () => {
    const gate = canApproveDraft({ draft: draft({ reviewStatus: "block" }), missing: complete })
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe("REVIEW_BLOCKED")
  })

  it("refuses approval when there is no draft", () => {
    expect(canApproveDraft({ draft: null, missing: complete })).toEqual({
      allowed: false,
      reason: "NO_DRAFT",
    })
  })
})