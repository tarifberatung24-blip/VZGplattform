import { describe, expect, it } from "vitest"
import {
  buildContractFacts,
  contractEligibility,
  normalizeAmount,
  normalizeIsoDate,
  type NegotiationContract,
} from "./facts"
import { getCategoryConfig, isCategoryNegotiable, negotiableCategories } from "./categories"

function contract(overrides: Partial<NegotiationContract> = {}): NegotiationContract {
  return {
    id: "c1",
    title: "DSL 100",
    category: "internet",
    provider: "Telekom",
    customerNumber: "K-123",
    contractNumber: null,
    monthlyAmount: 49.99,
    startDate: "2022-01-01",
    endDate: "2027-01-01",
    cancellationDeadline: "2026-11-01",
    promotionExpiry: null,
    services: ["100 Mbit/s"],
    priceHistory: [],
    reviewStatus: "confirmed",
    documentId: "d1",
    ...overrides,
  }
}

describe("contract facts", () => {
  it("carries only evidenced values and leaves the rest null", () => {
    const facts = buildContractFacts(contract({ provider: null, monthlyAmount: null }))
    expect(facts.provider).toBeNull()
    expect(facts.currentMonthlyCost).toBeNull()
    expect(facts.contractId).toBe("c1")
  })

  it("drops a malformed date instead of interpreting it", () => {
    expect(normalizeIsoDate("2026-02-30")).toBeNull()
    expect(normalizeIsoDate("01.02.2026")).toBeNull()
    expect(normalizeIsoDate("2026-02-28")).toBe("2026-02-28")
  })

  it("treats zero and negative amounts as no cost", () => {
    expect(normalizeAmount(0)).toBeNull()
    expect(normalizeAmount(-5)).toBeNull()
    expect(normalizeAmount(49.994)).toBe(49.99)
  })

  it("keeps only well-formed price-history points", () => {
    const facts = buildContractFacts(
      contract({
        priceHistory: [
          { effectiveDate: "2023-01-01", monthlyAmount: 39.99, source: "document" },
          { effectiveDate: "nonsense", monthlyAmount: 44.99, source: "user" },
          { effectiveDate: "2024-01-01", monthlyAmount: 0, source: "user" },
        ],
      }),
    )
    // The undated point is kept: its amount is evidenced, only its date is not,
    // and `documentedPriceIncrease` ignores undated points when ordering. The
    // zero-amount point is dropped because zero is not a cost.
    expect(facts.priceHistory).toHaveLength(2)
    expect(facts.priceHistory[0].monthlyAmount).toBe(39.99)
    expect(facts.priceHistory[1].effectiveDate).toBeNull()
  })

  it("marks a contract verified only when its review status is confirmed", () => {
    expect(buildContractFacts(contract({ reviewStatus: "confirmed" })).verified).toBe(true)
    expect(buildContractFacts(contract({ reviewStatus: "needs_review" })).verified).toBe(false)
    expect(buildContractFacts(contract({ reviewStatus: null })).verified).toBe(false)
  })
})

describe("category eligibility", () => {
  it("enables internet and mobile for the first MVP", () => {
    expect(contractEligibility(contract({ category: "internet" }))).toEqual({
      eligible: true,
      reason: null,
    })
    expect(contractEligibility(contract({ category: "mobile" }))).toEqual({
      eligible: true,
      reason: null,
    })
    expect(negotiableCategories()).toEqual(["internet", "mobile"])
  })

  it("refuses a regulated category behind its compliance flag", () => {
    expect(getCategoryConfig("insurance").regulated).toBe(true)
    expect(getCategoryConfig("insurance").complianceApproved).toBe(false)
    expect(contractEligibility(contract({ category: "insurance" }))).toEqual({
      eligible: false,
      reason: "CATEGORY_REGULATED",
    })
    expect(isCategoryNegotiable("insurance")).toBe(false)
  })

  it("refuses a known but not-yet-enabled category", () => {
    for (const category of ["electricity", "gas", "kfz", "subscription", "housing"] as const) {
      expect(contractEligibility(contract({ category }))).toEqual({
        eligible: false,
        reason: "CATEGORY_NOT_ENABLED",
      })
    }
  })

  it("refuses an unknown category", () => {
    expect(contractEligibility(contract({ category: "crypto" }))).toEqual({
      eligible: false,
      reason: "NOT_ELIGIBLE_CATEGORY",
    })
  })
})
