import { describe, expect, it } from "vitest"
import { howItWorksCopy } from "./how-it-works-copy"
import { buildPathGeometry } from "./feature-path"


describe("how-it-works copy", () => {
  it("documents the same sixteen services in both locales", () => {
    const expected = [
      "guide",
      "document_explanation",
      "inkasso",
      "documents",
      "vorlagen",
      "agentur",
      "jobcenter",
      "termination",
      "tax",
      "entitlements",
      "kindergeld",
      "contracts",
      "cost_reduction",
      "insurance",
      "education",
      "forum",
    ]
    for (const locale of ["bg", "de"] as const) {
      expect(howItWorksCopy[locale].groups.flatMap((group) => group.services.map((service) => service.id))).toEqual(expected)
    }
  })

  it("gives every service a problem, exactly three steps, a result and a route", () => {
    for (const locale of ["bg", "de"] as const) {
      for (const service of howItWorksCopy[locale].groups.flatMap((group) => group.services)) {
        expect(service.problem.trim().length).toBeGreaterThan(0)
        expect(service.steps).toHaveLength(3)
        expect(service.steps.every((step) => step.trim().length > 0)).toBe(true)
        expect(service.result.trim().length).toBeGreaterThan(0)
        expect(service.cta.trim().length).toBeGreaterThan(0)
        expect(service.href).toMatch(/^\/[a-z0-9-]+$/)
      }
    }
  })

  it("provides a short label for progressive disclosure in both locales", () => {
    expect(howItWorksCopy.bg.detailsLabel).toBe("Как работи")
    expect(howItWorksCopy.de.detailsLabel).toBe("So funktioniert es")
  })

  it("keeps prose free of em and en dashes and exclamation marks (Humanizer)", () => {
    for (const locale of ["bg", "de"] as const) {
      expect(JSON.stringify(howItWorksCopy[locale])).not.toMatch(/[—–!]/)
    }
  })

  it("does not ship invented figures, ratings or guarantees", () => {
    for (const locale of ["bg", "de"] as const) {
      const text = JSON.stringify(howItWorksCopy[locale])
      expect(text).not.toMatch(/\d+\s?%|\d[.,]\d\s?\/\s?5|★|гарант|garantiert/i)
    }
  })

  it("keeps the no-replacement-for-advice notice", () => {
    expect(howItWorksCopy.bg.notice).toMatch(/Не заменя данъчна, правна или социална консултация/)
    expect(howItWorksCopy.de.notice).toMatch(/ersetzt keine Steuer-, Rechts- oder Sozialberatung/)
  })

  it("keeps regulated product limits explicit", () => {
    expect(howItWorksCopy.bg.notice).toMatch(/не е застраховател/)
    expect(howItWorksCopy.bg.notice).toMatch(/не обещава цена, спестяване или одобрение/)
    expect(howItWorksCopy.bg.notice).toMatch(/Партньорските връзки са означени/)
    expect(howItWorksCopy.de.notice).toMatch(/kein Versicherer/)
    expect(howItWorksCopy.de.notice).toMatch(/Partnerlinks sind gekennzeichnet/)
  })
})

describe("feature path geometry", () => {
  const geometry = buildPathGeometry({ width: 1200, height: 420 }, 4)

  it("starts and ends at the vertical middle with markers inside the row", () => {
    expect(geometry.start).toEqual({ x: 14, y: 210 })
    expect(geometry.end).toEqual({ x: 1186, y: 210 })
    expect(geometry.d.startsWith("M 14 210")).toBe(true)
    expect(geometry.d.endsWith("H 1186")).toBe(true)
  })

  it("alternates the stage markers over and under the cards", () => {
    expect(geometry.dots.map((dot) => dot.y)).toEqual([14, 406, 14, 406])
    const xs = geometry.dots.map((dot) => dot.x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })

  it("only moves forward from the start marker", () => {
    const firstH = Number(/^M \S+ \S+ H (\S+)/.exec(geometry.d)?.[1])
    expect(firstH).toBeGreaterThan(geometry.start.x)
  })

  it("never produces NaN for a narrow row", () => {
    expect(buildPathGeometry({ width: 200, height: 100 }, 4).d).not.toMatch(/NaN/)
  })
})
