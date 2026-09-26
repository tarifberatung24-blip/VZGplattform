import { describe, expect, it } from "vitest"
import { verifyBill, type ActualBillTerms, type ExpectedBillTerms } from "./verification"

function expected(overrides: Partial<ExpectedBillTerms> = {}): ExpectedBillTerms {
  return {
    monthlyCost: 34.99,
    oneTimeCredit: null,
    activationFee: 0,
    effectiveDate: "2026-10-01",
    ...overrides,
  }
}

function actual(overrides: Partial<ActualBillTerms> = {}): ActualBillTerms {
  return {
    monthlyCost: 34.99,
    oneTimeCredit: null,
    activationFee: null,
    billingPeriodStart: "2026-10-01",
    billingPeriodEnd: "2026-10-31",
    ...overrides,
  }
}

describe("bill verification", () => {
  it("verifies when the bill matches the negotiated terms", () => {
    const result = verifyBill({ expected: expected(), actual: actual(), today: "2026-11-05" })
    expect(result.result).toBe("VERIFIED")
    expect(result.discrepancies).toEqual([])
  })

  it("reports NOT_YET_EFFECTIVE when the bill predates the effective date", () => {
    const result = verifyBill({
      expected: expected({ effectiveDate: "2026-11-01" }),
      actual: actual({ billingPeriodEnd: "2026-10-31" }),
      today: "2026-10-20",
    })
    expect(result.result).toBe("NOT_YET_EFFECTIVE")
  })

  it("reports a monthly-cost mismatch with the exact figures", () => {
    const result = verifyBill({
      expected: expected(),
      actual: actual({ monthlyCost: 49.99 }),
      today: "2026-11-05",
    })
    expect(result.result).toBe("MISMATCH")
    expect(result.discrepancies).toContainEqual({
      field: "monthly_cost",
      expected: 34.99,
      actual: 49.99,
    })
  })

  it("reports a missing credit as a mismatch", () => {
    const result = verifyBill({
      expected: expected({ oneTimeCredit: 10 }),
      actual: actual({ oneTimeCredit: null }),
      today: "2026-11-05",
    })
    expect(result.result).toBe("MISMATCH")
    expect(result.discrepancies).toContainEqual({
      field: "one_time_credit",
      expected: 10,
      actual: null,
    })
  })

  it("reports an unexpected activation fee against an expected zero", () => {
    const result = verifyBill({
      expected: expected({ activationFee: 0 }),
      actual: actual({ activationFee: 39.99 }),
      today: "2026-11-05",
    })
    expect(result.result).toBe("MISMATCH")
    expect(result.discrepancies).toContainEqual({
      field: "activation_fee",
      expected: 0,
      actual: 39.99,
    })
    expect(result.followUpActions).toContain("verification.mismatch.activation_fee")
  })

  it("treats a missing monthly cost on the bill as a mismatch, not as zero", () => {
    const result = verifyBill({
      expected: expected(),
      actual: actual({ monthlyCost: null }),
      today: "2026-11-05",
    })
    expect(result.result).toBe("MISMATCH")
    expect(result.discrepancies).toContainEqual({
      field: "monthly_cost",
      expected: 34.99,
      actual: null,
    })
  })

  it("is deterministic for the same inputs", () => {
    const input = { expected: expected(), actual: actual({ monthlyCost: 49.99 }), today: "2026-11-05" }
    expect(verifyBill(input)).toEqual(verifyBill(input))
  })
})
