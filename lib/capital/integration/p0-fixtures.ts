/**
 * Deterministic P0 test fixtures.
 *
 * These builders stand in for rows a repository would load from the existing
 * VZG tables. They are plain data only — no mocks of the modules under test.
 */

import { CAPITAL_FACT_KEYS } from "../engine"
import { createFinancialFact, type FinancialFact } from "../financial-fact"
import { createProvenance } from "../provenance"
import type {
  CapitalSourceBundle,
  ContractRow,
  DocumentReviewRow,
  ExtractedFactRow,
  FinancialProfileRow,
  HouseholdRow,
} from "./source-contracts"

export const HOUSEHOLD_ID = "hh-1"
export const OTHER_HOUSEHOLD_ID = "hh-2"
export const OWNER_ID = "user-1"
export const CALCULATED_AT = "2025-03-01T09:00:00.000Z"
export const CONFIRMED_AT = "2025-02-20T12:00:00.000Z"

export function household(overrides: Partial<HouseholdRow> = {}): HouseholdRow {
  return {
    id: HOUSEHOLD_ID,
    owner_id: OWNER_ID,
    name: "Test household",
    country: "DE",
    ...overrides,
  }
}

export function extractedFact(overrides: Partial<ExtractedFactRow> = {}): ExtractedFactRow {
  return {
    id: "ef-1",
    key: "income.net_monthly",
    value: "3200.00",
    evidence: null,
    page_no: null,
    source_type: "document",
    confidence: 0.7,
    confirmed_at: null,
    created_at: "2025-02-10T08:00:00.000Z",
    document_id: null,
    case_id: "case-1",
    owner_id: OWNER_ID,
    ...overrides,
  }
}

export function contract(overrides: Partial<ContractRow> = {}): ContractRow {
  return {
    id: "ct-1",
    household_id: HOUSEHOLD_ID,
    provider_name: "Example insurer",
    title: "Household insurance",
    category: "insurance",
    status: "active",
    monthly_amount: "45.90",
    currency: "EUR",
    payment_interval: "monthly",
    review_status: "needs_review",
    extraction_confidence: "0.8000",
    updated_at: "2025-02-15T10:00:00.000Z",
    created_at: "2025-02-01T10:00:00.000Z",
    ...overrides,
  }
}

export function documentReview(overrides: Partial<DocumentReviewRow> = {}): DocumentReviewRow {
  return {
    id: "dr-1",
    document_id: "doc-1",
    user_id: OWNER_ID,
    facts: [{ key: "debt.payments_monthly", value: "300.00", evidence: "page 2" }],
    confirmed_at: CONFIRMED_AT,
    updated_at: CONFIRMED_AT,
    ...overrides,
  }
}

export function financialProfile(overrides: Partial<FinancialProfileRow> = {}): FinancialProfileRow {
  return {
    user_id: OWNER_ID,
    employment_status: "employed",
    household_size: 2,
    created_at: "2025-01-05T10:00:00.000Z",
    updated_at: "2025-01-05T10:00:00.000Z",
    ...overrides,
  }
}

/**
 * A bundle with every P0 input confirmed:
 * income from a user-confirmed fact, fixed costs from a human-reviewed contract,
 * debt from a document review, and the remaining keys as confirmed user facts.
 */
export function completeBundle(): CapitalSourceBundle {
  return {
    household: household(),
    documents: [],
    extractedFacts: [
      extractedFact({
        id: "ef-income",
        key: "income.net_monthly",
        value: "3200.00",
        source_type: "user",
        confidence: 1,
        confirmed_at: CONFIRMED_AT,
      }),
      extractedFact({
        id: "ef-expenses",
        key: "expenses.essential_monthly",
        value: "1200.00",
        source_type: "user",
        confidence: 1,
        confirmed_at: CONFIRMED_AT,
      }),
      extractedFact({
        id: "ef-savings",
        key: "savings.contributions_monthly",
        value: "200.00",
        source_type: "user",
        confidence: 1,
        confirmed_at: CONFIRMED_AT,
      }),
      extractedFact({
        id: "ef-reserve",
        key: "reserve.liquid",
        value: "5000.00",
        source_type: "user",
        confidence: 1,
        confirmed_at: CONFIRMED_AT,
      }),
    ],
    contracts: [
      contract({
        id: "ct-insurance",
        category: "insurance",
        monthly_amount: "150.00",
        review_status: "confirmed",
        created_at: "2025-02-01T10:00:00.000Z",
        updated_at: "2025-02-15T10:00:00.000Z",
      }),
    ],
    cases: [],
    financialProfile: financialProfile(),
    documentReviews: [documentReview()],
  }
}

/** A bundle where the document-derived income is still DRAFT. */
export function unconfirmedBundle(): CapitalSourceBundle {
  return {
    household: household(),
    documents: [],
    extractedFacts: [extractedFact({ id: "ef-draft-income", document_id: "doc-9", page_no: 1 })],
    contracts: [],
    cases: [],
    financialProfile: null,
    documentReviews: [],
  }
}

/** Builds a persisted-looking fact for the builder's household gate. */
export function persistedFact(overrides: Partial<Parameters<typeof createFinancialFact>[0]> = {}): FinancialFact {
  return createFinancialFact({
    id: "pf-1",
    householdId: HOUSEHOLD_ID,
    key: CAPITAL_FACT_KEYS.liquidReserve,
    value: 400_000,
    type: "money",
    provenance: createProvenance({ source: "USER", sourceReference: "ui/entry" }),
    confirmedAt: CONFIRMED_AT,
    confirmedBy: OWNER_ID,
    currency: "EUR",
    status: "CONFIRMED",
    ...overrides,
  })
}
