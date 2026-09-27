import { describe, expect, it } from "vitest"
import { buildContractFacts, type NegotiationContract } from "./facts"
import {
  comparisonDataRequired,
  documentedPriceIncrease,
  evaluateOpportunity,
  type ApprovedAlternative,
} from "./opportunity"

function facts(overrides: Partial<NegotiationContract> = {}) {
  const base: NegotiationContract = {
    id: "c1",
    title: "DSL 100",
    category: "internet",
    provider: "Telekom",
    customerNumber: "K-1",
    contractNumber: null,
    monthlyAmount: 49.99,
    startDate: "2022-01-01",
    endDate: "2027-01-01",
    cancellationDeadline: "2026-11-01",
    promotionExpiry: null,
    services: [],
    priceHistory: [],
    reviewStatus: "confirmed",
    documentId: "d1",
    ...overrides,
  }
  return buildContractFacts(base)
}

const alternative: ApprovedAlternative = {
  source: "partner",
  partnerId: "energy",
  monthlyCost: 29.99,
  keeps: ["same_speed"],
  available: true,
}

describe("opportunity engine — NEGOTIATE", () => {
  it("negotiates when a cheaper approved alternative exists and the contract is live", () => {
    const result = evaluateOpportunity({
      facts: facts(),
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    expect(result.action).toBe("NEGOTIATE")
    expect(result.reasonCodes).toContain("APPROVED_ALTERNATIVE_AVAILABLE")
    expect(result.targetMonthlyCost).toBe(29.99)
    expect(result.potentialMonthlySaving).toBe(20)
    expect(result.potentialAnnualSaving).toBe(240)
    expect(comparisonDataRequired(result)).toBe(false)
  })

  it("prefers negotiation over switching while the contract still runs", () => {
    const result = evaluateOpportunity({
      facts: facts({ endDate: "2027-01-01" }),
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    expect(result.action).toBe("NEGOTIATE")
  })
})

describe("opportunity engine — SWITCH", () => {
  it("switches when the contract has ended and an alternative is evidenced", () => {
    const result = evaluateOpportunity({
      facts: facts({ endDate: "2026-08-01" }),
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    expect(result.action).toBe("SWITCH")
    expect(result.reasonCodes).toContain("CONTRACT_ENDED")
    expect(result.potentialMonthlySaving).toBe(20)
  })

  it("never switches without an evidenced alternative", () => {
    const result = evaluateOpportunity({
      facts: facts({ endDate: "2026-08-01" }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.action).not.toBe("SWITCH")
    expect(result.targetMonthlyCost).toBeNull()
    expect(result.potentialMonthlySaving).toBeNull()
  })
})

describe("opportunity engine — WAIT", () => {
  it("waits when an active promotion still has time and no gap is evidenced", () => {
    const result = evaluateOpportunity({
      facts: facts({ promotionExpiry: "2027-06-01", cancellationDeadline: null }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.action).toBe("WAIT")
    expect(result.reasonCodes).toContain("PROMOTION_ACTIVE")
    expect(result.nextReviewDate).not.toBeNull()
  })

  it("waits with a comparison-needed reason when a lever exists but no target does", () => {
    const result = evaluateOpportunity({
      facts: facts({ cancellationDeadline: "2026-10-15" }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.action).toBe("WAIT")
    expect(result.reasonCodes).toContain("CANCELLATION_WINDOW_OPEN")
    expect(result.reasonCodes).toContain("MISSING_COMPARISON_DATA")
    expect(result.targetMonthlyCost).toBeNull()
  })
})

describe("opportunity engine — NO_ACTION", () => {
  it("returns NO_ACTION with no leverage and no promotion", () => {
    const result = evaluateOpportunity({
      facts: facts({ cancellationDeadline: null, endDate: "2028-01-01", promotionExpiry: null }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.action).toBe("NO_ACTION")
    expect(result.reasonCodes).toContain("NO_LEVERAGE_FOUND")
  })

  it("returns NO_ACTION and names the missing cost when there is none", () => {
    const result = evaluateOpportunity({
      facts: facts({ monthlyAmount: null }),
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    expect(result.action).toBe("NO_ACTION")
    expect(result.reasonCodes).toContain("MISSING_CURRENT_COST")
    expect(result.missingInformation).toContain("current_monthly_cost")
    // An alternative cannot produce a saving when the current cost is unknown.
    expect(result.potentialMonthlySaving).toBeNull()
  })
})

describe("opportunity engine — missing data and honesty", () => {
  it("reports every missing fact without inventing a value", () => {
    const result = evaluateOpportunity({
      facts: facts({
        provider: null,
        monthlyAmount: null,
        cancellationDeadline: null,
        endDate: null,
        reviewStatus: "needs_review",
      }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.missingInformation).toEqual(
      expect.arrayContaining([
        "provider",
        "current_monthly_cost",
        "cancellation_deadline",
        "contract_end_date",
        "comparison_offer",
        "contract_review",
      ]),
    )
    expect(result.reasonCodes).toContain("UNVERIFIED_CONTRACT_DATA")
  })

  it("does not treat an alternative that is not cheaper as a saving", () => {
    const result = evaluateOpportunity({
      facts: facts({ monthlyAmount: 29.99 }),
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    expect(result.potentialMonthlySaving).toBeNull()
    expect(result.action).not.toBe("NEGOTIATE")
  })

  it("requires comparison data whenever there is no target", () => {
    const result = evaluateOpportunity({
      facts: facts(),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(comparisonDataRequired(result)).toBe(true)
    expect(result.targetMonthlyCost).toBeNull()
    expect(result.potentialAnnualSaving).toBeNull()
  })

  it("is deterministic for the same inputs", () => {
    const input = { facts: facts(), today: "2026-09-26", approvedAlternative: alternative }
    expect(evaluateOpportunity(input)).toEqual(evaluateOpportunity(input))
  })
})

describe("documented price increase", () => {
  it("requires at least two ordered points and a higher latest value", () => {
    expect(documentedPriceIncrease(facts())).toBe(false)
    expect(
      documentedPriceIncrease(
        facts({ priceHistory: [{ effectiveDate: "2023-01-01", monthlyAmount: 39.99, source: "document" }] }),
      ),
    ).toBe(false)
    expect(
      documentedPriceIncrease(
        facts({
          priceHistory: [
            { effectiveDate: "2023-01-01", monthlyAmount: 39.99, source: "document" },
            { effectiveDate: "2024-06-01", monthlyAmount: 49.99, source: "document" },
          ],
        }),
      ),
    ).toBe(true)
    expect(
      documentedPriceIncrease(
        facts({
          priceHistory: [
            { effectiveDate: "2023-01-01", monthlyAmount: 59.99, source: "document" },
            { effectiveDate: "2024-06-01", monthlyAmount: 49.99, source: "document" },
          ],
        }),
      ),
    ).toBe(false)
  })

  it("surfaces a documented increase as a reason code", () => {
    const result = evaluateOpportunity({
      facts: facts({
        cancellationDeadline: null,
        promotionExpiry: null,
        priceHistory: [
          { effectiveDate: "2023-01-01", monthlyAmount: 39.99, source: "document" },
          { effectiveDate: "2024-06-01", monthlyAmount: 49.99, source: "document" },
        ],
      }),
      today: "2026-09-26",
      approvedAlternative: null,
    })
    expect(result.reasonCodes).toContain("DOCUMENTED_PRICE_INCREASE")
  })
})
