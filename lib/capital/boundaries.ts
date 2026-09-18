/**
 * Capital boundary contracts.
 *
 * These types define the boundaries between pipeline stages described in
 * `docs/research/capital/VZG_CAPITAL_TARGET_ARCHITECTURE.md`:
 *
 *   FinancialFact → CapitalAnalysisInput → CapitalScenario → AdvisorReview → PublishBoundary
 *
 * Contracts only. This module contains no calculation, no projection, no
 * investment recommendation, no provider call, and no persistence.
 */

import type { FinancialFact } from "./financial-fact"

/** Publication lifecycle for analysis and strategy records. */
export const CAPITAL_REVIEW_STATES = ["draft", "in_review", "approved", "published", "superseded"] as const

export type CapitalReviewState = (typeof CAPITAL_REVIEW_STATES)[number]

/** Deterministic feasibility outcomes; a missing input is a state, never a value. */
export const CAPITAL_FEASIBILITY_STATES = ["needs_data", "not_feasible", "feasible", "review_required"] as const

export type CapitalFeasibilityState = (typeof CAPITAL_FEASIBILITY_STATES)[number]

/** An assumption must be explicit, versioned, and attributable. */
export type CapitalAssumption = {
  key: string
  value: string | number | boolean
  unit: string | null
  /** Provenance-style reference explaining where the assumption came from. */
  sourceReference: string | null
}

/** Explicit, non-invented gap: a required input that is absent or unusable. */
export type CapitalMissingInput = {
  key: string
  reason: "absent" | "unconfirmed" | "rejected" | "superseded" | "stale_evidence"
  requiredBy: string
}

/**
 * The deterministic engine's input: confirmed, provenance-backed facts plus
 * explicit assumptions. Unusable facts are surfaced as missing inputs rather
 * than silently dropped.
 */
export type CapitalAnalysisInput = {
  householdId: string
  /** Only facts permitted for analysis (see `isUsableForAnalysis`). */
  facts: readonly FinancialFact[]
  /** Facts that were withheld, with the reason, so gaps stay auditable. */
  missingInputs: readonly CapitalMissingInput[]
  assumptions: readonly CapitalAssumption[]
  /** Engine/rule version so results are reproducible. */
  engineVersion: string
  currency: string
  /** Locale for later presentation; does not affect calculation. */
  locale: string
}

/** A neutral, modelled scenario. Never a forecast, guarantee, or recommendation. */
export type CapitalScenario = {
  id: string
  /** Reference to the `CapitalAnalysisInput.engineVersion` that produced it. */
  engineVersion: string
  label: string
  /** Immutable reference/hash of the inputs this scenario was derived from. */
  inputSnapshotHash: string
  assumptions: readonly CapitalAssumption[]
  currency: string
  /** Time horizon in months, or null when undetermined. */
  horizonMonths: number | null
  feasibility: CapitalFeasibilityState
  missingInputs: readonly CapitalMissingInput[]
  /** Deterministic outputs are added by later engine work; not computed here. */
  outputs: Readonly<Record<string, string | number | null>>
  disclaimerVersion: string
  calculatedAt: string
}

/** Advisor review is versioned and auditable; it gates publication. */
export type AdvisorReview = {
  id: string
  householdId: string
  /** The scenario version under review. */
  scenarioId: string
  state: CapitalReviewState
  reviewerId: string | null
  reviewedAt: string | null
  notes: string | null
  /** Version of the reviewed artifact, for audit. */
  reviewedVersion: number
}

/**
 * Server-side publish contract. Publishing requires approval, a validated
 * payload, and a canonical payload hash; the browser cannot publish directly.
 */
export type PublishBoundary = {
  householdId: string
  scenarioId: string
  /** SHA-256 of the canonical unsigned payload. */
  payloadHash: string
  /** Replays of the same key and payload return the existing job. */
  idempotencyKey: string
  disclaimerVersion: string
  schemaVersion: string
  /** Publication is only permitted from an approved review state. */
  reviewState: CapitalReviewState
  authorizedBy: string | null
}

/** Publication requires an approved (or already published) review state. */
export function isPublishable(state: CapitalReviewState): boolean {
  return state === "approved" || state === "published"
}

/**
 * Guards the publish boundary deterministically: a payload may only be
 * published when approval, authorization, and hashing requirements are met.
 */
export function canPublish(boundary: PublishBoundary): boolean {
  return (
    isPublishable(boundary.reviewState) &&
    boundary.authorizedBy !== null &&
    boundary.payloadHash.trim().length > 0 &&
    boundary.idempotencyKey.trim().length > 0
  )
}
