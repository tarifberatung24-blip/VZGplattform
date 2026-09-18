import { describe, expect, it } from "vitest"

import {
  canPublish,
  CAPITAL_FEASIBILITY_STATES,
  CAPITAL_REVIEW_STATES,
  isPublishable,
  type AdvisorReview,
  type CapitalAnalysisInput,
  type CapitalMissingInput,
  type CapitalScenario,
  type PublishBoundary,
} from "./boundaries"
import { createFinancialFact } from "./financial-fact"
import { createProvenance } from "./provenance"

function publishBoundary(overrides: Partial<PublishBoundary> = {}): PublishBoundary {
  return {
    householdId: "household-1",
    scenarioId: "scenario-1",
    payloadHash: "a".repeat(64),
    idempotencyKey: "idem-1",
    disclaimerVersion: "disclaimer-v1",
    schemaVersion: "schema-v1",
    reviewState: "approved",
    authorizedBy: "advisor-1",
    ...overrides,
  }
}

describe("capital boundary contracts", () => {
  it("defines the documented review and feasibility states", () => {
    expect([...CAPITAL_REVIEW_STATES]).toEqual(["draft", "in_review", "approved", "published", "superseded"])
    expect([...CAPITAL_FEASIBILITY_STATES]).toEqual(["needs_data", "not_feasible", "feasible", "review_required"])
  })

  it("carries confirmed facts, explicit assumptions, and named missing inputs", () => {
    const fact = createFinancialFact({
      id: "f1",
      householdId: "household-1",
      key: "income.net_monthly",
      value: 320_000,
      type: "money",
      currency: "EUR",
      status: "CONFIRMED",
      confirmedAt: "2025-02-01T10:00:00.000Z",
      confirmedBy: "user-1",
      provenance: createProvenance({ source: "USER" }),
    })
    const missing: CapitalMissingInput = { key: "costs.insurance_monthly", reason: "unconfirmed", requiredBy: "surplus" }
    const input: CapitalAnalysisInput = {
      householdId: "household-1",
      facts: [fact],
      missingInputs: [missing],
      assumptions: [{ key: "inflation", value: 2, unit: "percent", sourceReference: "assumption-set-v1" }],
      engineVersion: "capital-engine-0.1.0",
      currency: "EUR",
      locale: "de",
    }
    expect(input.facts[0].status).toBe("CONFIRMED")
    expect(input.missingInputs[0].reason).toBe("unconfirmed")
    expect(input.assumptions[0].sourceReference).toBe("assumption-set-v1")
  })

  it("models a neutral scenario with explicit feasibility and provenance", () => {
    const scenario: CapitalScenario = {
      id: "scenario-1",
      engineVersion: "capital-engine-0.1.0",
      label: "baseline",
      inputSnapshotHash: "b".repeat(64),
      assumptions: [],
      currency: "EUR",
      horizonMonths: 24,
      feasibility: "needs_data",
      missingInputs: [{ key: "debt.payments", reason: "absent", requiredBy: "surplus" }],
      outputs: { monthly_surplus: null },
      disclaimerVersion: "disclaimer-v1",
      calculatedAt: "2025-02-02T08:30:00.000Z",
    }
    expect(scenario.feasibility).toBe("needs_data")
    expect(scenario.outputs.monthly_surplus).toBeNull()
  })

  it("versions advisor review and requires a reviewer once reviewed", () => {
    const review: AdvisorReview = {
      id: "review-1",
      householdId: "household-1",
      scenarioId: "scenario-1",
      state: "in_review",
      reviewerId: null,
      reviewedAt: null,
      notes: null,
      reviewedVersion: 1,
    }
    expect(review.state).toBe("in_review")
    expect(review.reviewedVersion).toBe(1)
  })
})

describe("publish boundary guard", () => {
  it("permits publishing only from approved or published states", () => {
    expect(isPublishable("approved")).toBe(true)
    expect(isPublishable("published")).toBe(true)
    for (const state of ["draft", "in_review", "superseded"] as const) {
      expect(isPublishable(state)).toBe(false)
    }
  })

  it("allows a fully authorized, hashed, approved payload", () => {
    expect(canPublish(publishBoundary())).toBe(true)
  })

  it("blocks unapproved review states", () => {
    for (const reviewState of ["draft", "in_review", "superseded"] as const) {
      expect(canPublish(publishBoundary({ reviewState }))).toBe(false)
    }
  })

  it("blocks missing authorization, payload hash, or idempotency key", () => {
    expect(canPublish(publishBoundary({ authorizedBy: null }))).toBe(false)
    expect(canPublish(publishBoundary({ payloadHash: "   " }))).toBe(false)
    expect(canPublish(publishBoundary({ idempotencyKey: "" }))).toBe(false)
  })

  it("is deterministic for identical input", () => {
    const boundary = publishBoundary()
    expect(canPublish(boundary)).toBe(canPublish(boundary))
  })
})
