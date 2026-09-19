/**
 * Capital P0 runtime integration — shared source contracts.
 *
 * These types describe the *existing* VZG data that Capital may read. They are
 * deliberately plain row shapes mirroring the current Supabase tables
 * (`extracted_facts`, `documents`, `contracts`, `cases`, `households`,
 * `financial_profiles`, `document_reviews`) so the adapters can run against
 * real repositories or fixtures without a new persistence layer.
 *
 * Nothing here writes, migrates, or changes schema. Reading is assumed to have
 * happened under the existing household RLS and ownership rules
 * (`lib/office/supabase/ownership.ts`).
 */

import type { ProvenanceSource } from "../provenance"

/** A row from `public.extracted_facts`. */
export type ExtractedFactRow = {
  id: string
  key: string
  value: string
  evidence: string | null
  page_no: number | null
  source_type: "document" | "user"
  confidence: number | null
  confirmed_at: string | null
  created_at: string
  document_id?: string | null
  case_id?: string | null
  owner_id?: string | null
}

/** A row from `public.documents`. */
export type DocumentRow = {
  id: string
  household_id: string
  original_filename: string
  document_type: string
  processing_status: string
  updated_at: string
  created_at: string
}

/** A row from `public.contracts`. */
export type ContractRow = {
  id: string
  household_id: string
  provider_name: string
  title: string
  category: string
  status: string
  monthly_amount: number | string | null
  currency: string
  payment_interval: string | null
  review_status: string
  extraction_confidence: number | string | null
  updated_at: string
  created_at: string
}

/** A row from `public.cases` (platform or office schema). */
export type CaseRow = {
  id: string
  title: string
  status: string
  intent?: string
  institution?: string | null
  updated_at: string
  created_at: string
}

/** A row from `public.financial_profiles`; monetary columns are Excluded. */
export type FinancialProfileRow = {
  user_id: string
  employment_status: string | null
  household_size: number | null
  created_at: string
  updated_at: string
}

/** The household record; `owner_id` is the RLS anchor. */
export type HouseholdRow = {
  id: string
  owner_id: string
  name: string
  country: string
}

/** A row from `public.document_reviews`; `facts` is the human-confirmed payload. */
export type DocumentReviewRow = {
  id: string
  document_id: string
  user_id: string
  facts: unknown
  confirmed_at: string | null
  updated_at: string
  created_at?: string
}

/** The complete set of source data for exactly one household. */
export type CapitalSourceBundle = {
  household: HouseholdRow
  documents: readonly DocumentRow[]
  extractedFacts: readonly ExtractedFactRow[]
  contracts: readonly ContractRow[]
  cases: readonly CaseRow[]
  financialProfile: FinancialProfileRow | null
  documentReviews: readonly DocumentReviewRow[]
}

/** Where an adapted fact's value came from, before it becomes a FinancialFact. */
export type CapitalSourceOrigin =
  | { kind: "extracted_fact"; factId: string }
  | { kind: "contract"; contractId: string }
  | { kind: "document_review"; reviewId: string }
  | { kind: "profile"; userId: string }

/** An adapted candidate fact plus the reason it is (or is not) usable. */
export type AdaptedFact = {
  origin: CapitalSourceOrigin
  /** Canonical Capital fact key, when the source value is supported. */
  canonicalKey: string | null
  /** Non-fatal problems found while adapting; never used to invent a value. */
  issues: CapitalAdapterIssue[]
}

export type CapitalAdapterIssueCode =
  | "UNSUPPORTED_SOURCE_KEY"
  | "VALUE_NOT_NUMERIC"
  | "VALUE_NOT_POSITIVE"
  | "CURRENCY_UNSUPPORTED"
  | "UNIT_UNSUPPORTED"
  | "EVIDENCE_MISSING"
  | "SOURCE_UNCONFIRMED"
  | "DOCUMENT_TYPE_UNSUPPORTED"
  | "HOUSEHOLD_MISMATCH"

export type CapitalAdapterIssue = {
  code: CapitalAdapterIssueCode
  /** The source key or field the issue relates to. */
  source: string
  message: string
  /** True when the issue makes the value unusable rather than merely unconfirmed. */
  blocking: boolean
}

/** Maps an extracted-fact row to the Capital provenance source. */
export function provenanceSourceForExtractedFact(row: Pick<ExtractedFactRow, "source_type">): ProvenanceSource {
  // The document pipeline may have produced the value via OCR/AI extraction, so
  // document-sourced facts stay AI-derived until a human confirms them.
  return row.source_type === "document" ? "AI_EXTRACTED" : "USER"
}
