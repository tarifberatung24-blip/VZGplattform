import { describe, expect, it } from "vitest"
import { computeContentHash } from "@/lib/horizon/case/approval"
import { buildOfferComparison, canDecideOffer } from "./review"
import { emptyPreferences, type NegotiationPreferences } from "./preferences"
import { EMPTY_OFFER_TERMS, type OfferTerms } from "./savings"

function terms(overrides: Partial<OfferTerms> = {}): OfferTerms {
  return { ...EMPTY_OFFER_TERMS, newMonthly: 34.99, ...overrides }
}

function preferences(overrides: Partial<NegotiationPreferences> = {}): NegotiationPreferences {
  return { ...emptyPreferences(), ...overrides }
}

describe("offer comparison", () => {
  it("shows old, provider offer and approved alternative together", () => {
    const comparison = buildOfferComparison({
      currentMonthly: 49.99,
      currentRemainingMonths: 24,
      terms: terms({ newContractDurationMonths: 24 }),
      approvedAlternative: {
        source: "partner",
        partnerId: "energy",
        monthlyCost: 29.99,
        keeps: ["same_speed"],
        available: true,
      },
      preferences: preferences(),
      offerContentHash: "hash",
      keptServices: ["same_speed"],
    })
    expect(comparison.current.monthlyCost).toBe(49.99)
    expect(comparison.providerOffer.monthlyCost).toBe(34.99)
    expect(comparison.approvedAlternative.monthlyCost).toBe(29.99)
    expect(comparison.savings.monthlyRecurringSaving).toBe(15)
  })

  it("reports the additional binding period an offer creates", () => {
    const comparison = buildOfferComparison({
      currentMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ newContractDurationMonths: 24 }),
      approvedAlternative: null,
      preferences: preferences(),
      offerContentHash: "hash",
      keptServices: [],
    })
    expect(comparison.savings.additionalBindingMonths).toBe(12)
    expect(comparison.savings.warnings).toContain("NEW_MINIMUM_TERM")
  })

  it("marks an offer that violates a hard preference as blocked", () => {
    const comparison = buildOfferComparison({
      currentMonthly: 49.99,
      currentRemainingMonths: 12,
      terms: terms({ activationFee: 39.99 }),
      approvedAlternative: null,
      preferences: preferences({ mustNeverAccept: ["activation_fee"] }),
      offerContentHash: "hash",
      keptServices: [],
    })
    expect(comparison.blockedByPreferences).toBe(true)
    expect(comparison.preferenceEvaluation.acceptable).toBe(false)
  })
})

describe("approval binding and invalidation", () => {
  it("refuses acceptance when the approved hash does not match the content", () => {
    const decision = canDecideOffer({
      decision: "ACCEPT",
      offerStatus: "received",
      approvedHash: "old-hash",
      currentContentHash: "new-hash",
      blockedByPreferences: false,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe("NEGOTIATION_APPROVAL_HASH_MISMATCH")
  })

  it("allows acceptance when the approved hash matches the content", () => {
    const decision = canDecideOffer({
      decision: "ACCEPT",
      offerStatus: "received",
      approvedHash: "same-hash",
      currentContentHash: "same-hash",
      blockedByPreferences: false,
    })
    expect(decision.allowed).toBe(true)
  })

  it("refuses acceptance when a hard preference is violated", () => {
    const decision = canDecideOffer({
      decision: "ACCEPT",
      offerStatus: "received",
      approvedHash: "same-hash",
      currentContentHash: "same-hash",
      blockedByPreferences: true,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe("NEGOTIATION_OFFER_VIOLATES_PREFERENCES")
  })

  it("refuses any decision on an already-decided offer", () => {
    const decision = canDecideOffer({
      decision: "REJECT",
      offerStatus: "accepted",
      approvedHash: null,
      currentContentHash: "hash",
      blockedByPreferences: false,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe("NEGOTIATION_OFFER_NOT_REVIEWABLE")
  })

  it("allows a counter or reject without an approval hash", () => {
    for (const decision of ["COUNTER", "REJECT", "COMPARE_SWITCH"] as const) {
      expect(
        canDecideOffer({
          decision,
          offerStatus: "received",
          approvedHash: null,
          currentContentHash: "hash",
          blockedByPreferences: false,
        }).allowed,
      ).toBe(true)
    }
  })

  it("changes the hash when any content changes, invalidating the approval", async () => {
    const original = await computeContentHash(JSON.stringify({ newMonthly: 34.99 }))
    const approved = await computeContentHash(JSON.stringify({ newMonthly: 34.99 }))
    const changed = await computeContentHash(JSON.stringify({ newMonthly: 34.98 }))
    expect(original).toBe(approved)
    expect(changed).not.toBe(original)
    expect(
      canDecideOffer({
        decision: "ACCEPT",
        offerStatus: "received",
        approvedHash: original,
        currentContentHash: changed,
        blockedByPreferences: false,
      }).allowed,
    ).toBe(false)
  })
})
