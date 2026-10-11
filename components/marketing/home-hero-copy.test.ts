import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const messages = (locale: "bg" | "de") =>
  JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8")).home.hero
const source = readFileSync(join(process.cwd(), "components/marketing/animated-hero.tsx"), "utf8")

describe("home hero", () => {
  it("is only the trial badge, the headline and two buttons", () => {
    expect(source).toContain("<HorizonWordmark")
    expect(messages("bg").headline2).toBe("Твоят дигитален асистент в Германия")
    expect(source).not.toMatch(/<ol|<p /)
    expect(source.match(/<Link/g)).toHaveLength(3)
  })

  it("shows the 30-day trial line above the wordmark and links it to sign-up", () => {
    expect(messages("bg").trialBadge).toBe("Пробвай безплатно и без ангажимент за 30 дни")
    expect(messages("de").trialBadge).toBe("30 Tage kostenlos und unverbindlich testen")
    const badge = source.indexOf("t.home.hero.trialBadge")
    expect(badge).toBeGreaterThan(-1)
    expect(badge).toBeLessThan(source.indexOf("<h1"))
    expect(source.lastIndexOf('localizedPath("/auth/sign-up", locale)', badge)).toBeGreaterThan(-1)
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

describe("orbit map", () => {
  it("is hidden from the home page until its redesign is approved", () => {
    expect(source).not.toMatch(/Layer0Orbit/)
  })
})

describe("global footer", () => {
  const footer = readFileSync(join(process.cwd(), "components/layout/global-footer.tsx"), "utf8")

  it("stays minimal but keeps the legally required links", () => {
    for (const href of ["/impressum", "/datenschutz", "/agb", "/widerruf"]) expect(footer).toContain(`"${href}"`)
    expect(footer).not.toContain("VZG CONSULT")
  })
})
