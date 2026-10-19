import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { envelopeCopy, letterCaseOrder, sampleLetters, type LetterRows } from "./letter-scenarios"
import { isFirstStep, isLastStep, stepAfter, stepBefore, type Step } from "./letter-envelope"

const parse = (value: string) => Number(value.replace(/[^\d,]/g, "").replace(",", "."))

describe("hero envelope cases", () => {
  it("covers Inkasso, electricity, a complex Jobcenter case and tax, in that order", () => {
    expect(letterCaseOrder).toEqual(["inkasso", "energy", "jobcenter", "tax"])
  })

  it("uses only fictional senders, people and places", () => {
    for (const id of letterCaseOrder) {
      const letter = sampleLetters[id]
      expect(letter.recipient.join(" ")).toMatch(/Muster/)
      expect(`${letter.sender} ${letter.senderLine}`).toMatch(/Muster/)
      expect(JSON.stringify(letter)).toMatch(/12345 Musterstadt/)
    }
  })

  it("adds up every amount table in the letters", () => {
    for (const id of ["inkasso", "jobcenter"] as const) {
      const table = sampleLetters[id].body.find((block): block is LetterRows => typeof block !== "string")
      const sum = table!.rows.reduce((total, [, amount]) => total + parse(amount), 0)
      expect(sum.toFixed(2)).toBe(parse(table!.total![1]).toFixed(2))
    }
  })

  it("derives the electricity savings from the prices in the letter", () => {
    const kwh = 2800
    const newCost = kwh * 0.398 + 12 * 13.9
    const otherCost = 987.2
    expect(newCost.toFixed(2)).toBe("1281.20")
    expect((newCost - otherCost).toFixed(2)).toBe("294.00")
    expect(Math.round((39.8 / 32.4 - 1) * 100)).toBe(23)
    for (const locale of ["bg", "de"] as const) {
      const saving = envelopeCopy[locale].cases.energy.figures[2]
      expect(saving.countTo).toBe(294)
      expect(saving.tone).toBe("good")
    }
  })

  it("labels both sides as an example and fills every case in both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const copy = envelopeCopy[locale]
      expect(copy.sample.trim().length).toBeGreaterThan(0)
      for (const id of letterCaseOrder) {
        const item = copy.cases[id]
        expect(copy.caseNames[id].trim().length).toBeGreaterThan(0)
        for (const text of [item.tag, item.title, item.summary, item.action, ...item.steps]) expect(text.trim().length).toBeGreaterThan(0)
        expect(item.figures).toHaveLength(3)
      }
    }
  })

  it("keeps the dashboard copy free of em and en dashes and exclamation marks", () => {
    for (const locale of ["bg", "de"] as const) {
      const { cases, caseNames, eyebrow, open, before, after, toAfter, upload, next, hint } = envelopeCopy[locale]
      expect(JSON.stringify({ cases, caseNames, eyebrow, open, before, after, toAfter, upload, next, hint })).not.toMatch(/[—–!]/)
    }
  })

  it("uses the owner-approved Bulgarian explanation in the active demo", () => {
    expect(envelopeCopy.bg.eyebrow).toBe("Кликни върху писмото и разбери как работи системата ни")
    expect(envelopeCopy.bg.before).toBe("Ти получаваш в този вид писмено известие")
    expect(envelopeCopy.bg.after).toBe("Ето какво ще покаже клиентското ти табло HORIZON")
    expect(envelopeCopy.bg.upload).toBe("Качи писмото в HORIZON")
  })

  it("marks the partner offer as a partner offer and keeps the tax benefit general", () => {
    expect(envelopeCopy.bg.cases.energy.note).toMatch(/Партньорска оферта/)
    expect(envelopeCopy.de.cases.energy.note).toMatch(/Partnerangebot/)
    expect(envelopeCopy.bg.cases.tax.summary).toMatch(/Повечето хора/)
    expect(envelopeCopy.de.cases.tax.summary).toMatch(/Die meisten/)
  })
})

describe("hero envelope steps", () => {
  const count = letterCaseOrder.length
  const first: Step = { caseIndex: 0, side: "front" }

  it("goes from before to after, then to the next case, and wraps round", () => {
    expect(stepAfter(first, count)).toEqual({ caseIndex: 0, side: "back" })
    expect(stepAfter({ caseIndex: 0, side: "back" }, count)).toEqual({ caseIndex: 1, side: "front" })
    expect(stepAfter({ caseIndex: count - 1, side: "back" }, count)).toEqual(first)
  })

  it("walks back the same way", () => {
    expect(stepBefore({ caseIndex: 1, side: "front" }, count)).toEqual({ caseIndex: 0, side: "back" })
    expect(stepBefore(first, count)).toEqual({ caseIndex: count - 1, side: "back" })
  })

  it("lets the page scroll again at both ends", () => {
    expect(isFirstStep(first)).toBe(true)
    expect(isLastStep({ caseIndex: count - 1, side: "back" }, count)).toBe(true)
    expect(isLastStep(first, count)).toBe(false)
  })

  it("never closes the envelope again without a page reload", () => {
    const source = readFileSync(join(process.cwd(), "components/marketing/letter-envelope.tsx"), "utf8")
    expect(source).not.toMatch(/setStage\("closed"\)/)
  })

  it("uses the upload label to open the illustrative letter, without navigating away", () => {
    const source = readFileSync(join(process.cwd(), "components/marketing/letter-envelope.tsx"), "utf8")
    expect(source).toContain('<span>{copy.upload}</span>')
    expect(source).toContain('className="env-cta env-closed-cta"')
    expect(source).toContain('onClick={open}')
    expect(source).toContain('<span>{copy.toAfter}</span>')
    expect(source).not.toContain('localizedPath("/guide", locale)')
    expect(source).not.toContain('href=')
  })

  it("keeps explanatory headings neutral and reserves blue for controls", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
    expect(css).toMatch(/\.env-label \{[^}]*color: var\(--foreground\);/)
    expect(css).toMatch(/\.env-closed-eyebrow \{[^}]*color: var\(--foreground\);/)
    expect(css).not.toMatch(/\.env-label\[data-side="back"\] \{ color: var\(--thread-core\); \}/)
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
