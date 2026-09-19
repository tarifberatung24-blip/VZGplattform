import { describe, expect, it } from "vitest"

import {
  approveReview,
  canTransition,
  createAdvisorReview,
  isApprovalComplete,
  publishReview,
  submitReview,
  supersedeReview,
  transitionReview,
} from "./lifecycle"

const REVIEWER = "advisor-1"
const REVIEWED_AT = "2025-03-02T10:00:00.000Z"

function draft() {
  return createAdvisorReview({ id: "review-1", householdId: "hh-1", scenarioId: "scenario-1" })
}

function inReview() {
  const result = submitReview(draft())
  if (!result.ok) throw new Error("setup failed")
  return result.review
}

function approved() {
  const result = approveReview(inReview(), { reviewerId: REVIEWER, reviewedAt: REVIEWED_AT })
  if (!result.ok) throw new Error("setup failed")
  return result.review
}

describe("advisor review lifecycle", () => {
  it("starts as draft with no reviewer or timestamp", () => {
    const review = draft()
    expect(review.state).toBe("draft")
    expect(review.reviewerId).toBeNull()
    expect(review.reviewedAt).toBeNull()
  })

  it("walks the full valid lifecycle draft to superseded", () => {
    const submitted = submitReview(draft())
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return
    expect(submitted.review.state).toBe("in_review")

    const approvedResult = approveReview(submitted.review, { reviewerId: REVIEWER, reviewedAt: REVIEWED_AT })
    expect(approvedResult.ok).toBe(true)
    if (!approvedResult.ok) return
    expect(approvedResult.review.state).toBe("approved")

    const published = publishReview(approvedResult.review, { reviewerId: REVIEWER, reviewedAt: REVIEWED_AT })
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(published.review.state).toBe("published")

    const superseded = supersedeReview(published.review)
    expect(superseded.ok).toBe(true)
    if (!superseded.ok) return
    expect(superseded.review.state).toBe("superseded")
  })

  it("rejects an invalid transition", () => {
    const result = transitionReview(draft(), "published")
    expect(result.ok).toBe(false)
    expect(result.issues[0].code).toBe("TRANSITION_NOT_ALLOWED")
  })

  it("cannot leave superseded", () => {
    const superseded = supersedeReview(approved())
    expect(superseded.ok).toBe(true)
    if (!superseded.ok) return
    expect(canTransition("superseded", "draft")).toBe(false)
    expect(transitionReview(superseded.review, "draft").ok).toBe(false)
  })

  it("requires a reviewer to approve", () => {
    const result = approveReview(inReview(), { reviewedAt: REVIEWED_AT })
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "REVIEWER_REQUIRED")).toBe(true)
  })

  it("requires a review timestamp to approve", () => {
    const result = approveReview(inReview(), { reviewerId: REVIEWER })
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "REVIEWED_AT_REQUIRED")).toBe(true)
  })

  it("does not mutate the historical review on transition", () => {
    const original = inReview()
    const snapshot = JSON.stringify(original)
    approveReview(original, { reviewerId: REVIEWER, reviewedAt: REVIEWED_AT })
    expect(JSON.stringify(original)).toBe(snapshot)
    expect(original.state).toBe("in_review")
    expect(original.reviewerId).toBeNull()
  })

  it("returns a new object rather than the same reference", () => {
    const original = inReview()
    const result = approveReview(original, { reviewerId: REVIEWER, reviewedAt: REVIEWED_AT })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.review).not.toBe(original)
  })

  it("reports approval completeness only with reviewer and timestamp", () => {
    expect(isApprovalComplete(inReview())).toBe(false)
    expect(isApprovalComplete(approved())).toBe(true)
  })

  it("carries approval metadata forward to published", () => {
    const published = publishReview(approved(), {})
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(published.review.reviewerId).toBe(REVIEWER)
    expect(published.review.reviewedAt).toBe(REVIEWED_AT)
  })

  it("bumps the reviewed version when entering review", () => {
    const review = createAdvisorReview({
      id: "review-2",
      householdId: "hh-1",
      scenarioId: "scenario-2",
      reviewedVersion: 3,
    })
    const submitted = submitReview(review)
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return
    expect(submitted.review.reviewedVersion).toBe(4)
  })
})
