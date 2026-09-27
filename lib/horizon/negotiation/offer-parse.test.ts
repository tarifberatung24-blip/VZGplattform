import { describe, expect, it } from "vitest"
import { parseProviderOffer } from "./offer-parse"

describe("provider offer parsing contract", () => {
  it("reads explicit euro amounts and durations", () => {
    const parsed = parseProviderOffer(
      [
        "Sehr geehrter Kunde,",
        "wir bieten Ihnen 34,99 € monatlich an.",
        "Aktionsrabatt 12 Monate",
        "Aktivierungsgebühr 39,99 €",
        "Gutschrift 100 €",
        "Mindestlaufzeit 24 Monate",
        "Gültig ab 2026-10-01",
      ].join("\n"),
    )
    expect(parsed.terms.newMonthly).toBe(34.99)
    expect(parsed.terms.promotionDurationMonths).toBe(12)
    expect(parsed.terms.activationFee).toBe(39.99)
    expect(parsed.terms.oneTimeCredit).toBe(100)
    expect(parsed.terms.newContractDurationMonths).toBe(24)
    expect(parsed.terms.effectiveDate).toBe("2026-10-01")
  })

  it("leaves a field null rather than guessing when no amount is present", () => {
    const parsed = parseProviderOffer("Aktivierungsgebühr entfällt")
    expect(parsed.terms.activationFee).toBeNull()
  })

  it("keeps unrecognised lines instead of dropping them silently", () => {
    const parsed = parseProviderOffer("Wir freuen uns auf Ihre Rückmeldung.")
    expect(parsed.unrecognized).toContain("Wir freuen uns auf Ihre Rückmeldung.")
    expect(parsed.extractedFields).toEqual([])
  })

  it("reads the post-promotion rate when the wording states it", () => {
    const parsed = parseProviderOffer("Nach der Aktion 44,99 € monatlich")
    expect(parsed.terms.postPromotionMonthly).toBe(44.99)
  })

  it("does not read a date that is not in ISO form", () => {
    const parsed = parseProviderOffer("Gültig ab 01.10.2026")
    expect(parsed.terms.effectiveDate).toBeNull()
  })

  it("is deterministic for the same input", () => {
    const text = "34,99 € monatlich\nMindestlaufzeit 24 Monate"
    expect(parseProviderOffer(text)).toEqual(parseProviderOffer(text))
  })

  it("handles German thousands separators", () => {
    const parsed = parseProviderOffer("Gutschrift 1.200,00 €")
    expect(parsed.terms.oneTimeCredit).toBe(1200)
  })
})
