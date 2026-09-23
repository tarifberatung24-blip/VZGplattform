import { describe, expect, it } from "vitest"
import { insuranceHubCopy, insuranceProductContent } from "./insurance-content"
import { affiliateDisclosure } from "../../lib/affiliate-disclosure"

const productIds = ["business-insurance", "kfz"] as const

describe("insurance hub content", () => {
  it("covers both approved insurance products in both locales", () => {
    for (const id of productIds) {
      const product = insuranceProductContent[id]
      expect(product.href).toBe(`/angebote/${id}`)
      for (const locale of ["bg", "de"] as const) {
        expect(product[locale].name.trim().length).toBeGreaterThan(0)
        expect(product[locale].summary.trim().length).toBeGreaterThan(0)
        expect(product[locale].details.length).toBeGreaterThan(0)
        expect(product[locale].cta.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("provides hub copy for both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const copy = insuranceHubCopy[locale]
      expect(copy.title.trim().length).toBeGreaterThan(0)
      expect(copy.intro.trim().length).toBeGreaterThan(0)
      expect(copy.activeLabel.trim().length).toBeGreaterThan(0)
      expect(copy.plannedLabel.trim().length).toBeGreaterThan(0)
      expect(copy.plannedNote.trim().length).toBeGreaterThan(0)
    }
  })

  it("uses the exact required advertising disclosure", () => {
    expect(affiliateDisclosure.bg).toBe(
      "Реклама / партньорски връзки. HORIZON by VZG може да получи възнаграждение, ако чрез партньорска връзка бъде сключен договор.",
    )
    expect(affiliateDisclosure.de).toBe(
      "Anzeige / Partnerlinks. HORIZON by VZG kann eine Vergütung erhalten, wenn über einen Partnerlink ein Vertrag abgeschlossen wird.",
    )
  })

  it("does not claim HORIZON is the insurer", () => {
    for (const locale of ["bg", "de"] as const) {
      const intro = insuranceHubCopy[locale].intro
      expect(intro).toMatch(locale === "bg" ? /не е застраховател/ : /ist kein Versicherer/)
    }
  })
})
