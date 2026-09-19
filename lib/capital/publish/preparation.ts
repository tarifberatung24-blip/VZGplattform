/**
 * Server-side publish preparation.
 *
 * This module *prepares* a publish job and validates its preconditions. It does
 * not publish: there is no storage write, no provider call, no network access,
 * and no customer-visible effect. The browser cannot invoke it directly because
 * the caller must supply an authorized advisor identity.
 *
 * Requirements mirror `docs/research/capital/VZG_CAPITAL_TARGET_ARCHITECTURE.md`:
 * target household, approved review, schema/disclaimer versions, canonical
 * payload hash, idempotency key, and authorization.
 */

import { type AdvisorReview, type CapitalScenario, type PublishBoundary, isPublishable } from "../boundaries"
import { canonicalize, sha256Hex } from "../snapshot"

/** Payload version of the published Capital document shape. */
export const CAPITAL_PUBLISH_SCHEMA_VERSION = "capital-publish-v1"

export type PublishPreparationIssueCode =
  | "HOUSEHOLD_REQUIRED"
  | "SCENARIO_REQUIRED"
  | "REVIEW_REQUIRED"
  | "REVIEW_NOT_APPROVED"
  | "HOUSEHOLD_MISMATCH"
  | "AUTHORIZATION_REQUIRED"
  | "SCHEMA_VERSION_REQUIRED"
  | "DISCLAIMER_VERSION_REQUIRED"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "SCENARIO_HASH_MISSING"

export type PublishPreparationIssue = {
  code: PublishPreparationIssueCode
  message: string
}

/** The canonical, unsigned payload that will later be published. */
export type CapitalPublishPayload = {
  householdId: string
  scenarioId: string
  engineVersion: string
  schemaVersion: string
  disclaimerVersion: string
  currency: string
  feasibility: string
  /** Deterministic engine outputs; no advisor-only or draft fields. */
  outputs: Readonly<Record<string, string | number | null>>
  assumptions: readonly { key: string; value: string | number | boolean; unit: string | null }[]
  missingInputs: readonly { key: string; reason: string; requiredBy: string }[]
}

export type PreparePublishInput = {
  householdId: string
  scenario: CapitalScenario
  review: AdvisorReview
  /** Advisor identity authorizing publication; server-derived, never client-supplied. */
  authorizedBy: string | null
  idempotencyKey: string | null
  schemaVersion?: string
}

export type PreparePublishResult =
  | { ok: true; boundary: PublishBoundary; payload: CapitalPublishPayload; payloadHash: string; issues: [] }
  | { ok: false; boundary: null; payload: null; payloadHash: null; issues: PublishPreparationIssue[] }

/** Builds the canonical publish payload; excludes any non-deterministic field. */
export function buildPublishPayload(
  scenario: CapitalScenario,
  householdId: string,
  schemaVersion: string,
): CapitalPublishPayload {
  return {
    householdId,
    scenarioId: scenario.id,
    engineVersion: scenario.engineVersion,
    schemaVersion,
    disclaimerVersion: scenario.disclaimerVersion,
    currency: scenario.currency,
    feasibility: scenario.feasibility,
    outputs: scenario.outputs,
    assumptions: scenario.assumptions.map((assumption) => ({
      key: assumption.key,
      value: assumption.value,
      unit: assumption.unit,
    })),
    missingInputs: scenario.missingInputs.map((missing) => ({
      key: missing.key,
      reason: missing.reason,
      requiredBy: missing.requiredBy,
    })),
  }
}

/** SHA-256 of the canonical payload. Stable across property ordering. */
export function hashPublishPayload(payload: CapitalPublishPayload): string {
  return sha256Hex(canonicalize(payload))
}

/**
 * Validates publish preconditions and returns a prepared boundary.
 *
 * Rejected when: the review is missing or not approved, the review belongs to
 * another household or scenario, authorization is absent, versions are missing,
 * the idempotency key is absent, or the scenario has no snapshot hash. The
 * function never fabricates a missing value to satisfy a precondition.
 */
export function preparePublish(input: PreparePublishInput): PreparePublishResult {
  const issues: PublishPreparationIssue[] = []

  if (!input.householdId.trim()) {
    issues.push({ code: "HOUSEHOLD_REQUIRED", message: "householdId is required." })
  }
  if (!input.scenario?.id?.trim()) {
    issues.push({ code: "SCENARIO_REQUIRED", message: "An approved scenario is required." })
  }
  if (!input.review) {
    issues.push({ code: "REVIEW_REQUIRED", message: "An approved review is required." })
  }
  if (!input.authorizedBy?.trim()) {
    issues.push({ code: "AUTHORIZATION_REQUIRED", message: "authorizedBy is required." })
  }
  if (!input.idempotencyKey?.trim()) {
    issues.push({ code: "IDEMPOTENCY_KEY_REQUIRED", message: "idempotencyKey is required." })
  }

  const schemaVersion = input.schemaVersion ?? CAPITAL_PUBLISH_SCHEMA_VERSION
  if (!schemaVersion.trim()) {
    issues.push({ code: "SCHEMA_VERSION_REQUIRED", message: "schemaVersion is required." })
  }
  if (!input.scenario?.disclaimerVersion?.trim()) {
    issues.push({ code: "DISCLAIMER_VERSION_REQUIRED", message: "disclaimerVersion is required." })
  }
  if (!input.scenario?.inputSnapshotHash?.trim()) {
    issues.push({ code: "SCENARIO_HASH_MISSING", message: "The scenario has no input snapshot hash." })
  }

  if (input.review) {
    if (input.review.householdId !== input.householdId) {
      issues.push({
        code: "HOUSEHOLD_MISMATCH",
        message: "Review belongs to a different household.",
      })
    }
    if (input.review.scenarioId !== input.scenario?.id) {
      issues.push({
        code: "REVIEW_REQUIRED",
        message: "Review does not reference this scenario.",
      })
    }
    if (!isPublishable(input.review.state)) {
      issues.push({
        code: "REVIEW_NOT_APPROVED",
        message: `Review state "${input.review.state}" is not publishable.`,
      })
    }
  }

  if (issues.length > 0) {
    return { ok: false, boundary: null, payload: null, payloadHash: null, issues }
  }

  const payload = buildPublishPayload(input.scenario, input.householdId, schemaVersion)
  const payloadHash = hashPublishPayload(payload)

  const boundary: PublishBoundary = {
    householdId: input.householdId,
    scenarioId: input.scenario.id,
    payloadHash,
    idempotencyKey: input.idempotencyKey as string,
    disclaimerVersion: input.scenario.disclaimerVersion,
    schemaVersion,
    reviewState: input.review.state,
    authorizedBy: input.authorizedBy,
  }

  return { ok: true, boundary, payload, payloadHash, issues: [] }
}

/**
 * Replay check for a prepared job. The same idempotency key with the same
 * payload returns the existing job; a different household or payload is
 * rejected instead of silently overwriting.
 */
export type PublishReplayCheck =
  | { status: "new" }
  | { status: "replay"; existingHash: string }
  | { status: "conflict"; reason: string }

export function checkPublishReplay(
  existing: { idempotencyKey: string; householdId: string; payloadHash: string } | null,
  candidate: { idempotencyKey: string; householdId: string; payloadHash: string },
): PublishReplayCheck {
  if (!existing) return { status: "new" }
  if (existing.idempotencyKey !== candidate.idempotencyKey) return { status: "new" }
  if (existing.householdId !== candidate.householdId) {
    return { status: "conflict", reason: "Idempotency key reused for a different household." }
  }
  if (existing.payloadHash !== candidate.payloadHash) {
    return { status: "conflict", reason: "Idempotency key reused with a different payload." }
  }
  return { status: "replay", existingHash: existing.payloadHash }
}
