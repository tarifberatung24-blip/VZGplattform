import { describe, expect, it } from "vitest"
import { cookieNoticeCopy } from "./cookie-notice-copy"
import {
  COOKIE_NOTICE_VERSION,
  LIVE_OPTIONAL_COOKIES,
  buildChoice,
  hasOptionalConsent,
  needsNotice,
  parseChoice,
} from "@/lib/cookies/consent"

describe("cookie notice copy", () => {
  it("has the same keys in both locales", () => {
    expect(Object.keys(cookieNoticeCopy.bg).sort()).toEqual(Object.keys(cookieNoticeCopy.de).sort())
  })

  it("keeps prose free of em and en dashes and exclamation marks (Humanizer)", () => {
    for (const locale of ["bg", "de"] as const) {
      expect(JSON.stringify(cookieNoticeCopy[locale])).not.toMatch(/[—–!]/)
    }
  })

  it("says only what the privacy policy says: necessary storage now, no analysis, consent later", () => {
    expect(cookieNoticeCopy.bg.intro).toMatch(/Към момента не използваме бисквитки за реклама или анализ/)
    expect(cookieNoticeCopy.de.intro).toMatch(/Aktuell setzen wir keine Cookies für Werbung oder Analyse ein/)
    expect(cookieNoticeCopy.bg.optionalBody).toMatch(/само с твоето съгласие/)
    expect(cookieNoticeCopy.de.optionalBody).toMatch(/nur mit deiner Einwilligung/)
  })
})

describe("cookie choice", () => {
  it("asks until the current version has been answered", () => {
    expect(needsNotice(null)).toBe(true)
    expect(needsNotice(buildChoice({}))).toBe(false)
    expect(needsNotice({ ...buildChoice({}), version: COOKIE_NOTICE_VERSION - 1 })).toBe(true)
  })

  it("parses a stored answer and rejects anything malformed", () => {
    const choice = buildChoice({ partner: true }, new Date("2026-10-12T10:00:00Z"))
    expect(parseChoice(JSON.stringify(choice))).toEqual(choice)
    for (const bad of [null, "", "nope", "[]", "{}", '{"version":"1"}', '{"version":1,"at":"x"}']) expect(parseChoice(bad)).toBeNull()
  })

  it("never assumes consent for an optional category", () => {
    expect(hasOptionalConsent(null, "partner")).toBe(false)
    expect(hasOptionalConsent(buildChoice({}), "partner")).toBe(false)
    expect(hasOptionalConsent(buildChoice({ partner: true }), "partner")).toBe(true)
    expect(hasOptionalConsent({ ...buildChoice({ partner: true }), version: COOKIE_NOTICE_VERSION + 1 }, "partner")).toBe(false)
  })

  it("lists no optional category while nothing is tracked", () => {
    expect(LIVE_OPTIONAL_COOKIES).toEqual([])
  })
})
