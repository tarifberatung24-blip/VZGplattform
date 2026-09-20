import { describe, expect, it } from "vitest"
import { CASE_MODULES } from "../case/contract"
import { LEGACY_CASE_STATUSES } from "../case/lifecycle"
import {
  GUIDE_INTENTS,
  guideCasePath,
  guideIntentCaseTitle,
  guideIntentKey,
  guideIntentLegacyIntent,
  guideIntentModule,
  guideIntents,
  isGuideIntent,
  isKnownLegacyIntent,
} from "./intents"
import { getGuideCopy, guideModules } from "./copy"

const locales = ["bg", "de"] as const

describe("guide intents", () => {
  it("exposes exactly the five required task entries", () => {
    expect(GUIDE_INTENTS).toEqual([
      "understand_document",
      "reply_to_authority",
      "fill_official_form",
      "cancel_contract",
      "unsure",
    ])
    expect(guideIntents).toHaveLength(5)
  })

  it("rejects unknown intents rather than defaulting to one", () => {
    expect(isGuideIntent("understand_document")).toBe(true)
    expect(isGuideIntent("delete_everything")).toBe(false)
    expect(isGuideIntent(null)).toBe(false)
    expect(isGuideIntent(42)).toBe(false)
  })

  it("maps every intent to a real canonical module", () => {
    for (const definition of guideIntents) {
      expect(CASE_MODULES).toContain(definition.module)
    }
  })

  it("routes document understanding to unterlagen_erklaeren and cancellation to kuendigung", () => {
    expect(guideIntentModule.understand_document).toBe("unterlagen_erklaeren")
    expect(guideIntentModule.cancel_contract).toBe("kuendigung")
  })

  it("never guesses a department for a user who does not know", () => {
    // `unsure` must land on `general`; assigning a department would assert a
    // fact the user has not stated.
    expect(guideIntentModule.unsure).toBe("general")
    expect(guideIntentModule.reply_to_authority).toBe("general")
    expect(guideIntentModule.fill_official_form).toBe("general")
  })

  it("keeps every legacy intent inside the existing CHECK vocabulary", () => {
    // `cases.intent` has a CHECK constraint; a value outside it would fail the
    // insert at runtime instead of here.
    for (const definition of guideIntents) {
      expect(isKnownLegacyIntent(definition.legacyIntent)).toBe(true)
    }
    expect(isKnownLegacyIntent("nonsense")).toBe(false)
  })

  it("uses the lowercase legacy vocabulary, not invented constants", () => {
    for (const definition of guideIntents) {
      expect(definition.legacyIntent).toMatch(/^[a-z_]+$/)
      expect(guideIntentLegacyIntent[definition.intent]).toBe(definition.legacyIntent)
    }
  })

  it("assigns each intent a distinct legacy value so cases stay distinguishable", () => {
    const values = guideIntents.map((entry) => entry.legacyIntent)
    expect(new Set(values).size).toBe(values.length)
  })

  it("assigns each intent a distinct case title", () => {
    const titles = guideIntents.map((entry) => entry.caseTitle)
    expect(new Set(titles).size).toBe(titles.length)
    for (const title of titles) expect(title.length).toBeGreaterThan(0)
  })

  it("builds a localized case path", () => {
    expect(guideCasePath("bg", "abc")).toBe("/bg/guide/abc")
    expect(guideCasePath("de", "abc")).toBe("/de/guide/abc")
  })
})

describe("guide copy", () => {
  it("covers all five intents in both locales with non-empty text", () => {
    for (const locale of locales) {
      const copy = getGuideCopy(locale)
      for (const intent of GUIDE_INTENTS) {
        expect(copy.intents[intent].title.length).toBeGreaterThan(0)
        expect(copy.intents[intent].text.length).toBeGreaterThan(0)
        expect(guideIntentKey[intent]).toBeTruthy()
      }
    }
  })

  it("labels every module in both locales", () => {
    for (const locale of locales) {
      for (const caseModule of CASE_MODULES) {
        expect(guideModules[locale][caseModule]?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the canonical brand on active surfaces", () => {
    for (const locale of locales) {
      const copy = getGuideCopy(locale)
      expect(copy.brand).toBe("HORIZON by VZG")
      expect(copy.brandNote).toBe("VZG CONSULT")
    }
  })

  it("does not surface legacy branding on the guide", () => {
    for (const locale of locales) {
      const serialized = JSON.stringify(getGuideCopy(locale))
      expect(serialized).not.toContain("Kintex")
      expect(serialized).not.toContain("HAMMAL")
    }
  })

  it("falls back to Bulgarian for an unknown locale instead of throwing", () => {
    expect(getGuideCopy("fr" as "bg").brand).toBe("HORIZON by VZG")
  })
})

describe("guide intent vocabulary does not collide with the lifecycle", () => {
  it("keeps guide intents disjoint from legacy case statuses", () => {
    for (const intent of GUIDE_INTENTS) {
      expect(LEGACY_CASE_STATUSES as readonly string[]).not.toContain(intent)
    }
  })

  it("keeps case titles out of the status vocabulary", () => {
    for (const title of Object.values(guideIntentCaseTitle)) {
      expect(LEGACY_CASE_STATUSES as readonly string[]).not.toContain(title)
    }
  })
})
