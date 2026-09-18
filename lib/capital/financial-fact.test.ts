import { describe, expect, it } from "vitest"

import {
  createFinancialFact,
  FINANCIAL_FACT_STATUSES,
  isUsableForAnalysis,
  supersedeFinancialFact,
  type FinancialFactInput,
} from "./financial-fact"
import { createProvenance } from "./provenance"
import {
  assertValidFinancialFact,
  FinancialFactValidationError,
  isValidFinancialFact,
  validateFinancialFact,
  type FinancialFactIssueCode,
} from "./validation"

function codesOf(fact: Parameters<typeof validateFinancialFact>[0]): FinancialFactIssueCode[] {
  return validateFinancialFact(fact).map((issue) => issue.code)
}

/** A valid, confirmed monetary fact entered directly by the user. */
function validMoneyFact(overrides: Partial<FinancialFactInput> = {}) {
  return createFinancialFact({
    id: "fact-1",
    householdId: "household-1",
    key: "income.net_monthly",
    value: 320_000,
    type: "money",
    currency: "EUR",
    confidence: 0.9,
    observedAt: "2025-01-31",
    confirmedAt: "2025-02-01T10:00:00.000Z",
    confirmedBy: "user-1",
    status: "CONFIRMED",
    provenance: createProvenance({
      source: "USER",
      sourceReference: "profile-form",
      observedAt: "2025-01-31",
      retrievedAt: "2025-02-01T09:00:00.000Z",
    }),
    ...overrides,
  })
}

describe("FinancialFact construction", () => {
  it("supports the four verification statuses", () => {
    expect([...FINANCIAL_FACT_STATUSES]).toEqual(["DRAFT", "CONFIRMED", "REJECTED", "SUPERSEDED"])
  })

  it("defaults new facts to DRAFT at version 1 without inferring confirmation", () => {
    const fact = createFinancialFact({
      id: "f",
      householdId: "h",
      key: "savings.balance",
      value: 100_000,
      type: "money",
      currency: "EUR",
      provenance: createProvenance({ source: "USER" }),
    })
    expect(fact.status).toBe("DRAFT")
    expect(fact.version).toBe(1)
    expect(fact.confirmedAt).toBeNull()
    expect(fact.confirmedBy).toBeNull()
    expect(fact.source).toBe("USER")
  })

  it("only exposes CONFIRMED facts as usable for analysis", () => {
    expect(isUsableForAnalysis(validMoneyFact())).toBe(true)
    for (const status of ["DRAFT", "REJECTED", "SUPERSEDED"] as const) {
      const fact = validMoneyFact({ status, confirmedAt: null, confirmedBy: null })
      expect(isUsableForAnalysis(fact)).toBe(false)
    }
  })
})

describe("valid FinancialFact", () => {
  it("accepts a confirmed, provenance-backed monetary fact", () => {
    const fact = validMoneyFact()
    expect(validateFinancialFact(fact)).toEqual([])
    expect(isValidFinancialFact(fact)).toBe(true)
    expect(assertValidFinancialFact(fact)).toBe(fact)
  })

  it("accepts a draft fact with a null value (missing data stays a state)", () => {
    const fact = createFinancialFact({
      id: "f",
      householdId: "h",
      key: "debt.mortgage",
      value: null,
      type: "money",
      currency: "EUR",
      provenance: createProvenance({ source: "USER" }),
    })
    expect(validateFinancialFact(fact)).toEqual([])
  })

  it("accepts each supported value type when well formed", () => {
    const base = { id: "f", householdId: "h", key: "k", provenance: createProvenance({ source: "SYSTEM" }) }
    expect(isValidFinancialFact(createFinancialFact({ ...base, value: 12, type: "number", unit: "months" }))).toBe(true)
    expect(isValidFinancialFact(createFinancialFact({ ...base, value: true, type: "boolean" }))).toBe(true)
    expect(isValidFinancialFact(createFinancialFact({ ...base, value: "2025-01-31", type: "date" }))).toBe(true)
    expect(isValidFinancialFact(createFinancialFact({ ...base, value: "high", type: "enum" }))).toBe(true)
    expect(isValidFinancialFact(createFinancialFact({ ...base, value: "note", type: "text" }))).toBe(true)
  })
})

describe("invalid FinancialFact", () => {
  it("requires id, householdId, and key", () => {
    const fact = validMoneyFact({ id: "  ", householdId: "", key: "" })
    expect(codesOf(fact)).toEqual(expect.arrayContaining(["ID_MISSING", "HOUSEHOLD_ID_MISSING", "KEY_MISSING"]))
    expect(isValidFinancialFact(fact)).toBe(false)
  })

  it("rejects an unsupported status", () => {
    const fact = validMoneyFact({ status: "APPROVED" as never })
    expect(codesOf(fact)).toContain("STATUS_UNSUPPORTED")
  })

  it("rejects an unsupported type", () => {
    const fact = validMoneyFact({ type: "currency" as never })
    expect(codesOf(fact)).toContain("TYPE_UNSUPPORTED")
  })

  it("rejects a value that does not match its declared type", () => {
    expect(codesOf(validMoneyFact({ value: 12.5 }))).toContain("VALUE_TYPE_MISMATCH")
    expect(codesOf(validMoneyFact({ type: "number", value: "12", currency: null }))).toContain("VALUE_TYPE_MISMATCH")
    expect(codesOf(validMoneyFact({ type: "boolean", value: "true", currency: null }))).toContain("VALUE_TYPE_MISMATCH")
    expect(codesOf(validMoneyFact({ type: "date", value: "01.02.2025", currency: null }))).toContain("VALUE_TYPE_MISMATCH")
    expect(codesOf(validMoneyFact({ type: "text", value: 5, currency: null }))).toContain("VALUE_TYPE_MISMATCH")
  })

  it("rejects a confirmed fact with a null value", () => {
    expect(codesOf(validMoneyFact({ value: null }))).toContain("VALUE_MISSING")
  })

  it("rejects an invalid observedAt", () => {
    expect(codesOf(validMoneyFact({ observedAt: "31.01.2025" }))).toContain("OBSERVED_AT_INVALID")
  })

  it("reports every issue in a stable order for the same input", () => {
    const fact = validMoneyFact({ id: "", householdId: "", key: "", status: "NOPE" as never })
    const first = codesOf(fact)
    const second = codesOf(fact)
    expect(first).toEqual(second)
    expect(first).toEqual([...first].sort((a, b) => first.indexOf(a) - first.indexOf(b)))
  })
})

describe("confidence bounds", () => {
  it("accepts null and the inclusive [0, 1] range", () => {
    for (const confidence of [null, 0, 0.5, 1]) {
      expect(codesOf(validMoneyFact({ confidence }))).not.toContain("CONFIDENCE_OUT_OF_BOUNDS")
    }
  })

  it("rejects values outside [0, 1] and non-finite numbers", () => {
    for (const confidence of [-0.01, 1.01, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(codesOf(validMoneyFact({ confidence }))).toContain("CONFIDENCE_OUT_OF_BOUNDS")
    }
  })
})

describe("version validity", () => {
  it("requires an integer version >= 1", () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      expect(codesOf(validMoneyFact({ version }))).toContain("VERSION_INVALID")
    }
    expect(codesOf(validMoneyFact({ version: 2 }))).not.toContain("VERSION_INVALID")
  })

  it("superseding creates a new version without mutating the previous record", () => {
    const previous = validMoneyFact()
    const next = supersedeFinancialFact(previous, {
      id: "fact-2",
      key: previous.key,
      value: 340_000,
      type: "money",
      currency: "EUR",
      status: "DRAFT",
      provenance: createProvenance({ source: "USER" }),
    })
    expect(next.version).toBe(previous.version + 1)
    expect(next.id).toBe("fact-2")
    expect(next.householdId).toBe(previous.householdId)
    expect(next.status).toBe("DRAFT")
    expect(previous.version).toBe(1)
    expect(previous.value).toBe(320_000)
  })

  it("allows an explicit version override when superseding", () => {
    const previous = validMoneyFact()
    const next = supersedeFinancialFact(previous, {
      id: "fact-3",
      key: previous.key,
      value: 350_000,
      type: "money",
      currency: "EUR",
      version: 7,
      provenance: createProvenance({ source: "USER" }),
    })
    expect(next.version).toBe(7)
  })

  it("treats a SUPERSEDED fact as valid but unusable", () => {
    const fact = validMoneyFact({ status: "SUPERSEDED" })
    expect(validateFinancialFact(fact)).toEqual([])
    expect(isUsableForAnalysis(fact)).toBe(false)
  })
})

describe("currency and unit consistency", () => {
  it("requires an ISO-4217 currency on monetary facts", () => {
    expect(codesOf(validMoneyFact({ currency: null }))).toContain("CURRENCY_REQUIRED")
    expect(codesOf(validMoneyFact({ currency: "eur" }))).toContain("CURRENCY_INVALID")
    expect(codesOf(validMoneyFact({ currency: "EURO" }))).toContain("CURRENCY_INVALID")
    expect(codesOf(validMoneyFact({ currency: "EUR" }))).not.toContain("CURRENCY_INVALID")
  })

  it("rejects a unit on monetary facts", () => {
    expect(codesOf(validMoneyFact({ unit: "kg" }))).toContain("UNIT_NOT_APPLICABLE")
  })

  it("rejects a currency on non-monetary facts", () => {
    const fact = createFinancialFact({
      id: "f",
      householdId: "h",
      key: "goal.horizon",
      value: 24,
      type: "number",
      currency: "EUR",
      unit: "months",
      provenance: createProvenance({ source: "USER" }),
    })
    expect(codesOf(fact)).toContain("CURRENCY_NOT_APPLICABLE")
    expect(codesOf(fact)).not.toContain("UNIT_NOT_APPLICABLE")
  })

  it("rejects a unit on types that do not accept one", () => {
    const fact = createFinancialFact({
      id: "f",
      householdId: "h",
      key: "goal.label",
      value: "reserve",
      type: "enum",
      unit: "months",
      provenance: createProvenance({ source: "USER" }),
    })
    expect(codesOf(fact)).toContain("UNIT_NOT_APPLICABLE")
  })
})

describe("confirmation rules", () => {
  it("requires confirmedBy and confirmedAt for a CONFIRMED fact", () => {
    expect(codesOf(validMoneyFact({ confirmedBy: null }))).toContain("CONFIRMATION_METADATA_REQUIRED")
    expect(codesOf(validMoneyFact({ confirmedAt: null }))).toContain("CONFIRMATION_METADATA_REQUIRED")
    expect(codesOf(validMoneyFact({ confirmedBy: "  " }))).toContain("CONFIRMATION_METADATA_REQUIRED")
  })

  it("does not require confirmation metadata for draft, rejected, or superseded facts", () => {
    for (const status of ["DRAFT", "REJECTED", "SUPERSEDED"] as const) {
      const fact = validMoneyFact({ status, confirmedAt: null, confirmedBy: null })
      expect(codesOf(fact)).not.toContain("CONFIRMATION_METADATA_REQUIRED")
    }
  })
})

describe("AI_EXTRACTED confirmation protection", () => {
  function aiFact(overrides: Partial<FinancialFactInput> = {}) {
    return createFinancialFact({
      id: "ai-fact",
      householdId: "household-1",
      key: "contract.monthly_premium",
      value: 4_500,
      type: "money",
      currency: "EUR",
      confidence: 0.72,
      evidenceReference: "doc-1#page-2",
      provenance: createProvenance({
        source: "AI_EXTRACTED",
        sourceReference: "doc-1",
        evidenceReference: "doc-1#page-2",
        extractionRunId: "run-9",
        retrievedAt: "2025-02-01T09:00:00.000Z",
      }),
      ...overrides,
    })
  }

  it("allows an AI-extracted fact to remain DRAFT with evidence", () => {
    expect(validateFinancialFact(aiFact())).toEqual([])
  })

  it("rejects an AI-extracted fact that is CONFIRMED without any human confirmation", () => {
    expect(codesOf(aiFact({ status: "CONFIRMED" }))).toEqual(
      expect.arrayContaining(["AI_FACT_AUTO_CONFIRMED", "CONFIRMATION_METADATA_REQUIRED"]),
    )
    expect(isValidFinancialFact(aiFact({ status: "CONFIRMED" }))).toBe(false)
  })

  it("rejects confirmation recorded at or before extraction retrieval time", () => {
    const fact = aiFact({
      status: "CONFIRMED",
      confirmedBy: "advisor-1",
      confirmedAt: "2025-02-01T09:00:00.000Z",
    })
    expect(codesOf(fact)).toContain("AI_FACT_CONFIRMED_WITHOUT_REVIEW")

    const earlier = aiFact({
      status: "CONFIRMED",
      confirmedBy: "advisor-1",
      confirmedAt: "2025-01-01T00:00:00.000Z",
    })
    expect(codesOf(earlier)).toContain("AI_FACT_CONFIRMED_WITHOUT_REVIEW")
  })

  it("accepts an AI-extracted fact confirmed by a human after retrieval", () => {
    const fact = aiFact({
      status: "CONFIRMED",
      confirmedBy: "advisor-1",
      confirmedAt: "2025-02-02T08:30:00.000Z",
    })
    expect(validateFinancialFact(fact)).toEqual([])
    expect(isUsableForAnalysis(fact)).toBe(true)
  })

  it("requires an evidence reference once an AI-extracted fact leaves DRAFT", () => {
    const confirmed = aiFact({
      status: "CONFIRMED",
      evidenceReference: null,
      confirmedBy: "advisor-1",
      confirmedAt: "2025-02-02T08:30:00.000Z",
      provenance: createProvenance({
        source: "AI_EXTRACTED",
        extractionRunId: "run-9",
        retrievedAt: "2025-02-01T09:00:00.000Z",
      }),
    })
    expect(codesOf(confirmed)).toContain("EVIDENCE_REFERENCE_REQUIRED")
  })

  it("does not apply AI confirmation rules to non-AI sources", () => {
    const userConfirmed = validMoneyFact()
    expect(codesOf(userConfirmed)).not.toContain("AI_FACT_AUTO_CONFIRMED")
    expect(codesOf(userConfirmed)).not.toContain("AI_FACT_CONFIRMED_WITHOUT_REVIEW")
  })

  it("throws a typed error listing the issues", () => {
    const fact = aiFact({ status: "CONFIRMED" })
    expect(() => assertValidFinancialFact(fact)).toThrow(FinancialFactValidationError)
    try {
      assertValidFinancialFact(fact)
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialFactValidationError)
      expect((error as FinancialFactValidationError).issues.map((issue) => issue.code)).toContain("AI_FACT_AUTO_CONFIRMED")
      expect((error as Error).message).toContain("INVALID_FINANCIAL_FACT")
    }
  })
})

describe("deterministic validation", () => {
  it("produces identical results across repeated calls", () => {
    const fact = validMoneyFact({ confidence: 5, version: 0, currency: null })
    const runs = Array.from({ length: 5 }, () => validateFinancialFact(fact))
    for (const run of runs) expect(run).toEqual(runs[0])
  })

  it("does not mutate the validated fact", () => {
    const fact = validMoneyFact()
    const snapshot = JSON.stringify(fact)
    validateFinancialFact(fact)
    isValidFinancialFact(fact)
    expect(JSON.stringify(fact)).toBe(snapshot)
  })
})
