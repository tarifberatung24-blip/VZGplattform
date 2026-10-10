import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const messages = (locale: "bg" | "de") =>
  JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8")).home.hero

describe("home hero copy", () => {
  it("has a headline, four numbered points and a closing line in both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const hero = messages(locale)
      expect(hero.headline1).toBe("HORIZON")
      for (const key of ["headline2", "point1", "point2", "point3", "point4", "subtitle"]) {
        expect(String(hero[key]).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the owner-approved wording of point 4", () => {
    expect(messages("bg").point4).toBe(
      "Провери, след индивидуален анализ на текущата ти ситуация, как да постигнеш финансовите си цели, с ясен план, който да следваш.",
    )
  })

  it("keeps hero prose free of em and en dashes and exclamation marks", () => {
    for (const locale of ["bg", "de"] as const) {
      expect(JSON.stringify(messages(locale))).not.toMatch(/[—–!]/)
    }
  })

  it("renders all four points from the dictionary", () => {
    const source = readFileSync(join(process.cwd(), "components/marketing/animated-hero.tsx"), "utf8")
    for (const key of ["point1", "point2", "point3", "point4"]) expect(source).toContain(`t.home.hero.${key}`)
  })
})

describe("home hero actions", () => {
  const source = readFileSync(join(process.cwd(), "components/marketing/animated-hero.tsx"), "utf8")

  it("puts login and how-it-works directly under the headline", () => {
    const h1End = source.indexOf("</h1>")
    const login = source.indexOf('localizedPath("/auth/login", locale)')
    const how = source.indexOf('localizedPath("/how-it-works", locale)')
    const points = source.indexOf("heroPoints.map")
    expect(h1End).toBeGreaterThan(0)
    expect(login).toBeGreaterThan(h1End)
    expect(how).toBeGreaterThan(login)
    expect(points).toBeGreaterThan(how)
  })

  it("labels the buttons from the dictionary in both locales", () => {
    expect(source).toContain("t.home.hero.loginCta")
    expect(source).toContain("t.home.hero.howCta")
    expect(messages("bg").loginCta).toBe("Вход")
    expect(messages("bg").howCta).toBe("Разбери как работи")
    expect(messages("de").loginCta.trim().length).toBeGreaterThan(0)
    expect(messages("de").howCta.trim().length).toBeGreaterThan(0)
  })
})
