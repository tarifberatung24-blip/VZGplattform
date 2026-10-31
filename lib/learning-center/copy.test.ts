import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { learningCenterCopy, LEARNING_CENTER_PATH, LEARNING_PATH_ANCHORS } from "./copy"
import { learningCenterRedirects, learningCenterRedirectTarget } from "@/lib/navigation/learning-center-redirects"
import { locales } from "@/lib/i18n/routing"

/**
 * The Learning Center is one page assembled from three existing corpora plus a
 * Coming Soon path. These tests hold the properties that keep it honest: the four
 * paths are numbered in reading order, every locale is complete, and the redirects
 * point at a path that exists rather than at a section that does not.
 */
describe("learning center copy", () => {
  it("numbers the four paths in reading order with matching anchors", () => {
    for (const locale of locales) {
      const paths = learningCenterCopy[locale].paths
      expect(paths.map((path) => path.number)).toEqual(["01", "02", "03", "04"])
      expect(paths.map((path) => path.anchor)).toEqual(["functions", "guides", "letters", "dashboard"])
      expect(paths.map((path) => path.id)).toEqual(["functions", "guides", "letters", "dashboard"])
      for (const path of paths) {
        expect(path.title.trim().length, `${locale}/${path.id} title`).toBeGreaterThan(2)
        expect(path.tagline.trim().length, `${locale}/${path.id} tagline`).toBeGreaterThan(2)
        expect(path.start.trim().length, `${locale}/${path.id} start`).toBeGreaterThan(10)
      }
    }
  })

  it("exposes every anchor through the anchor map, so the redirects cannot drift", () => {
    for (const locale of locales) {
      for (const path of learningCenterCopy[locale].paths) {
        expect(LEARNING_PATH_ANCHORS[path.id]).toBe(path.anchor)
      }
    }
  })

  it("gives both locales the same keys and no empty string", () => {
    for (const locale of locales) {
      const copy = learningCenterCopy[locale]
      for (const [key, value] of Object.entries(copy)) {
        if (Array.isArray(value)) continue
        expect(typeof value, `${locale}.${key}`).toBe("string")
        expect((value as string).trim().length, `${locale}.${key}`).toBeGreaterThan(0)
      }
      expect(copy.howToUse).toHaveLength(3)
      expect(copy.dashboardLessons.length).toBeGreaterThan(3)
    }
    expect(Object.keys(learningCenterCopy.de).sort()).toEqual(Object.keys(learningCenterCopy.bg).sort())
  })

  it("labels the dashboard path as coming soon and never promises a live feature", () => {
    for (const locale of locales) {
      const copy = learningCenterCopy[locale]
      expect(copy.comingSoonLabel.trim().length).toBeGreaterThan(0)
      expect(copy.dashboardPending.trim().length).toBeGreaterThan(20)
      // The Coming Soon path must not claim persistence or a finished feature.
      expect(JSON.stringify(copy.dashboardLessons)).not.toMatch(/запазва се|gespeichert|persistiert/i)
    }
  })

  it("keeps the regulated no-replacement notice in both locales", () => {
    expect(learningCenterCopy.bg.notice).toMatch(/Не заменя данъчна, правна или социална консултация/)
    expect(learningCenterCopy.bg.notice).toMatch(/не е застраховател/)
    expect(learningCenterCopy.de.notice).toMatch(/ersetzt keine Steuer-, Rechts- oder Sozialberatung/)
    expect(learningCenterCopy.de.notice).toMatch(/kein Versicherer/)
  })

  it("keeps prose free of em and en dashes and exclamation marks (Humanizer)", () => {
    for (const locale of locales) {
      expect(JSON.stringify(learningCenterCopy[locale])).not.toMatch(/[—–!]/)
    }
  })
})

describe("learning center redirects", () => {
  it("forwards each replaced index route to its numbered path", () => {
    expect(learningCenterRedirectTarget("/how-it-works")).toEqual({ path: LEARNING_CENTER_PATH, hash: "functions" })
    expect(learningCenterRedirectTarget("/bg/ratgeber")).toEqual({ path: LEARNING_CENTER_PATH, hash: "guides" })
    expect(learningCenterRedirectTarget("/de/vorlagen")).toEqual({ path: LEARNING_CENTER_PATH, hash: "letters" })
  })

  it("leaves every detail route and the learning center itself alone", () => {
    for (const path of ["/ratgeber/jobcenter", "/vorlagen/widerspruch", "/learning-center", "/", "/contact"]) {
      expect(learningCenterRedirectTarget(path), path).toBeNull()
    }
  })

  it("points every redirect at the learning center page that exists", () => {
    const page = path.join(process.cwd(), "app/[locale]/learning-center/page.tsx")
    expect(existsSync(page)).toBe(true)
    for (const target of Object.values(learningCenterRedirects)) {
      expect(target.path).toBe(LEARNING_CENTER_PATH)
      expect(Object.values(LEARNING_PATH_ANCHORS)).toContain(target.hash)
    }
  })

  it("does not link the learning center back to a route that redirects to it", () => {
    // A `relatedLink` or a hard-coded old index path would point a crawler at a URL
    // that 308s to this very page. The page has its own canonical, so the reference is
    // redundant at best and a self-referencing redirect at worst. Only quoted path
    // literals are checked: the module specifiers `@/lib/ratgeber` and
    // `@/lib/horizon/vorlagen` legitimately contain the same words.
    const source = readFileSync(path.join(process.cwd(), "app/[locale]/learning-center/page.tsx"), "utf8")
    for (const oldIndex of Object.keys(learningCenterRedirects)) {
      expect(source, `${oldIndex} must not be linked from the learning center`).not.toContain(`"${oldIndex}"`)
    }
    // No detail page to relate to: the four paths are sections of this page, so
    // `relatedLink` would only ever name a section or a redirect.
    expect(source).not.toContain("relatedPaths")
    expect(source).not.toContain("GUIDE_INDEX_PATH")
    expect(source).not.toContain("VORLAGE_INDEX_PATH")
  })
})
