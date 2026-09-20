/**
 * P8 — draft approval gating.
 *
 * The rule this module encodes is that content may only leave the system when
 * the user has approved *that exact content*. Approval is bound to the draft's
 * SHA-256 content hash, so any later edit produces a different hash and the
 * earlier approval stops matching. Nothing is rewritten or deleted when that
 * happens: the historic approval row stays intact and simply no longer applies,
 * which is why validity is computed rather than stored as a flag.
 *
 * Blocking is expressed as an ordered list of reasons rather than a boolean so
 * the interface can tell the user what is actually missing. An unapproved send
 * is refused for a stated reason, not silently.
 *
 * This module is pure and decides nothing about authorization: it only answers
 * whether a given draft, with its facts and approvals, is releasable. Ownership
 * is enforced by the repository, which reads through the session client with an
 * explicit `owner_id` filter.
 */

import { isApprovalValid } from "./approval"
import type { CaseApproval, CaseDraft, MissingInformation } from "./contract"

export const DRAFT_RELEASE_BLOCKERS = [
  "NO_DRAFT",
  "UNCONFIRMED_FACTS",
  "MISSING_INFORMATION",
  "REVIEW_BLOCKED",
  "NOT_APPROVED",
  "CONTENT_CHANGED_SINCE_APPROVAL",
] as const

export type DraftReleaseBlocker = (typeof DRAFT_RELEASE_BLOCKERS)[number]

export type DraftReleaseAssessment = {
  releasable: boolean
  blockers: DraftReleaseBlocker[]
  /** True when the draft was approved, but its content changed afterwards. */
  approvalInvalidated: boolean
}

/**
 * `CONTENT_CHANGED_SINCE_APPROVAL` is kept distinct from `NOT_APPROVED` because
 * the two need different words on screen: one means "you never approved this",
 * the other means "you approved an earlier version and then edited it". Telling
 * a user the second thing when the first is true would be misleading, and
 * collapsing them would hide the fact that their edit invalidated an approval.
 */
export function assessDraftRelease(input: {
  draft: CaseDraft | null
  missing: MissingInformation | null
  approvals: readonly CaseApproval[]
  /**
   * Facts whose lack of confirmation must block release. Passed in rather than
   * derived here so the caller states which keys are critical for its module.
   */
  unconfirmedCriticalFactKeys?: readonly string[]
}): DraftReleaseAssessment {
  const { draft, missing, approvals } = input
  const blockers: DraftReleaseBlocker[] = []

  if (!draft) {
    return { releasable: false, blockers: ["NO_DRAFT"], approvalInvalidated: false }
  }

  const critical = input.unconfirmedCriticalFactKeys ?? missing?.unconfirmedCriticalFactKeys ?? []
  if (critical.length > 0) blockers.push("UNCONFIRMED_FACTS")
  if (missing && !missing.complete) blockers.push("MISSING_INFORMATION")
  if (draft.reviewStatus === "block") blockers.push("REVIEW_BLOCKED")

  const matching = approvals.filter((approval) => approval.draftId === draft.id)
  const approvedHashes = matching.map((approval) => approval.approvedHash)
  const currentlyApproved = approvedHashes.some((hash) =>
    isApprovalValid(hash, draft.contentHash),
  )

  // An approval exists for this draft, but none of them match its current
  // content — so it was approved and then changed.
  const approvalInvalidated = !currentlyApproved && approvedHashes.length > 0

  if (!currentlyApproved) {
    blockers.push(approvalInvalidated ? "CONTENT_CHANGED_SINCE_APPROVAL" : "NOT_APPROVED")
  }

  return { releasable: blockers.length === 0, blockers, approvalInvalidated }
}

/**
 * Whether a draft may be approved right now.
 *
 * Approval is the user asserting that this content is correct, so it is refused
 * while facts the draft depends on are still unconfirmed. Otherwise a user could
 * approve text generated from an unverified fact and the approval would appear
 * to endorse a fact they never checked.
 */
export function canApproveDraft(input: {
  draft: CaseDraft | null
  missing: MissingInformation | null
}): { allowed: boolean; reason: DraftReleaseBlocker | null } {
  if (!input.draft) return { allowed: false, reason: "NO_DRAFT" }
  if (input.draft.reviewStatus === "block") return { allowed: false, reason: "REVIEW_BLOCKED" }
  const critical = input.missing?.unconfirmedCriticalFactKeys ?? []
  if (critical.length > 0) return { allowed: false, reason: "UNCONFIRMED_FACTS" }
  return { allowed: true, reason: null }
}