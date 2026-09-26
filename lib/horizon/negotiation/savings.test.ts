import { describe, expect, it } from "vitest"
import {
  calculateSavings,
  savingsStateFor,
  verifiedSavingsOutput,
  EMPTY_OFFER_TERMS,
  type OfferTerms,
} from "./savings"

function terms(overrides: Partial<OfferTerms> = {}): OfferTerms {
  return { ...EMPTY_OFFER_TERMS, ...overrides }
}

describe("savings state separation", () => {
  it("never reports a lower state as a higher one", () => {
    expect(
      savingsStateFor({ providerConfirmed: false, offerAccepted: false, verificationResult: null }),
    ).toBe("POTENTIAL")
    expect(
      savingsStateFor({ providerConfirmed: false, offerAccepted: true, verificationResult: null }),
    ).toBe("OFFERED")
    expect(
      savingsStateFor({ providerConfirmed: true, offerAccepted: true, verificationResult: null }),
    ).toBe("CONFIRMED")
    expect(
      savingsStateFor({ providerConfirmed: true, offerAccepted: true, verificationResult: "VERIFIED" }),
    ).toBe("VERIFIED")
  })

  it("does not treat a mismatch as verified", () => {
    expect(
      savingsStateFor({ providerConfirmed: true, offerAccepted: true, verificationResult: "MISMATCH" }),
    ).toBe("CONFIRMED")
  })
})

describe("savings formula", () => {
  it("computes the recurring and annualised saving from two evidenced prices", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 34.99 }),
    })
    expect(result.monthlyRecurringSaving).toBe(15)
    expect(result.annualizedRecurringSaving).toBe(180)
    expect(result.netFirstYearEffect).toBe(180)
  })

  it("returns nulls when either price is missing", () => {
    expect(
      calculateSavings({ oldMonthly: null, currentRemainingMonths: null, terms: terms({ newMonthly: 34.99 }) })
        .monthlyRecurringSaving,
    ).toBeNull()
    expect(
      calculateSavings({ oldMonthly: 49.99, currentRemainingMonths: null, terms: terms({ newMonthly: null }) })
        .monthlyRecurringSaving,
    ).toBeNull()
  })

  it("includes a one-time credit in the first-year effect but not the recurring rate", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 34.99, oneTimeCredit: 100 }),
    })
    expect(result.monthlyRecurringSaving).toBe(15)
    expect(result.oneTimeCredit).toBe(100)
    expect(result.netFirstYearEffect).toBe(280)
  })

  it("subtracts activation and hardware fees from the first-year effect", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 34.99, activationFee: 39.99, hardwareFee: 10.01 }),
    })
    expect(result.oneTimeFees).toBe(50)
    expect(result.netFirstYearEffect).toBe(130)
  })

  it("exposes a new minimum term rather than hiding it", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 34.99, newContractDurationMonths: 24 }),
    })
    expect(result.additionalBindingMonths).toBe(12)
    expect(result.warnings).toContain("NEW_MINIMUM_TERM")
  })

  it("flags added and removed services", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: null,
      terms: terms({ newMonthly: 34.99, addedServices: ["TV"], removedServices: ["Festnetz"] }),
    })
    expect(result.warnings).toContain("ADDED_SERVICES")
    expect(result.warnings).toContain("REMOVED_SERVICES")
  })
})

describe("temporary discounts", () => {
  it("only annualises the promotional window when the post-promotion rate is unknown", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 29.99, promotionDurationMonths: 6 }),
    })
    expect(result.warnings).toContain("TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN")
    // 6 months at €20 saving; the remaining 6 months are not claimed.
    expect(result.netFirstYearEffect).toBe(120)
  })

  it("uses the stated post-promotion rate when it is given", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 29.99, promotionDurationMonths: 6, postPromotionMonthly: 44.99 }),
    })
    expect(result.warnings).not.toContain("TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN")
    // 6 × €20 + 6 × €5 = 150
    expect(result.netFirstYearEffect).toBe(150)
  })

  it("treats a twelve-month discount as a full-year rate", () => {
    const result = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 29.99, promotionDurationMonths: 12 }),
    })
    expect(result.warnings).not.toContain("TEMPORARY_DISCOUNT_POST_RATE_UNKNOWN")
    expect(result.netFirstYearEffect).toBe(240)
  })
})

describe("verified savings output for Capital", () => {
  it("only exposes a saving when the state is VERIFIED", () => {
    const confirmed = calculateSavings({
      oldMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newMonthly: 34.99 }),
      state: "CONFIRMED",
    })
    expect(verifiedSavingsOutput(confirmed)).toEqual({
      verifiedMonthlySaving: null,
      verifiedAnnualSaving: null,
    })

    const verified = { ...confirmed, state: "VERIFIED" as const }
    expect(verifiedSavingsOutput(verified)).toEqual({
      verifiedMonthlySaving: 15,
      verifiedAnnualSaving: 180,
    })
  })
})
