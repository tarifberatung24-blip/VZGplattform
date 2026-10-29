import { describe, expect, it } from "vitest"
import { pathAliases } from "@/lib/navigation/path-aliases"
import { guideCategories, guidePath, guideTopics, findGuideTopic } from "@/lib/ratgeber"
import { GUIDE_SLUGS } from "@/lib/ratgeber/slugs"
import { findVorlage } from "@/lib/horizon/vorlagen"
import { locales } from "@/lib/i18n/routing"

/**
 * The guide corpus drives the routes, the sitemap and the synonym map at once, so a
 * single malformed entry would produce a dead link in several places. These tests
 * hold the invariants that make the corpus safe to grow.
 */
describe("guide corpus", () => {
  it("has a unique slug per topic", () => {
    const slugs = guideTopics.map((topic) => topic.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("gives every topic both locales, with no empty section", () => {
    for (const topic of guideTopics) {
      for (const locale of locales) {
        const content = topic.content[locale]
        expect(content, `${topic.slug}/${locale} is missing`).toBeDefined()
        expect(content.title.length, `${topic.slug}/${locale} title`).toBeGreaterThan(10)
        expect(content.summary.length, `${topic.slug}/${locale} summary`).toBeGreaterThan(60)
        expect(content.intro.length, `${topic.slug}/${locale} intro`).toBeGreaterThan(120)
        expect(content.scope.length, `${topic.slug}/${locale} scope`).toBeGreaterThan(1)
        expect(content.steps.length, `${topic.slug}/${locale} steps`).toBeGreaterThan(2)
        expect(content.documents.length, `${topic.slug}/${locale} documents`).toBeGreaterThan(1)
        expect(content.pitfalls.length, `${topic.slug}/${locale} pitfalls`).toBeGreaterThan(1)
        expect(content.faq.length, `${topic.slug}/${locale} faq`).toBeGreaterThan(1)
      }
    }
  })

  it("names a source for every topic, so no claim is unsourced", () => {
    for (const topic of guideTopics) {
      expect(topic.sources.length, `${topic.slug} has no source`).toBeGreaterThan(0)
      for (const source of topic.sources) {
        expect(source.url, `${topic.slug} source url`).toMatch(/^https:\/\//)
        expect(source.label.length, `${topic.slug} source label`).toBeGreaterThan(3)
      }
    }
  })

  it("places every topic in a declared category", () => {
    const ids = new Set(guideCategories.map((category) => category.id))
    for (const topic of guideTopics) {
      expect(ids.has(topic.category), `${topic.slug} category ${topic.category}`).toBe(true)
    }
  })

  it("resolves by slug and refuses an unknown one", () => {
    const first = guideTopics[0]
    expect(findGuideTopic(first.slug)).toBe(first)
    expect(findGuideTopic("definitely-not-a-topic")).toBeUndefined()
  })

  it("builds the path the routes and the sitemap both use", () => {
    expect(guidePath("jobcenter")).toBe("/ratgeber/jobcenter")
  })

  it("keeps the proxy's slug list identical to the corpus", () => {
    // The proxy rejects an unknown slug before the page renders, because the page's
    // own `notFound()` cannot change the status once the layout has started
    // streaming. That makes this list load-bearing: a topic missing from it would
    // 404 a published page, and a stale entry would keep a removed page alive.
    expect([...GUIDE_SLUGS].sort()).toEqual(guideTopics.map((topic) => topic.slug).sort())
    expect(new Set(GUIDE_SLUGS).size).toBe(GUIDE_SLUGS.length)
  })

  it("points every alias at a path that exists", () => {
    // The alias targets are either a known static route or a real guide topic or a
    // real letter. A target that is none of these would redirect the reader to a 404.
    const staticTargets = new Set([
      "/contact",
      "/documents",
      "/finanzbildung",
      "/kindergeld",
      "/ratgeber",
      "/steuer",
      "/versicherungen",
      "/vorlagen",
    ])
    for (const [from, to] of Object.entries(pathAliases)) {
      const isGuide = to.startsWith("/ratgeber/") && findGuideTopic(to.slice("/ratgeber/".length)) !== undefined
      const isVorlage = to.startsWith("/vorlagen/") && findVorlage(to.slice("/vorlagen/".length)) !== undefined
      expect(staticTargets.has(to) || isGuide || isVorlage, `${from} -> ${to} does not exist`).toBe(true)
    }
  })
})
