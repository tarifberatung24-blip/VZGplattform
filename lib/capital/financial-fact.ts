/**
 * FinancialFact — the household-scoped source-of-truth record for Capital.
 *
 * Design follows `docs/research/capital/VZG_CAPITAL_TARGET_ARCHITECTURE.md`.
 * Domain contracts only: this module performs no persistence and no
 * recommendation logic.
 */

import type { Provenance } from "./provenance"

export const FINANCIAL_FACT_STATUSES = ["DRAFT", "CONFIRMED", "REJECTED", "SUPERSEDED"] as const

export type FinancialFactStatus = (typeof FINANCIAL_FACT_STATUSES)[number]

export const FINANCIAL_FACT_TYPES = ["money", "number", "boolean", "date", "text", "enum"] as const

export type FinancialFactType = (typeof FINANCIAL_FACT_TYPES)[number]

/** Value carrier per fact type; `null` always means "missing", never zero/empty. */
export type FinancialFactValue = string | number | boolean | null

export type FinancialFact = {
  id: string
  householdId: string
  key: string
  value: FinancialFactValue
  type: FinancialFactType
  source: Provenance["source"]
  provenance: Provenance
  /** Evidence backing the value, when evidence exists. */
  evidenceReference: string | null
  /** 0..1, or null when the source does not express confidence. */
  confidence: number | null
  observedAt: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  currency: string | null
  unit: string | null
  version: number
  status: FinancialFactStatus
}

/** Monetary facts are stored in integer minor units (cents) to avoid float drift. */
export type FinancialFactInput = {
  id: string
  householdId: string
  key: string
  value: FinancialFactValue
  type: FinancialFactType
  provenance: Provenance
  evidenceReference?: string | null
  confidence?: number | null
  observedAt?: string | null
  confirmedAt?: string | null
  confirmedBy?: string | null
  currency?: string | null
  unit?: string | null
  version?: number
  status?: FinancialFactStatus
}

/**
 * Builds a fact. New facts are always `DRAFT` unless a caller explicitly
 * supplies a status, and no confirmation metadata is inferred.
 */
export function createFinancialFact(input: FinancialFactInput): FinancialFact {
  return {
    id: input.id,
    householdId: input.householdId,
    key: input.key,
    value: input.value,
    type: input.type,
    source: input.provenance.source,
    provenance: input.provenance,
    evidenceReference: input.evidenceReference ?? null,
    confidence: input.confidence ?? null,
    observedAt: input.observedAt ?? null,
    confirmedAt: input.confirmedAt ?? null,
    confirmedBy: input.confirmedBy ?? null,
    currency: input.currency ?? null,
    unit: input.unit ?? null,
    version: input.version ?? 1,
    status: input.status ?? "DRAFT",
  }
}

export function isFinancialFactStatus(value: unknown): value is FinancialFactStatus {
  return typeof value === "string" && (FINANCIAL_FACT_STATUSES as readonly string[]).includes(value)
}

export function isFinancialFactType(value: unknown): value is FinancialFactType {
  return typeof value === "string" && (FINANCIAL_FACT_TYPES as readonly string[]).includes(value)
}

/** Facts a deterministic engine may consume without further review. */
export function isUsableForAnalysis(fact: FinancialFact): boolean {
  return fact.status === "CONFIRMED"
}

/**
 * A revision cannot change household scope; it inherits it from the fact it
 * supersedes, so `householdId` is deliberately omitted here.
 */
export type FinancialFactRevision = Omit<FinancialFactInput, "householdId">

/**
 * Superseding a fact produces a new version and retires the old one; it never
 * mutates the historical record in place.
 */
export function supersedeFinancialFact(previous: FinancialFact, next: FinancialFactRevision): FinancialFact {
  return createFinancialFact({
    ...next,
    householdId: previous.householdId,
    version: next.version ?? previous.version + 1,
  })
}
