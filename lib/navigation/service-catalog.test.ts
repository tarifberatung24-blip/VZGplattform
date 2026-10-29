import { describe, expect, it } from "vitest"
import { filterServiceCatalog, serviceCatalog } from "@/lib/navigation/service-catalog"
import { locales } from "@/lib/i18n/routing"

/**
 * The catalog drives three finders at once — the header search, the dashboard
 * quick entries and the AI search's platform result — so a broken entry is a dead
 * link on more than one surface. These tests hold the properties that keep the
 * three in agreement: unique ids, a real path, and both locales present.
 */
describe("service catalog", () => {
  it("has a unique id and a rooted path per entry", () => {
    const ids = serviceCatalog.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of serviceCatalog) {
      expect(entry.href.startsWith("/"), `${entry.id} href`).toBe(true)
      expect(entry.href.startsWith("/bg") || entry.href.startsWith("/de"), `${entry.id} must not carry a locale`).toBe(false)
    }
  })

  it("labels every entry in every locale", () => {
    for (const entry of serviceCatalog) {
      for (const locale of locales) {
        expect(entry.title[locale].length, `${entry.id}/${locale} title`).toBeGreaterThan(1)
        expect(entry.detail[locale].length, `${entry.id}/${locale} detail`).toBeGreaterThan(1)
        expect(entry.terms[locale].length, `${entry.id}/${locale} terms`).toBeGreaterThan(1)
      }
    }
  })

  it("returns the whole catalog for an empty query", () => {
    expect(filterServiceCatalog("", "bg")).toHaveLength(serviceCatalog.length)
    expect(filterServiceCatalog("   ", "de")).toHaveLength(serviceCatalog.length)
  })

  it("matches on title, detail and hidden terms", () => {
    const byTitle = filterServiceCatalog("Готови писма", "bg").map((entry) => entry.id)
    expect(byTitle).toContain("vorlagen")

    const byTerm = filterServiceCatalog("mahnbescheid", "bg").map((entry) => entry.id)
    expect(byTerm).toContain("inkasso")

    const byDetail = filterServiceCatalog("Fristen", "de").map((entry) => entry.id)
    expect(byDetail).toContain("contracts")
  })

  it("is case-insensitive and returns nothing for a miss", () => {
    expect(filterServiceCatalog("SCHUFA", "bg").map((entry) => entry.id)).toContain("schufa")
    expect(filterServiceCatalog("zzzzz-nothing", "de")).toHaveLength(0)
  })

  it("exposes the new services the dashboard and search rely on", () => {
    const ids = new Set(serviceCatalog.map((entry) => entry.id))
    for (const id of ["vorlagen", "ratgeber", "schufa"]) {
      expect(ids.has(id), `${id} must be in the catalog`).toBe(true)
    }
  })
})
