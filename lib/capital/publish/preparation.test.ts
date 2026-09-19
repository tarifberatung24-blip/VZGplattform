import { describe, expect, it } from "vitest"

import type { CapitalScenario } from "../boundaries"
import { createAdvisorReview, approveReview, submitReview } from "../review/lifecycle"
import {
  CAPITAL_PUBLISH_SCHEMA_VERSION,
  buildPublishPayload,
  checkPublishReplay,
  hashPublishPayload,
  preparePublish,
} from "./preparation"

const HOUSEHOLD = "hh-1"
const SCENARIO_ID = "scenario-1"

function scenario(overrides: Partial<CapitalScenario> = {}): CapitalScenario {
  return {
    id: SCENARIO_ID,
    engineVersion: "capital-core-1.0.0",
    label: "baseline",
    inputSnapshotHash: "abc123",
    assumptions: [{ key: "reserveMonths", value: 6, unit: "months", sourceReference: "owner" }],
    currency: "EUR",
    horizonMonths: null,
    feasibility: "feasible",
    missingInputs: [],
    outputs: { monthly_available_surplus: 135_000 },
    disclaimerVersion: "capital-disclaimer-v1",
    calculatedAt: "2025-03-01T09:00:00.000Z",
    ...overrides,
  }
}

function approvedReview() {
  const submitted = submitReview(createAdvisorReview({ id: "review-1", householdId: HOUSEHOLD, scenarioId: SCENARIO_ID }))
  if (!submitted.ok) throw new Error("setup failed")
  const approved = approveReview(submitted.review, {
    reviewerId: "advisor-1",
    reviewedAt: "2025-03-02T10:00:00.000Z",
  })
  if (!approved.ok) throw new Error("setup failed")
  return approved.review
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    householdId: HOUSEHOLD,
    scenario: scenario(),
    review: approvedReview(),
    authorizedBy: "advisor-1",
    idempotencyKey: "idem-1",
    ...overrides,
  }
}

describe("publish preparation", () => {
  it("prepares a boundary and payload from an approved review", () => {
    const result = preparePublish(validInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.boundary.reviewState).toBe("approved")
    expect(result.boundary.householdId).toBe(HOUSEHOLD)
    expect(result.boundary.scenarioId).toBe(SCENARIO_ID)
    expect(result.boundary.idempotencyKey).toBe("idem-1")
    expect(result.boundary.disclaimerVersion).toBe("capital-disclaimer-v1")
    expect(result.boundary.schemaVersion).toBe(CAPITAL_PUBLISH_SCHEMA_VERSION)
    expect(result.payloadHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("requires an approved review before publication", () => {
    const draft = createAdvisorReview({ id: "review-2", householdId: HOUSEHOLD, scenarioId: SCENARIO_ID })
    const result = preparePublish(validInput({ review: draft }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "REVIEW_NOT_APPROVED")).toBe(true)
  })

  it("blocks publishing for the wrong household", () => {
    const foreign = createAdvisorReview({ id: "review-3", householdId: "hh-2", scenarioId: SCENARIO_ID })
    const submitted = submitReview(foreign)
    if (!submitted.ok) throw new Error("setup failed")
    const approved = approveReview(submitted.review, {
      reviewerId: "advisor-1",
      reviewedAt: "2025-03-02T10:00:00.000Z",
    })
    if (!approved.ok) throw new Error("setup failed")
    const result = preparePublish(validInput({ review: approved.review }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "HOUSEHOLD_MISMATCH")).toBe(true)
  })

  it("blocks publishing a review that references another scenario", () => {
    const other = createAdvisorReview({ id: "review-4", householdId: HOUSEHOLD, scenarioId: "scenario-9" })
    const submitted = submitReview(other)
    if (!submitted.ok) throw new Error("setup failed")
    const approved = approveReview(submitted.review, {
      reviewerId: "advisor-1",
      reviewedAt: "2025-03-02T10:00:00.000Z",
    })
    if (!approved.ok) throw new Error("setup failed")
    const result = preparePublish(validInput({ review: approved.review }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "REVIEW_REQUIRED")).toBe(true)
  })

  it("requires authorization", () => {
    const result = preparePublish(validInput({ authorizedBy: null }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "AUTHORIZATION_REQUIRED")).toBe(true)
  })

  it("requires an idempotency key", () => {
    const result = preparePublish(validInput({ idempotencyKey: null }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "IDEMPOTENCY_KEY_REQUIRED")).toBe(true)
  })

  it("requires a household and scenario", () => {
    const result = preparePublish(validInput({ householdId: "" }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.code === "HOUSEHOLD_REQUIRED")).toBe(true)
  })

  it("requires a disclaimer version and a scenario input hash", () => {
    const missingDisclaimer = preparePublish(validInput({ scenario: scenario({ disclaimerVersion: "" }) }))
    expect(missingDisclaimer.ok).toBe(false)
    if (!missingDisclaimer.ok) {
      expect(missingDisclaimer.issues.some((issue) => issue.code === "DISCLAIMER_VERSION_REQUIRED")).toBe(true)
    }
    const missingHash = preparePublish(validInput({ scenario: scenario({ inputSnapshotHash: "" }) }))
    expect(missingHash.ok).toBe(false)
    if (!missingHash.ok) {
      expect(missingHash.issues.some((issue) => issue.code === "SCENARIO_HASH_MISSING")).toBe(true)
    }
  })

  it("produces a deterministic payload hash", () => {
    const first = preparePublish(validInput())
    const second = preparePublish(validInput())
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.payloadHash).toBe(second.payloadHash)
  })

  it("hashes independently of key order in the payload", () => {
    const payload = buildPublishPayload(scenario(), HOUSEHOLD, CAPITAL_PUBLISH_SCHEMA_VERSION)
    const reordered: typeof payload = {
      schemaVersion: payload.schemaVersion,
      scenarioId: payload.scenarioId,
      missingInputs: payload.missingInputs,
      householdId: payload.householdId,
      feasibility: payload.feasibility,
      engineVersion: payload.engineVersion,
      disclaimerVersion: payload.disclaimerVersion,
      currency: payload.currency,
      assumptions: payload.assumptions,
      outputs: payload.outputs,
    }
    expect(Object.keys(reordered)).not.toEqual(Object.keys(payload))
    expect(hashPublishPayload(reordered)).toBe(hashPublishPayload(payload))
  })

  it("changes the hash when the payload changes", () => {
    const baseline = buildPublishPayload(scenario(), HOUSEHOLD, CAPITAL_PUBLISH_SCHEMA_VERSION)
    const changed = buildPublishPayload(
      scenario({ outputs: { monthly_available_surplus: 1 } }),
      HOUSEHOLD,
      CAPITAL_PUBLISH_SCHEMA_VERSION,
    )
    expect(hashPublishPayload(changed)).not.toBe(hashPublishPayload(baseline))
  })

  it("excludes derived or advisor-only fields from the payload", () => {
    const payload = buildPublishPayload(scenario(), HOUSEHOLD, CAPITAL_PUBLISH_SCHEMA_VERSION)
    expect(Object.keys(payload).sort()).toEqual(
      [
        "assumptions",
        "currency",
        "disclaimerVersion",
        "engineVersion",
        "feasibility",
        "householdId",
        "missingInputs",
        "outputs",
        "scenarioId",
        "schemaVersion",
      ].sort(),
    )
    expect(payload).not.toHaveProperty("calculatedAt")
  })

  it("returns no boundary when preparation fails", () => {
    const result = preparePublish(validInput({ review: null as never }))
    expect(result.ok).toBe(false)
    expect(result.boundary).toBeNull()
    expect(result.payload).toBeNull()
    expect(result.payloadHash).toBeNull()
  })
})

describe("publish replay", () => {
  it("treats an unseen job as new", () => {
    expect(checkPublishReplay(null, { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" }).status).toBe("new")
  })

  it("replays the same key and payload", () => {
    const check = checkPublishReplay(
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" },
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" },
    )
    expect(check.status).toBe("replay")
  })

  it("conflicts when the key is reused for another household", () => {
    const check = checkPublishReplay(
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" },
      { idempotencyKey: "k", householdId: "hh-2", payloadHash: "h" },
    )
    expect(check.status).toBe("conflict")
  })

  it("conflicts when the key is reused with a different payload", () => {
    const check = checkPublishReplay(
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" },
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h2" },
    )
    expect(check.status).toBe("conflict")
  })

  it("treats a different key as a new job", () => {
    const check = checkPublishReplay(
      { idempotencyKey: "k", householdId: HOUSEHOLD, payloadHash: "h" },
      { idempotencyKey: "k2", householdId: HOUSEHOLD, payloadHash: "h" },
    )
    expect(check.status).toBe("new")
  })
})
