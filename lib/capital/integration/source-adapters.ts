/**
 * Deterministic adapters from existing VZG source data to FinancialFacts.
 *
 * Every adapter is a pure function of its row inputs: no clock, no randomness,
 * no I/O, no LLM. A value that is absent, unsupported, or non-numeric produces
 * an explicit issue — never an invented default.
 *
 * Trust rules:
 * - document-derived extraction (OCR/AI) stays DRAFT and carries its evidence;
 * - explicitly human-confirmed source values may become CONFIRMED;
 * - unsupported source keys are reported as unusable.
 */

import { createFinancialFact, type FinancialFact, type FinancialFactType } from "../financial-fact"
import { CAPITAL_FACT_KEYS, type CapitalFactKey } from "../engine"
import { createProvenance, isIsoDate, isIsoTimestamp } from "../provenance"
import {
  provenanceSourceForExtractedFact,
  type CapitalAdapterIssue,
  type ContractRow,
  type DocumentReviewRow,
  type ExtractedFactRow,
} from "./source-contracts"

const DEFAULT_CURRENCY = "EUR"

/** Canonical Capital key for each supported existing source fact key. */
export const SOURCE_FACT_KEY_MAP: Readonly<Record<string, CapitalFactKey>> = {
  "income.net_monthly": CAPITAL_FACT_KEYS.income,
  "income.monthly_net": CAPITAL_FACT_KEYS.income,
  "monthly_income": CAPITAL_FACT_KEYS.income,
  "expenses.essential_monthly": CAPITAL_FACT_KEYS.essentialExpenses,
  "expenses.monthly_fixed": CAPITAL_FACT_KEYS.essentialExpenses,
  "monthly_fixed_costs": CAPITAL_FACT_KEYS.essentialExpenses,
  "debt.payments_monthly": CAPITAL_FACT_KEYS.debtPayments,
  "insurance.costs_monthly": CAPITAL_FACT_KEYS.insuranceCosts,
  "savings.contributions_monthly": CAPITAL_FACT_KEYS.existingSavings,
  "reserve.liquid": CAPITAL_FACT_KEYS.liquidReserve,
  "reserve.liquid_amount": CAPITAL_FACT_KEYS.liquidReserve,
}

/** Contract categories that represent a recurring protection/insurance cost. */
const INSURANCE_CATEGORIES: readonly string[] = ["insurance"]

/** Contract `review_status` values that indicate a human confirmed the extraction. */
const CONFIRMED_CONTRACT_REVIEW_STATUSES: readonly string[] = ["confirmed", "reviewed", "approved"]

export function canonicalKeyForSourceKey(sourceKey: string): CapitalFactKey | null {
  return SOURCE_FACT_KEY_MAP[sourceKey.trim().toLowerCase()] ?? null
}

/** Normalizes a decimal amount ("1.234,56", "1234.56", "1234") to minor units. */
export function parseMinorUnits(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw * 100) : null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  // German formatting uses "." as thousands separator and "," as decimal comma.
  const normalized = /,\d{1,2}$/.test(trimmed)
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/,/g, "")
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Evidence pointer for an extracted fact: document/page when known, else the row id. */
export function evidenceReferenceFor(row: ExtractedFactRow): string | null {
  if (row.document_id) {
    return row.page_no !== null && row.page_no !== undefined
      ? `documents/${row.document_id}#page=${row.page_no}`
      : `documents/${row.document_id}`
  }
  return nonEmpty(row.evidence) ? `extracted_facts/${row.id}` : null
}

function observedAtFor(row: ExtractedFactRow): string | null {
  const candidate = row.confirmed_at ?? row.created_at
  if (!candidate) return null
  return isIsoTimestamp(candidate) || isIsoDate(candidate) ? candidate : null
}

export type AdaptExtractedFactResult = {
  fact: FinancialFact | null
  issues: CapitalAdapterIssue[]
}

/**
 * Adapts one `extracted_facts` row.
 *
 * A human-confirmed row (`source_type = "user"` with `confirmed_at`) becomes
 * CONFIRMED. A document-derived row stays DRAFT because OCR/AI output is never
 * authoritative on its own. Unsupported keys and non-numeric values yield no
 * fact at all plus a blocking issue.
 */
export function adaptExtractedFact(
  row: ExtractedFactRow,
  householdId: string,
  currency: string = DEFAULT_CURRENCY,
): AdaptExtractedFactResult {
  const issues: CapitalAdapterIssue[] = []
  const canonicalKey = canonicalKeyForSourceKey(row.key)

  if (!canonicalKey) {
    issues.push({
      code: "UNSUPPORTED_SOURCE_KEY",
      source: row.key,
      message: `Source fact key "${row.key}" is not mapped to a Capital fact key.`,
      blocking: true,
    })
    return { fact: null, issues }
  }

  const minorUnits = parseMinorUnits(row.value)
  if (minorUnits === null) {
    issues.push({
      code: "VALUE_NOT_NUMERIC",
      source: row.key,
      message: `Value for "${row.key}" is not a numeric monetary amount and is not usable.`,
      blocking: true,
    })
    return { fact: null, issues }
  }

  const provenanceSource = provenanceSourceForExtractedFact(row)
  const evidenceReference = evidenceReferenceFor(row)
  const humanConfirmed = row.source_type === "user" && row.confirmed_at !== null

  if (provenanceSource === "AI_EXTRACTED" && evidenceReference === null) {
    issues.push({
      code: "EVIDENCE_MISSING",
      source: row.key,
      message: `Document-derived fact "${row.key}" has no evidence reference; it stays DRAFT.`,
      blocking: false,
    })
  }

  if (!humanConfirmed) {
    issues.push({
      code: "SOURCE_UNCONFIRMED",
      source: row.key,
      message: `Fact "${row.key}" is not human-confirmed and remains DRAFT.`,
      blocking: false,
    })
  }

  return {
    fact: createFinancialFact({
      id: `ef:${row.id}`,
      householdId,
      key: canonicalKey,
      value: minorUnits,
      type: "money" satisfies FinancialFactType,
      provenance: createProvenance({
        source: provenanceSource,
        sourceReference: `extracted_facts/${row.id}`,
        evidenceReference,
        extractionRunId: row.document_id ? `documents/${row.document_id}` : null,
        sourceVersion: null,
        observedAt: observedAtFor(row),
        retrievedAt: isIsoTimestamp(row.created_at) ? row.created_at : null,
      }),
      evidenceReference,
      confidence: row.confidence ?? null,
      observedAt: observedAtFor(row),
      confirmedAt: humanConfirmed ? row.confirmed_at : null,
      confirmedBy: humanConfirmed ? (row.owner_id ?? "user") : null,
      currency,
      unit: null,
      version: 1,
      status: humanConfirmed ? "CONFIRMED" : "DRAFT",
    }),
    issues,
  }
}

export type AdaptContractResult = {
  fact: FinancialFact | null
  issues: CapitalAdapterIssue[]
}

/**
 * Adapts one `contracts` row into a recurring cost fact.
 *
 * Only `monthly` (or unspecified) intervals map to a monthly amount without
 * arithmetic. Other intervals are reported rather than annualized, because
 * deriving a monthly figure would be an invented value.
 */
export function adaptContract(
  row: ContractRow,
  householdId: string,
  currency: string = DEFAULT_CURRENCY,
): AdaptContractResult {
  const issues: CapitalAdapterIssue[] = []

  if (row.household_id !== householdId) {
    issues.push({
      code: "HOUSEHOLD_MISMATCH",
      source: row.id,
      message: "Contract does not belong to the requested household.",
      blocking: true,
    })
    return { fact: null, issues }
  }

  const interval = row.payment_interval?.trim().toLowerCase() ?? "monthly"
  if (interval !== "monthly" && interval !== "one_time" && interval !== "") {
    issues.push({
      code: "UNIT_UNSUPPORTED",
      source: row.payment_interval ?? "unknown",
      message: `Contract interval "${row.payment_interval}" is not monthly; no monthly value is derived.`,
      blocking: true,
    })
    return { fact: null, issues }
  }

  const minorUnits = parseMinorUnits(row.monthly_amount)
  if (minorUnits === null) {
    issues.push({
      code: "VALUE_NOT_NUMERIC",
      source: row.id,
      message: "Contract has no usable monthly amount.",
      blocking: true,
    })
    return { fact: null, issues }
  }

  if (minorUnits < 0) {
    issues.push({
      code: "VALUE_NOT_POSITIVE",
      source: row.id,
      message: "Contract monthly amount is negative.",
      blocking: true,
    })
    return { fact: null, issues }
  }

  const key = INSURANCE_CATEGORIES.includes(row.category)
    ? CAPITAL_FACT_KEYS.insuranceCosts
    : CAPITAL_FACT_KEYS.essentialExpenses

  // Contract extraction is AI-assisted, so the value is only confirmed when the
  // contract itself is marked as human-reviewed. Retrieval is the extraction
  // time (created_at) and confirmation is the review time (updated_at), so the
  // AI-derived confirmation invariant (confirm after retrieve) holds.
  const humanReviewed = CONFIRMED_CONTRACT_REVIEW_STATUSES.includes(row.review_status.trim().toLowerCase())
  const retrievedAt = isIsoTimestamp(row.created_at) ? row.created_at : null
  const reviewedAt = isIsoTimestamp(row.updated_at) ? row.updated_at : null

  if (row.review_status.trim().toLowerCase() === "needs_review") {
    issues.push({
      code: "SOURCE_UNCONFIRMED",
      source: row.id,
      message: "Contract has not been human-reviewed and remains DRAFT.",
      blocking: false,
    })
  }

  return {
    fact: createFinancialFact({
      id: `ct:${row.id}`,
      householdId,
      key,
      value: minorUnits,
      type: "money",
      provenance: createProvenance({
        source: "AI_EXTRACTED",
        sourceReference: `contracts/${row.id}`,
        evidenceReference: `contracts/${row.id}`,
        extractionRunId: null,
        sourceVersion: row.status,
        observedAt: reviewedAt,
        retrievedAt,
      }),
      evidenceReference: `contracts/${row.id}`,
      confidence: row.extraction_confidence === null ? null : Number(row.extraction_confidence),
      observedAt: reviewedAt,
      confirmedAt: humanReviewed ? reviewedAt : null,
      confirmedBy: humanReviewed ? "contract_review" : null,
      currency: row.currency?.trim() || currency,
      unit: null,
      version: 1,
      status: humanReviewed ? "CONFIRMED" : "DRAFT",
    }),
    issues,
  }
}

export type AdaptDocumentReviewResult = {
  facts: FinancialFact[]
  issues: CapitalAdapterIssue[]
}

/**
 * Adapts a `document_reviews` row. The review itself is the human confirmation
 * event, so its facts are CONFIRMED — but only when `confirmed_at` is present
 * and each entry is a supported numeric value with usable evidence.
 */
export function adaptDocumentReview(
  row: DocumentReviewRow,
  householdId: string,
  currency: string = DEFAULT_CURRENCY,
): AdaptDocumentReviewResult {
  const facts: FinancialFact[] = []
  const issues: CapitalAdapterIssue[] = []

  const confirmedAt = isIsoTimestamp(row.confirmed_at) ? row.confirmed_at : null
  if (confirmedAt === null) {
    issues.push({
      code: "SOURCE_UNCONFIRMED",
      source: row.id,
      message: "Document review has no confirmation timestamp; its facts stay DRAFT.",
      blocking: false,
    })
  }

  const entries = toReviewEntries(row.facts)
  for (const entry of entries) {
    const canonicalKey = canonicalKeyForSourceKey(entry.key)
    if (!canonicalKey) {
      issues.push({
        code: "UNSUPPORTED_SOURCE_KEY",
        source: entry.key,
        message: `Reviewed fact key "${entry.key}" is not mapped to a Capital fact key.`,
        blocking: true,
      })
      continue
    }
    const minorUnits = parseMinorUnits(entry.value)
    if (minorUnits === null) {
      issues.push({
        code: "VALUE_NOT_NUMERIC",
        source: entry.key,
        message: `Reviewed value for "${entry.key}" is not a numeric monetary amount.`,
        blocking: true,
      })
      continue
    }

    const evidenceReference = entry.evidence ?? `document_reviews/${row.id}`
    const isConfirmed = confirmedAt !== null
    if (!isConfirmed) {
      issues.push({
        code: "SOURCE_UNCONFIRMED",
        source: entry.key,
        message: `Reviewed fact "${entry.key}" is not confirmed.`,
        blocking: false,
      })
    }

    const retrievedAt = isIsoTimestamp(row.created_at ?? row.updated_at)
      ? (row.created_at ?? row.updated_at)
      : null

    facts.push(
      createFinancialFact({
        id: `dr:${row.id}:${canonicalKey}`,
        householdId,
        key: canonicalKey,
        value: minorUnits,
        type: "money",
        provenance: createProvenance({
          source: "DOCUMENT",
          sourceReference: `document_reviews/${row.id}`,
          evidenceReference,
          extractionRunId: `documents/${row.document_id}`,
          sourceVersion: null,
          observedAt: row.updated_at ?? null,
          retrievedAt,
        }),
        evidenceReference,
        confidence: 1,
        observedAt: isIsoDate(row.updated_at) || isIsoTimestamp(row.updated_at) ? row.updated_at : null,
        confirmedAt,
        confirmedBy: isConfirmed ? row.user_id : null,
        currency,
        unit: null,
        version: 1,
        status: isConfirmed ? "CONFIRMED" : "DRAFT",
      }),
    )
  }

  return { facts, issues }
}

/** `document_reviews.facts` is a free-form jsonb payload; read it defensively. */
function toReviewEntries(raw: unknown): { key: string; value: string; evidence: string | null }[] {
  if (raw === null || raw === undefined) return []
  const candidates: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({ key, value }))
      : []
  const entries: { key: string; value: string; evidence: string | null }[] = []
  for (const candidate of candidates) {
    if (typeof candidate !== "object" || candidate === null) continue
    const record = candidate as Record<string, unknown>
    const key = typeof record.key === "string" ? record.key : null
    if (!key) continue
    const rawValue = record.value
    const value =
      typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : null
    if (value === null) continue
    entries.push({
      key,
      value,
      evidence: typeof record.evidence === "string" ? record.evidence : null,
    })
  }
  return entries
}

/** Household-scoped helper: rejects rows that belong to another household. */
export function belongsToHousehold(row: { household_id?: string }, householdId: string): boolean {
  return row.household_id === householdId
}

export { DEFAULT_CURRENCY as CAPITAL_DEFAULT_CURRENCY }
