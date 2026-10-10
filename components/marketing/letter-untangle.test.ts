import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { letterHeroCopy, letterScenarioOrder, sampleLetters } from "./letter-scenarios"
import { PHASE_MS, nextPhase } from "./letter-untangle"

describe("hero letter scenarios", () => {
  it("opens with the tax document, then Jobcenter, then electricity", () => {
    expect(letterScenarioOrder).toEqual(["tax", "jobcenter", "energy"])
  })

  it("uses only fictional senders, people and places", () => {
    for (const id of letterScenarioOrder) {
      const letter = sampleLetters[id]
      expect(letter.recipient.join(" ")).toMatch(/Muster/)
      expect(`${letter.sender} ${letter.senderLine}`).toMatch(/Muster/)
      expect(JSON.stringify(letter)).toMatch(/12345 Musterstadt/)
    }
  })

  it("labels the visual as an example and explains every letter in both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const copy = letterHeroCopy[locale]
      expect(copy.sample.trim().length).toBeGreaterThan(0)
      for (const id of letterScenarioOrder) {
        const card = copy.explanations[id]
        for (const text of [card.what, card.deadline, card.action]) expect(text.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the card copy free of em and en dashes and exclamation marks", () => {
    for (const locale of ["bg", "de"] as const) {
      expect(JSON.stringify(letterHeroCopy[locale].explanations)).not.toMatch(/[—–!]/)
      expect(JSON.stringify(letterHeroCopy[locale].labels)).not.toMatch(/[—–!]/)
    }
  })

  it("states the tax benefit generally, never as a guaranteed amount", () => {
    expect(letterHeroCopy.bg.explanations.tax.action).toMatch(/Повечето хора/)
    expect(letterHeroCopy.de.explanations.tax.action).toMatch(/Die meisten/)
    for (const locale of ["bg", "de"] as const) expect(letterHeroCopy[locale].explanations.tax.action).not.toMatch(/\d|€|EUR/)
  })
})

describe("hero letter timing", () => {
  it("cycles letter, dissolve, explain, leave and back", () => {
    expect(nextPhase("letter")).toBe("dissolve")
    expect(nextPhase("dissolve")).toBe("explain")
    expect(nextPhase("explain")).toBe("leave")
    expect(nextPhase("leave")).toBe("letter")
  })

  it("keeps one full example under ten seconds", () => {
    const total = Object.values(PHASE_MS).reduce((sum, ms) => sum + ms, 0)
    expect(total).toBeLessThan(10000)
  })
})

describe("smoke layer", () => {
  const source = readFileSync(join(process.cwd(), "components/marketing/smoke-layer.tsx"), "utf8")
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

  it("takes its colour from the theme token and respects reduced motion", () => {
    expect(source).toContain("var(--thread-core)")
    expect(source).toContain("prefers-reduced-motion: reduce")
    expect(source).toContain("isKintexWorkspacePath(pathname)")
  })

  it("does not lose its WebGL context on effect cleanup", () => {
    expect(source).not.toMatch(/\.loseContext\(\)/)
  })

  it("sits behind the page and never catches clicks", () => {
    expect(css).toMatch(/\.smoke-layer \{[^}]*z-index: -20;[^}]*pointer-events: none;/)
  })
})
