/**
 * Advisor review lifecycle — deterministic helpers.
 *
 *   draft → in_review → approved → published → superseded
 *
 * Transitions are pure functions that return a new review record; a historical
 * version is never mutated in place. Invalid transitions, approvals without a
 * reviewer or timestamp, and publishing without an approved review are rejected
 * with an explicit error rather than silently corrected.
 */

import { type AdvisorReview, type CapitalReviewState } from "../boundaries"

/** Allowed forward transitions. `published` may be retired by `superseded`. */
export const REVIEW_TRANSITIONS: Readonly<Record<CapitalReviewState, readonly CapitalReviewState[]>> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["published", "superseded"],
  published: ["superseded"],
  superseded: [],
}

export type ReviewTransitionIssueCode =
  | "TRANSITION_NOT_ALLOWED"
  | "REVIEWER_REQUIRED"
  | "REVIEWED_AT_REQUIRED"
  | "SCENARIO_REQUIRED"
  | "HOUSEHOLD_MISMATCH"
  | "APPROVAL_REQUIRED_FOR_PUBLISH"
  | "REVIEW_SUPERSEDED"

export type ReviewTransitionIssue = {
  code: ReviewTransitionIssueCode
  message: string
}

export type ReviewTransitionResult =
  | { ok: true; review: AdvisorReview; issues: [] }
  | { ok: false; review: AdvisorReview; issues: ReviewTransitionIssue[] }

export function canTransition(from: CapitalReviewState, to: CapitalReviewState): boolean {
  return REVIEW_TRANSITIONS[from].includes(to)
}

export type CreateReviewInput = {
  id: string
  householdId: string
  scenarioId: string
  notes?: string | null
  reviewedVersion?: number
}

/** A new review always starts as `draft` with no reviewer and no timestamp. */
export function createAdvisorReview(input: CreateReviewInput): AdvisorReview {
  return {
    id: input.id,
    householdId: input.householdId,
    scenarioId: input.scenarioId,
    state: "draft",
    reviewerId: null,
    reviewedAt: null,
    notes: input.notes ?? null,
    reviewedVersion: input.reviewedVersion ?? 1,
  }
}

export type TransitionReviewInput = {
  /** Required when moving to `approved` or later; identifies the human reviewer. */
  reviewerId?: string | null
  /** Required when moving to `approved` or later; ISO-8601 timestamp. */
  reviewedAt?: string | null
  notes?: string | null
}

/**
 * Applies a transition and returns a new review. The previous record is never
 * mutated, so historical versions stay intact for audit.
 *
 * `approved` and `published` require both a reviewer and a review timestamp;
 * `published` additionally requires that the current state is `approved`.
 */
export function transitionReview(
  review: AdvisorReview,
  to: CapitalReviewState,
  input: TransitionReviewInput = {},
): ReviewTransitionResult {
  const issues: ReviewTransitionIssue[] = []

  if (!canTransition(review.state, to)) {
    issues.push({
      code: "TRANSITION_NOT_ALLOWED",
      message: `Cannot transition review from "${review.state}" to "${to}".`,
    })
    return { ok: false, review, issues }
  }

  const requiresApprovalMetadata = to === "approved"
  const reviewerId = input.reviewerId?.trim() || null
  const reviewedAt = input.reviewedAt?.trim() || null

  if (requiresApprovalMetadata && reviewerId === null) {
    issues.push({ code: "REVIEWER_REQUIRED", message: `A reviewer is required to move to "${to}".` })
  }
  if (requiresApprovalMetadata && reviewedAt === null) {
    issues.push({ code: "REVIEWED_AT_REQUIRED", message: `A review timestamp is required to move to "${to}".` })
  }
  if (to === "published" && review.state !== "approved") {
    issues.push({
      code: "APPROVAL_REQUIRED_FOR_PUBLISH",
      message: "Publishing requires an approved review.",
    })
  }
  // Publishing an approved review that never recorded a reviewer or timestamp
  // is not a valid approval, so it must not become publishable.
  if (to === "published" && (review.reviewerId === null || review.reviewedAt === null)) {
    issues.push({
      code: "APPROVAL_REQUIRED_FOR_PUBLISH",
      message: "Publishing requires an approved review with reviewer and timestamp.",
    })
  }

  if (issues.length > 0) return { ok: false, review, issues }

  return {
    ok: true,
    review: {
      ...review,
      state: to,
      // Confirmation metadata is carried forward once set; never inferred.
      reviewerId: reviewerId ?? review.reviewerId,
      reviewedAt: reviewedAt ?? review.reviewedAt,
      notes: input.notes ?? review.notes,
      reviewedVersion: to === "in_review" ? review.reviewedVersion + 1 : review.reviewedVersion,
    },
    issues: [],
  }
}

/** Convenience wrappers for the lifecycle edges. */
export function submitReview(review: AdvisorReview, input: TransitionReviewInput = {}): ReviewTransitionResult {
  return transitionReview(review, "in_review", input)
}

export function approveReview(review: AdvisorReview, input: TransitionReviewInput): ReviewTransitionResult {
  return transitionReview(review, "approved", input)
}

export function publishReview(review: AdvisorReview, input: TransitionReviewInput): ReviewTransitionResult {
  return transitionReview(review, "published", input)
}

export function supersedeReview(review: AdvisorReview, input: TransitionReviewInput = {}): ReviewTransitionResult {
  return transitionReview(review, "superseded", input)
}

/** True when the review carries the metadata approval requires. */
export function isApprovalComplete(review: AdvisorReview): boolean {
  return (
    (review.state === "approved" || review.state === "published") &&
    review.reviewerId !== null &&
    review.reviewedAt !== null
  )
}
