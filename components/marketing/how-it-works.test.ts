import { describe, expect, it } from "vitest"
import { howItWorksCopy } from "./how-it-works-copy"
import { buildPathGeometry } from "./feature-path"


describe("how-it-works copy", () => {
  it("has the same four stages in both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      expect(howItWorksCopy[locale].stages.map((stage) => stage.id)).toEqual(["understand", "manage", "analyze", "plan"])
    }
  })

  it("keeps the owner's wording on the plan stage and marks it as not yet available", () => {
    expect(howItWorksCopy.bg.stages[3].body).toBe(
      "Провери, след индивидуален анализ на текущата ти ситуация, как да постигнеш финансовите си цели, с ясен план, който да следваш.",
    )
    for (const locale of ["bg", "de"] as const) {
      const plan = howItWorksCopy[locale].stages[3]
      expect(plan.soon?.trim().length).toBeGreaterThan(0)
      for (const stage of howItWorksCopy[locale].stages.slice(0, 3)) expect(stage.soon).toBeUndefined()
    }
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
