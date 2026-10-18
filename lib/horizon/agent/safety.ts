/**
 * HORIZON agent safety policy.
 *
 * This is deliberately a pure, deny-by-default policy module. It does not
 * call a model, a browser, a partner or an institution. Future agent tools
 * must ask this gate before an operation is made available.
 */

export const HORIZON_AGENT_OPERATIONS = [
  "read_case",
  "analyse_user_document",
  "extract_proposed_facts",
  "draft_content",
  "propose_next_step",
  "request_human_review",
  "browse_public_information",
  "prepare_external_handoff",
  "send_external",
  "sign_or_accept_contract",
  "access_authenticated_account",
] as const

export type HorizonAgentOperation = (typeof HORIZON_AGENT_OPERATIONS)[number]

export type HumanReviewEvidence = {
  reviewerId: string
  reviewedAt: string
  verdict: "pass"
}

export type CustomerApprovalEvidence = {
  /** The approval must refer to the exact current draft bytes. */
  approvedHash: string
  currentContentHash: string
  approvedAt: string
}

export const AGENT_SAFETY_REASONS = [
  "ALLOWED_READ_OR_DRAFT",
  "ALLOWED_PUBLIC_READ_ONLY_BROWSING",
  "HUMAN_REVIEW_REQUIRED",
  "CUSTOMER_APPROVAL_REQUIRED",
  "AGENT_CANNOT_EXECUTE_EXTERNAL_ACTION",
  "AGENT_CANNOT_USE_AUTHENTICATED_ACCOUNT",
] as const

export type AgentSafetyReason = (typeof AGENT_SAFETY_REASONS)[number]

export type AgentSafetyDecision = {
  allowed: boolean
  reason: AgentSafetyReason
  /** Stable, non-content event name for the canonical case audit trail. */
  auditAction: `agent_policy.${string}`
}

function isExactCustomerApproval(approval: CustomerApprovalEvidence | null | undefined): boolean {
  return Boolean(
    approval &&
      /^[a-f0-9]{64}$/.test(approval.approvedHash) &&
      approval.approvedHash === approval.currentContentHash &&
      approval.approvedAt.length > 0,
  )
}

/**
 * Decides whether an AI agent itself may perform the named operation.
 *
 * A positive result for `prepare_external_handoff` means only that a reviewed,
 * customer-approved package may be prepared. It is never permission for the
 * agent to transmit, sign, submit a form, accept an offer or control an
 * authenticated third-party account.
 */
export function evaluateHorizonAgentOperation(input: {
  operation: HorizonAgentOperation
  humanReview?: HumanReviewEvidence | null
  customerApproval?: CustomerApprovalEvidence | null
}): AgentSafetyDecision {
  switch (input.operation) {
    case "read_case":
    case "analyse_user_document":
    case "extract_proposed_facts":
    case "draft_content":
    case "propose_next_step":
    case "request_human_review":
      return {
        allowed: true,
        reason: "ALLOWED_READ_OR_DRAFT",
        auditAction: "agent_policy.read_or_draft_allowed",
      }
    case "browse_public_information":
      return {
        allowed: true,
        reason: "ALLOWED_PUBLIC_READ_ONLY_BROWSING",
        auditAction: "agent_policy.public_browsing_allowed",
      }
    case "prepare_external_handoff":
      if (!input.humanReview || input.humanReview.verdict !== "pass") {
        return {
          allowed: false,
          reason: "HUMAN_REVIEW_REQUIRED",
          auditAction: "agent_policy.human_review_required",
        }
      }
      if (!isExactCustomerApproval(input.customerApproval)) {
        return {
          allowed: false,
          reason: "CUSTOMER_APPROVAL_REQUIRED",
          auditAction: "agent_policy.customer_approval_required",
        }
      }
      return {
        allowed: true,
        reason: "ALLOWED_READ_OR_DRAFT",
        auditAction: "agent_policy.external_handoff_prepared",
      }
    case "send_external":
    case "sign_or_accept_contract":
      return {
        allowed: false,
        reason: "AGENT_CANNOT_EXECUTE_EXTERNAL_ACTION",
        auditAction: "agent_policy.external_action_denied",
      }
    case "access_authenticated_account":
      return {
        allowed: false,
        reason: "AGENT_CANNOT_USE_AUTHENTICATED_ACCOUNT",
        auditAction: "agent_policy.authenticated_account_denied",
      }
  }
}
