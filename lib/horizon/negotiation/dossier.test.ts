import { describe, expect, it } from "vitest"
import { buildDossier } from "./dossier"
import { buildContractFacts, type NegotiationContract } from "./facts"
import { emptyPreferences } from "./preferences"
import { evaluateOpportunity, type ApprovedAlternative } from "./opportunity"

function facts(overrides: Partial<NegotiationContract> = {}) {
  return buildContractFacts({
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
    services: ["100 Mbit/s"],
    priceHistory: [],
    reviewStatus: "confirmed",
    documentId: "d1",
    ...overrides,
  })
}

const alternative: ApprovedAlternative = {
  source: "partner",
  partnerId: "energy",
  monthlyCost: 29.99,
  keeps: ["same_speed"],
  available: true,
}

describe("negotiation dossier", () => {
  it("names the missing facts instead of filling them", () => {
    const contractFacts = facts({ customerNumber: null })
    const opportunity = evaluateOpportunity({
      facts: contractFacts,
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    const dossier = buildDossier({
      facts: contractFacts,
      preferences: emptyPreferences(),
      opportunity,
      approvedAlternative: alternative,
      today: "2026-09-26",
    })
    expect(dossier.currentContract.missing).toContain("customer_number")
    expect(dossier.currentContract.known.customerNumber).toBeNull()
  })

  it("builds a primary ask only when an evidenced target exists", () => {
    const contractFacts = facts()
    const opportunity = evaluateOpportunity({
      facts: contractFacts,
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    const dossier = buildDossier({
      facts: contractFacts,
      preferences: emptyPreferences(),
      opportunity,
      approvedAlternative: alternative,
      today: "2026-09-26",
    })
    expect(dossier.plan.primaryAsk).toContain("29.99")
    expect(dossier.target.missing).toEqual([])
  })

  it("produces no primary ask when no target exists", () => {
    const contractFacts = facts()
    const opportunity = evaluateOpportunity({
      facts: contractFacts,
      today: "2026-09-26",
      approvedAlternative: null,
    })
    const dossier = buildDossier({
      facts: contractFacts,
      preferences: emptyPreferences(),
      opportunity,
      approvedAlternative: null,
      today: "2026-09-26",
    })
    expect(dossier.plan.primaryAsk).toBeNull()
    expect(dossier.target.missing).toContain("target_monthly_cost")
    expect(dossier.leverage.missing).toContain("comparison_offer")
  })

  it("carries the decision action and reason codes through", () => {
    const contractFacts = facts()
    const opportunity = evaluateOpportunity({
      facts: contractFacts,
      today: "2026-09-26",
      approvedAlternative: alternative,
    })
    const dossier = buildDossier({
      facts: contractFacts,
      preferences: emptyPreferences(),
      opportunity,
      approvedAlternative: alternative,
      today: "2026-09-26",
    })
    expect(dossier.decisionAction).toBe("NEGOTIATE")
    expect(dossier.reasonCodes).toContain("APPROVED_ALTERNATIVE_AVAILABLE")
  })

  it("computes tenure from the contract start date", () => {
    const contractFacts = facts({ startDate: "2022-01-01" })
    const opportunity = evaluateOpportunity({
      facts: contractFacts,
      today: "2026-09-26",
      approvedAlternative: null,
    })
    const dossier = buildDossier({
      facts: contractFacts,
      preferences: emptyPreferences(),
      opportunity,
      approvedAlternative: null,
      today: "2026-09-26",
    })
    expect(dossier.leverage.known.tenureMonths).toBe(56)
  })
})
