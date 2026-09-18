/**
 * Deterministic canonical serialization and SHA-256 snapshot hashing for the
 * Capital Engine.
 *
 * The hash must be stable for the same material inputs regardless of object
 * property ordering or array ordering, so results can be reproduced and
 * compared. Follows the existing `createHash("sha256")` pattern already used in
 * `lib/office/workflow/deterministic.ts`.
 */

import { createHash } from "node:crypto"

import type { CapitalAssumption, CapitalMissingInput } from "./boundaries"
import type { FinancialFact } from "./financial-fact"

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

/**
 * Canonical JSON: object keys sorted, `undefined` omitted, arrays kept in order.
 * Non-finite numbers are rejected rather than serialized ambiguously.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("CANONICALIZE_NON_FINITE_NUMBER")
    return JSON.stringify(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "string") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(",")}]`
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(",")}}`
  }
  throw new Error("CANONICALIZE_UNSUPPORTED_TYPE")
}

/** Stable fact ordering so array order never affects the snapshot. */
export function sortFactsCanonically(facts: readonly FinancialFact[]): FinancialFact[] {
  return [...facts].sort((a, b) => {
    if (a.key !== b.key) return a.key < b.key ? -1 : 1
    if (a.version !== b.version) return a.version - b.version
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })
}

/** Only fields that can change a calculation or its trustworthiness. */
function projectFact(fact: FinancialFact) {
  return {
    id: fact.id,
    key: fact.key,
    value: fact.value,
    type: fact.type,
    version: fact.version,
    status: fact.status,
    currency: fact.currency,
    unit: fact.unit,
    source: fact.provenance.source,
  }
}

export type CapitalSnapshotMaterial = {
  engineVersion: string
  householdId: string
  currency: string
  /** Facts the engine actually consumed. */
  facts: readonly FinancialFact[]
  assumptions: readonly CapitalAssumption[]
  goals: readonly {
    id: string
    targetAmountKey: string
    fundedAmountKey: string
    remainingMonthsKey: string
  }[]
  /** Unusable required inputs, so a missing-to-present change alters the hash. */
  missingInputs: readonly CapitalMissingInput[]
}

function materialProjection(material: CapitalSnapshotMaterial) {
  return {
    engineVersion: material.engineVersion,
    householdId: material.householdId,
    currency: material.currency,
    facts: sortFactsCanonically(material.facts).map(projectFact),
    assumptions: [...material.assumptions]
      .map((assumption) => ({
        key: assumption.key,
        value: assumption.value,
        unit: assumption.unit,
        sourceReference: assumption.sourceReference,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    goals: [...material.goals]
      .map((goal) => ({
        id: goal.id,
        targetAmountKey: goal.targetAmountKey,
        fundedAmountKey: goal.fundedAmountKey,
        remainingMonthsKey: goal.remainingMonthsKey,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    missingInputs: [...material.missingInputs]
      .map((missing) => ({ key: missing.key, reason: missing.reason, requiredBy: missing.requiredBy }))
      .sort((a, b) => {
        if (a.key !== b.key) return a.key < b.key ? -1 : 1
        if (a.reason !== b.reason) return a.reason < b.reason ? -1 : 1
        return a.requiredBy < b.requiredBy ? -1 : a.requiredBy > b.requiredBy ? 1 : 0
      }),
  }
}

/** Canonical JSON string of the material inputs. Excludes derived outputs and timestamps. */
export function buildInputSnapshot(material: CapitalSnapshotMaterial): string {
  return canonicalize(materialProjection(material))
}

/** SHA-256 of the canonical material-input serialization. */
export function hashCapitalInputs(material: CapitalSnapshotMaterial): string {
  return sha256Hex(buildInputSnapshot(material))
}
