import { describe, expect, it } from "vitest"

import { CAPITAL_FACT_KEYS } from "../engine"
import type { FinancialFact } from "../financial-fact"
import { validateFinancialFact } from "../validation"
import {
  adaptContract,
  adaptDocumentReview,
  adaptExtractedFact,
  canonicalKeyForSourceKey,
  parseMinorUnits,
} from "./source-adapters"
import {
  CALCULATED_AT,
  CONFIRMED_AT,
  HOUSEHOLD_ID,
  OTHER_HOUSEHOLD_ID,
  contract,
  documentReview,
  extractedFact,
} from "./p0-fixtures"

describe("capital source adapters — extracted facts", () => {
  it("keeps a document-derived fact DRAFT", () => {
    const { fact } = adaptExtractedFact(extractedFact({ source_type: "document" }), HOUSEHOLD_ID)
    expect(fact).not.toBeNull()
    expect(fact?.status).toBe("DRAFT")
    expect(fact?.confirmedAt).toBeNull()
    expect(fact?.confirmedBy).toBeNull()
    expect(fact?.provenance.source).toBe("AI_EXTRACTED")
  })

  it("makes an explicitly human-confirmed source fact usable", () => {
    const { fact } = adaptExtractedFact(
      extractedFact({ source_type: "user", confirmed_at: CONFIRMED_AT, confidence: 1 }),
      HOUSEHOLD_ID,
    )
    expect(fact?.status).toBe("CONFIRMED")
    expect(fact?.confirmedAt).toBe(CONFIRMED_AT)
    expect(fact?.confirmedBy).toBeTruthy()
    expect(fact?.key).toBe(CAPITAL_FACT_KEYS.income)
  })

  it("never auto-confirms an AI/OCR fact even when a confidence is present", () => {
    const { fact } = adaptExtractedFact(
      extractedFact({ source_type: "document", confidence: 0.99, confirmed_at: null }),
      HOUSEHOLD_ID,
    )
    expect(fact?.status).toBe("DRAFT")
    expect(fact?.provenance.source).toBe("AI_EXTRACTED")
  })

  it("surfaces missing evidence for a document-derived fact", () => {
    const { issues } = adaptExtractedFact(
      extractedFact({ source_type: "document", document_id: null, evidence: null }),
      HOUSEHOLD_ID,
    )
    expect(issues.some((issue) => issue.code === "EVIDENCE_MISSING")).toBe(true)
  })

  it("preserves the evidence reference for a page-scoped extraction", () => {
    const { fact } = adaptExtractedFact(
      extractedFact({ document_id: "doc-3", page_no: 4 }),
      HOUSEHOLD_ID,
    )
    expect(fact?.evidenceReference).toBe("documents/doc-3#page=4")
    expect(fact?.provenance.evidenceReference).toBe("documents/doc-3#page=4")
  })

  it("preserves household scope, source reference and timestamps", () => {
    const { fact } = adaptExtractedFact(extractedFact(), HOUSEHOLD_ID)
    expect(fact?.householdId).toBe(HOUSEHOLD_ID)
    expect(fact?.provenance.sourceReference).toBe("extracted_facts/ef-1")
    expect(fact?.provenance.retrievedAt).toBe("2025-02-10T08:00:00.000Z")
  })

  it("reports an unsupported source key as unusable", () => {
    const { fact, issues } = adaptExtractedFact(extractedFact({ key: "unmapped.key" }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
    expect(issues[0].code).toBe("UNSUPPORTED_SOURCE_KEY")
    expect(issues[0].blocking).toBe(true)
  })

  it("reports a non-numeric value instead of defaulting it", () => {
    const { fact, issues } = adaptExtractedFact(extractedFact({ value: "not a number" }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
    expect(issues.some((issue) => issue.code === "VALUE_NOT_NUMERIC")).toBe(true)
  })

  it("returns no fact for an empty value", () => {
    const { fact } = adaptExtractedFact(extractedFact({ value: "" }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
  })
})

describe("capital source adapters — contracts", () => {
  it("is DRAFT while the contract needs review", () => {
    const { fact } = adaptContract(contract({ review_status: "needs_review" }), HOUSEHOLD_ID)
    expect(fact?.status).toBe("DRAFT")
    expect(fact?.confirmedAt).toBeNull()
  })

  it("becomes CONFIRMED once the contract is human-reviewed", () => {
    const { fact } = adaptContract(
      contract({
        review_status: "confirmed",
        created_at: "2025-02-01T10:00:00.000Z",
        updated_at: "2025-02-15T10:00:00.000Z",
      }),
      HOUSEHOLD_ID,
    )
    expect(fact?.status).toBe("CONFIRMED")
    expect(fact?.confirmedBy).toBe("contract_review")
    // Confirmation must postdate retrieval, as the AI-derived rule requires.
    expect(fact?.confirmedAt).toBe("2025-02-15T10:00:00.000Z")
    expect(fact?.provenance.retrievedAt).toBe("2025-02-01T10:00:00.000Z")
  })

  it("produces a fact that passes validation when human-reviewed", () => {
    const { fact } = adaptContract(contract({ review_status: "confirmed" }), HOUSEHOLD_ID)
    expect(fact).not.toBeNull()
    expect(validateFinancialFact(fact as FinancialFact)).toEqual([])
  })

  it("produces a fact that passes validation while still DRAFT", () => {
    const { fact } = adaptContract(contract(), HOUSEHOLD_ID)
    expect(fact).not.toBeNull()
    expect(validateFinancialFact(fact as FinancialFact)).toEqual([])
  })

  it("rejects a contract from another household", () => {
    const { fact, issues } = adaptContract(contract({ household_id: OTHER_HOUSEHOLD_ID }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
    expect(issues[0].code).toBe("HOUSEHOLD_MISMATCH")
  })

  it("maps an insurance contract to insurance costs and others to essential expenses", () => {
    expect(adaptContract(contract({ category: "insurance" }), HOUSEHOLD_ID).fact?.key).toBe(
      CAPITAL_FACT_KEYS.insuranceCosts,
    )
    expect(adaptContract(contract({ category: "internet" }), HOUSEHOLD_ID).fact?.key).toBe(
      CAPITAL_FACT_KEYS.essentialExpenses,
    )
  })

  it("does not annualize a non-monthly interval", () => {
    const { fact, issues } = adaptContract(contract({ payment_interval: "annual" }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
    expect(issues.some((issue) => issue.code === "UNIT_UNSUPPORTED" && issue.blocking)).toBe(true)
  })

  it("rejects a missing monthly amount rather than inventing zero", () => {
    const { fact } = adaptContract(contract({ monthly_amount: null }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
  })

  it("rejects a negative monthly amount", () => {
    const { fact, issues } = adaptContract(contract({ monthly_amount: "-5.00" }), HOUSEHOLD_ID)
    expect(fact).toBeNull()
    expect(issues.some((issue) => issue.code === "VALUE_NOT_POSITIVE")).toBe(true)
  })
})

describe("capital source adapters — document reviews", () => {
  it("makes a confirmed review fact CONFIRMED with its evidence", () => {
    const { facts } = adaptDocumentReview(documentReview(), HOUSEHOLD_ID)
    expect(facts).toHaveLength(1)
    expect(facts[0].status).toBe("CONFIRMED")
    expect(facts[0].evidenceReference).toBe("page 2")
    expect(facts[0].key).toBe(CAPITAL_FACT_KEYS.debtPayments)
  })

  it("keeps review facts DRAFT when there is no confirmation timestamp", () => {
    const { facts, issues } = adaptDocumentReview(documentReview({ confirmed_at: null }), HOUSEHOLD_ID)
    expect(facts[0].status).toBe("DRAFT")
    expect(issues.some((issue) => issue.code === "SOURCE_UNCONFIRMED")).toBe(true)
  })

  it("skips unsupported keys and non-numeric values inside a review", () => {
    const { facts, issues } = adaptDocumentReview(
      documentReview({
        facts: [
          { key: "unmapped.key", value: "10" },
          { key: "debt.payments_monthly", value: "abc" },
        ],
      }),
      HOUSEHOLD_ID,
    )
    expect(facts).toHaveLength(0)
    expect(issues.some((issue) => issue.code === "UNSUPPORTED_SOURCE_KEY")).toBe(true)
    expect(issues.some((issue) => issue.code === "VALUE_NOT_NUMERIC")).toBe(true)
  })

  it("handles a null or malformed facts payload without inventing entries", () => {
    expect(adaptDocumentReview(documentReview({ facts: null }), HOUSEHOLD_ID).facts).toHaveLength(0)
    expect(adaptDocumentReview(documentReview({ facts: "nonsense" }), HOUSEHOLD_ID).facts).toHaveLength(0)
    expect(adaptDocumentReview(documentReview({ facts: [{ key: "debt.payments_monthly" }] }), HOUSEHOLD_ID).facts).toHaveLength(0)
  })
})

describe("capital source adapters — helpers", () => {
  it("resolves canonical keys case-insensitively", () => {
    expect(canonicalKeyForSourceKey("MONTHLY_INCOME")).toBe(CAPITAL_FACT_KEYS.income)
    expect(canonicalKeyForSourceKey(" monthly_income ")).toBe(CAPITAL_FACT_KEYS.income)
    expect(canonicalKeyForSourceKey("unknown")).toBeNull()
  })

  it("parses German and plain decimal amounts into minor units", () => {
    expect(parseMinorUnits("1.234,56")).toBe(123_456)
    expect(parseMinorUnits("1234.56")).toBe(123_456)
    expect(parseMinorUnits("1234")).toBe(123_400)
    expect(parseMinorUnits(1234.5)).toBe(123_450)
    expect(parseMinorUnits("")).toBeNull()
    expect(parseMinorUnits("12,3,4")).toBeNull()
    expect(parseMinorUnits(null)).toBeNull()
  })

  it("does not depend on the system clock", () => {
    const first = adaptExtractedFact(extractedFact(), HOUSEHOLD_ID).fact
    const second = adaptExtractedFact(extractedFact(), HOUSEHOLD_ID).fact
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first?.provenance.observedAt).toBe("2025-02-10T08:00:00.000Z")
    expect(first?.provenance.observedAt).not.toBe(CALCULATED_AT)
  })
})
