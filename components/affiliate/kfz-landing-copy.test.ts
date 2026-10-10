import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { kfzLandingCopy } from "./insurance-content"

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8")

describe("Kfz landing copy", () => {
  it("provides complete copy for both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const copy = kfzLandingCopy[locale]
      expect(copy.hero.titleLead.trim().length).toBeGreaterThan(0)
      expect(copy.hero.titleAccent.trim().length).toBeGreaterThan(0)
      expect(copy.hero.lead.trim().length).toBeGreaterThan(0)
      expect(copy.hero.bullets.length).toBeGreaterThan(0)
      expect(copy.tiles).toHaveLength(4)
      for (const tile of copy.tiles) {
        expect(tile.title.trim().length).toBeGreaterThan(0)
        expect(tile.body.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("carries the approved slogan and the Bulgarian-first framing", () => {
    expect(kfzLandingCopy.bg.hero.lead).toContain("Ясни условия. Честни цени. Бързо сключване.")
    expect(kfzLandingCopy.bg.hero.titleAccent).toBe("обяснена на български")
  })
})

describe("Kfz landing anti-fabrication", () => {
  const sources = [
    "components/affiliate/kfz-landing.tsx",
    "components/affiliate/kfz-hero-visual.tsx",
    "components/affiliate/insurance-content.ts",
  ]

  it("does not ship the retired FinanzBG codename", () => {
    for (const source of sources) expect(read(source)).not.toMatch(/finanzbg/i)
  })

  it("invents no customer counts, ratings or review figures", () => {
    for (const source of sources) {
      const body = read(source)
      expect(body).not.toMatch(/50\s?000\s?\+/)
      expect(body).not.toMatch(/100\s?000\s?\+/)
      expect(body).not.toMatch(/\b4[.,]9\b/)
      expect(body).not.toMatch(/google/i)
    }
  })

  it("promises no guaranteed saving or guaranteed acceptance", () => {
    for (const locale of ["bg", "de"] as const) {
      const blob = JSON.stringify(kfzLandingCopy[locale]).toLowerCase()
      expect(blob).not.toContain("гарантирана")
      expect(blob).not.toContain("garantiert")
    }
  })
})
