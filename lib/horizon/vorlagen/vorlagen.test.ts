import { describe, expect, it } from "vitest"
import { formatGermanDate } from "@/lib/horizon/letters/format"
import { findGuideTopic, guideTopics } from "@/lib/ratgeber"
import { guideVorlageMap, vorlageGuideMap, vorlagen, vorlageCategories, vorlageForGuide, vorlagePath, findVorlage } from "@/lib/horizon/vorlagen"
import { VORLAGE_SLUGS } from "@/lib/horizon/vorlagen/slugs"
import { locales } from "@/lib/i18n/routing"

/**
 * The templates drive a page, a sitemap entry, a proxy slug check and the guide
 * cross-links at once, and they emit a document a user may sign and post. These
 * tests hold the invariants that make both true.
 */
describe("vorlagen corpus", () => {
  it("has a unique slug per template", () => {
    const slugs = vorlagen.map((template) => template.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("keeps the proxy's slug list identical to the templates", () => {
    expect([...VORLAGE_SLUGS].sort()).toEqual(vorlagen.map((template) => template.slug).sort())
    expect(new Set(VORLAGE_SLUGS).size).toBe(VORLAGE_SLUGS.length)
  })

  it("gives every template both locales with no empty section", () => {
    for (const template of vorlagen) {
      for (const locale of locales) {
        const content = template.content[locale]
        expect(content, `${template.slug}/${locale} is missing`).toBeDefined()
        expect(content.title.length, `${template.slug}/${locale} title`).toBeGreaterThan(10)
        expect(content.summary.length, `${template.slug}/${locale} summary`).toBeGreaterThan(60)
        expect(content.intro.length, `${template.slug}/${locale} intro`).toBeGreaterThan(120)
        expect(content.useWhen.length, `${template.slug}/${locale} useWhen`).toBeGreaterThan(1)
        expect(content.caveats.length, `${template.slug}/${locale} caveats`).toBeGreaterThan(1)
        expect(content.faq.length, `${template.slug}/${locale} faq`).toBeGreaterThan(1)
      }
    }
  })

  it("names a source for every template, so no claim is unsourced", () => {
    for (const template of vorlagen) {
      expect(template.sources.length, `${template.slug} has no source`).toBeGreaterThan(0)
      for (const source of template.sources) {
        expect(source.url, `${template.slug} source url`).toMatch(/^https:\/\//)
        expect(source.label.length, `${template.slug} source label`).toBeGreaterThan(3)
      }
    }
  })

  it("places every template in a declared category", () => {
    const ids = new Set(vorlageCategories.map((category) => category.id))
    for (const template of vorlagen) {
      expect(ids.has(template.category), `${template.slug} category ${template.category}`).toBe(true)
    }
  })

  it("resolves by slug and refuses an unknown one", () => {
    const first = vorlagen[0]
    expect(findVorlage(first.slug)).toBe(first)
    expect(findVorlage("definitely-not-a-template")).toBeUndefined()
  })

  it("builds the path the route and the sitemap both use", () => {
    expect(vorlagePath("mangelanzeige")).toBe("/vorlagen/mangelanzeige")
  })

  it("declares every field with a label in both locales", () => {
    for (const template of vorlagen) {
      expect(template.fields.length, `${template.slug} has no fields`).toBeGreaterThan(4)
      const keys = template.fields.map((field) => field.key)
      expect(new Set(keys).size, `${template.slug} has duplicate field keys`).toBe(keys.length)
      for (const field of template.fields) {
        expect(field.label.bg.length, `${template.slug}/${field.key} bg label`).toBeGreaterThan(1)
        expect(field.label.de.length, `${template.slug}/${field.key} de label`).toBeGreaterThan(1)
      }
    }
  })

  it("points every guide cross-link at a template and a topic that exist", () => {
    // Both ends are load-bearing: a missing template would render a dead link from
    // a guide page, and a stale guide slug would never be shown at all.
    for (const [guideSlug, vorlageSlug] of Object.entries(guideVorlageMap)) {
      expect(findGuideTopic(guideSlug), `guide ${guideSlug} does not exist`).toBeDefined()
      expect(findVorlage(vorlageSlug), `template ${vorlageSlug} does not exist`).toBeDefined()
    }
  })

  it("offers a letter from every guide page that maps to one", () => {
    const mapped = new Set(Object.keys(guideVorlageMap))
    for (const topic of guideTopics) {
      const template = vorlageForGuide(topic.slug)
      if (mapped.has(topic.slug)) {
        expect(template, `${topic.slug} maps but resolves to nothing`).toBeDefined()
      } else {
        expect(template, `${topic.slug} unexpectedly resolves`).toBeUndefined()
      }
    }
  })

  it("points every reverse guide link at a topic that exists", () => {
    // The reverse map is what makes the letter page a route into the explanation
    // rather than a dead end, so a stale slug here would be a broken link on a
    // published page rather than a silent miss.
    for (const [vorlageSlug, guideSlug] of Object.entries(vorlageGuideMap)) {
      expect(findVorlage(vorlageSlug), `template ${vorlageSlug} does not exist`).toBeDefined()
      expect(findGuideTopic(guideSlug), `guide ${guideSlug} does not exist`).toBeDefined()
    }
  })

  it("only reverses a link the guide also declares, so the pair stays mutual", () => {
    // A one-sided reverse link would send a reader from the letter to a guide that
    // does not offer the letter back, which is the dead end this map exists to close.
    for (const [vorlageSlug, guideSlug] of Object.entries(vorlageGuideMap)) {
      expect(guideVorlageMap[guideSlug], `${vorlageSlug} -> ${guideSlug} is not mutual`).toBe(vorlageSlug)
    }
  })

  it("formats a German date and refuses anything else", () => {
    expect(formatGermanDate("2026-03-31")).toBe("31.03.2026")
    expect(formatGermanDate("31.03.2026")).toBeNull()
    expect(formatGermanDate(null)).toBeNull()
  })
})
