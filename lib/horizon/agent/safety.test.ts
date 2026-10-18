import { describe, expect, it } from "vitest"
import { evaluateHorizonAgentOperation } from "./safety"

const review = { reviewerId: "reviewer-1", reviewedAt: "2026-10-18T10:00:00.000Z", verdict: "pass" as const }
const approval = {
  approvedHash: "a".repeat(64),
  currentContentHash: "a".repeat(64),
  approvedAt: "2026-10-18T10:01:00.000Z",
}

describe("HORIZON agent safety policy", () => {
  it("permits analysis and drafting, not autonomous decisions", () => {
    expect(evaluateHorizonAgentOperation({ operation: "analyse_user_document" })).toMatchObject({
      allowed: true,
      reason: "ALLOWED_READ_OR_DRAFT",
    })
    expect(evaluateHorizonAgentOperation({ operation: "draft_content" })).toMatchObject({ allowed: true })
  })

  it("allows browsing only public, read-only information", () => {
    expect(evaluateHorizonAgentOperation({ operation: "browse_public_information" })).toMatchObject({
      allowed: true,
      reason: "ALLOWED_PUBLIC_READ_ONLY_BROWSING",
    })
    expect(evaluateHorizonAgentOperation({ operation: "access_authenticated_account" })).toMatchObject({
      allowed: false,
      reason: "AGENT_CANNOT_USE_AUTHENTICATED_ACCOUNT",
    })
  })

  it("requires identifiable human review before preparing an external handoff", () => {
    expect(evaluateHorizonAgentOperation({ operation: "prepare_external_handoff" })).toMatchObject({
      allowed: false,
      reason: "HUMAN_REVIEW_REQUIRED",
    })
  })

  it("requires exact customer approval after human review", () => {
    expect(evaluateHorizonAgentOperation({ operation: "prepare_external_handoff", humanReview: review })).toMatchObject({
      allowed: false,
      reason: "CUSTOMER_APPROVAL_REQUIRED",
    })
    expect(evaluateHorizonAgentOperation({
      operation: "prepare_external_handoff",
      humanReview: review,
      customerApproval: approval,
    })).toMatchObject({ allowed: true })
  })

  it("never allows an agent to send, sign or accept a contract", () => {
    for (const operation of ["send_external", "sign_or_accept_contract"] as const) {
      expect(evaluateHorizonAgentOperation({ operation, humanReview: review, customerApproval: approval })).toMatchObject({
        allowed: false,
        reason: "AGENT_CANNOT_EXECUTE_EXTERNAL_ACTION",
      })
    }
  })

  it("rejects a stale approval even if it has the right shape", () => {
    expect(evaluateHorizonAgentOperation({
      operation: "prepare_external_handoff",
      humanReview: review,
      customerApproval: { ...approval, currentContentHash: "b".repeat(64) },
    })).toMatchObject({ allowed: false, reason: "CUSTOMER_APPROVAL_REQUIRED" })
  })
})
