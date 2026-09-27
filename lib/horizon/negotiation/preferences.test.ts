import { describe, expect, it } from "vitest"
import {
  evaluatePreferences,
  offerShapeFromTerms,
  emptyPreferences,
  type NegotiationPreferences,
  type OfferShape,
} from "./preferences"
import { EMPTY_OFFER_TERMS } from "./savings"

function preferences(overrides: Partial<NegotiationPreferences> = {}): NegotiationPreferences {
  return { ...emptyPreferences(), ...overrides }
}

function shape(overrides: Partial<OfferShape> = {}): OfferShape {
  return {
    addsService: false,
    removesService: false,
    changesPlan: false,
    extendsContractMonths: null,
    usesOneTimeCredit: false,
    usesTemporaryDiscount: false,
    chargesActivationFee: false,
    chargesHardwareFee: false,
    keeps: [],
    ...overrides,
  }
}

describe("preference enforcement — hard constraints", () => {
  it("blocks an offer that adds a forbidden service", () => {
    const result = evaluatePreferences(
      preferences({ mustNeverAccept: ["added_service"] }),
      shape({ addsService: true }),
      15,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({ code: "MUST_NEVER_ACCEPT", item: "added_service", hard: true })
  })

  it("blocks an offer that lengthens a contract the user forbade lengthening", () => {
    const result = evaluatePreferences(
      preferences({ mustNeverAccept: ["longer_contract"] }),
      shape({ extendsContractMonths: 24 }),
      15,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations.some((violation) => violation.code === "MUST_NEVER_ACCEPT")).toBe(true)
  })

  it("blocks an offer charging an activation fee the user forbade", () => {
    const result = evaluatePreferences(
      preferences({ mustNeverAccept: ["activation_fee"] }),
      shape({ chargesActivationFee: true }),
      15,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({ code: "MUST_NEVER_ACCEPT", item: "activation_fee", hard: true })
  })

  it("blocks an offer that fails to preserve something the user must keep", () => {
    const result = evaluatePreferences(
      preferences({ mustKeep: ["same_speed", "same_phone_number"] }),
      shape({ keeps: ["same_speed"] }),
      15,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({
      code: "MUST_KEEP_VIOLATED",
      item: "same_phone_number",
      hard: true,
    })
  })

  it("blocks an offer that exceeds the maximum contract extension", () => {
    const result = evaluatePreferences(
      preferences({ maxContractExtensionMonths: 6 }),
      shape({ extendsContractMonths: 12 }),
      15,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({ code: "MAX_EXTENSION_EXCEEDED", item: null, hard: true })
  })

  it("blocks acceptance when a minimum saving is set but no saving is evidenced", () => {
    const result = evaluatePreferences(
      preferences({ minMonthlySaving: 5 }),
      shape(),
      null,
    )
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({ code: "COMPARISON_DATA_REQUIRED", item: null, hard: true })
  })

  it("blocks acceptance when the evidenced saving is below the minimum", () => {
    const result = evaluatePreferences(preferences({ minMonthlySaving: 20 }), shape(), 15)
    expect(result.acceptable).toBe(false)
    expect(result.violations).toContainEqual({ code: "MIN_SAVING_NOT_MET", item: null, hard: true })
  })
})

describe("preference enforcement — soft permissions", () => {
  it("surfaces an add-on outside the allowed set without blocking", () => {
    const result = evaluatePreferences(preferences({ allowAddons: false }), shape({ addsService: true }), 15)
    expect(result.acceptable).toBe(true)
    expect(result.violations).toContainEqual({ code: "ADDONS_NOT_ALLOWED", item: "added_service", hard: false })
  })

  it("surfaces a temporary discount outside the allowed set without blocking", () => {
    const result = evaluatePreferences(
      preferences({ allowTemporaryDiscount: false }),
      shape({ usesTemporaryDiscount: true }),
      15,
    )
    expect(result.acceptable).toBe(true)
    expect(result.violations.some((violation) => violation.code === "TEMPORARY_DISCOUNT_NOT_ALLOWED")).toBe(true)
  })

  it("accepts an offer that respects every hard constraint", () => {
    const result = evaluatePreferences(
      preferences({
        mustKeep: ["same_speed"],
        mustNeverAccept: ["added_service", "longer_contract"],
        maxContractExtensionMonths: 12,
        minMonthlySaving: 10,
      }),
      // No extension: the user forbade lengthening the contract, so an offer that
      // respects that hard constraint must not extend it at all.
      shape({ keeps: ["same_speed"], extendsContractMonths: null }),
      15,
    )
    expect(result.acceptable).toBe(true)
    expect(result.violations).toEqual([])
  })
})

describe("offer shape derivation", () => {
  it("derives service and fee flags from the offer terms", () => {
    const derived = offerShapeFromTerms(
      {
        ...EMPTY_OFFER_TERMS,
        addedServices: ["TV"],
        activationFee: 39.99,
        oneTimeCredit: 50,
        promotionDurationMonths: 6,
        newContractDurationMonths: 24,
      },
      {},
    )
    expect(derived.addsService).toBe(true)
    expect(derived.chargesActivationFee).toBe(true)
    expect(derived.usesOneTimeCredit).toBe(true)
    expect(derived.usesTemporaryDiscount).toBe(true)
    expect(derived.extendsContractMonths).toBe(24)
  })
})
