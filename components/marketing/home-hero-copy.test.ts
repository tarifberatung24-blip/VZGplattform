import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const messages = (locale: "bg" | "de") =>
  JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8")).home.hero
const source = readFileSync(join(process.cwd(), "components/marketing/animated-hero.tsx"), "utf8")

describe("home hero", () => {
  it("is only the headline and two buttons", () => {
    expect(messages("bg").headline1).toBe("HORIZON")
    expect(messages("bg").headline2).toBe("Твоят дигитален асистент в Германия")
    expect(source).not.toMatch(/<ol|<p /)
    expect(source.match(/<Link/g)).toHaveLength(2)
  })

  it("puts login first and how-it-works second, directly under the headline", () => {
    const h1End = source.indexOf("</h1>")
    const login = source.indexOf('localizedPath("/auth/login", locale)')
    const how = source.indexOf('localizedPath("/how-it-works", locale)')
    expect(login).toBeGreaterThan(h1End)
    expect(how).toBeGreaterThan(login)
    expect(messages("bg").loginCta).toBe("Вход")
    expect(messages("bg").howCta).toBe("Разбери как работи")
  })

  it("has the same hero keys in both locales and no dashes or exclamation marks", () => {
    expect(Object.keys(messages("de")).sort()).toEqual(Object.keys(messages("bg")).sort())
    for (const locale of ["bg", "de"] as const) expect(JSON.stringify(messages(locale))).not.toMatch(/[—–!]/)
  })
})

describe("global footer", () => {
  const footer = readFileSync(join(process.cwd(), "components/layout/global-footer.tsx"), "utf8")

  it("stays minimal but keeps the legally required links", () => {
    for (const href of ["/impressum", "/datenschutz", "/agb", "/widerruf"]) expect(footer).toContain(`"${href}"`)
    expect(footer).not.toContain("VZG CONSULT")
  })
})
