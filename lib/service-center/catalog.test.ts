import { describe, expect, it } from "vitest"
import { locales } from "@/lib/i18n/routing"
import { publicPageMeta } from "@/lib/seo/public-pages"
import {
  SERVICE_CENTER_PATH,
  filterServiceCenter,
  serviceAudiences,
  serviceCategories,
  serviceCenterCopy,
  serviceCenterEntries,
  servesAudience,
  type ServiceStatus,
} from "@/lib/service-center/catalog"

/**
 * The service center makes a promise about what HORIZON can do, so the tests hold
 * the promise rather than the markup: a roadmap item must be unreachable, a live
 * service must carry a route, and both locales must be complete. The page is the
 * public answer to "what does this product actually do", and the failure that
 * matters is advertising a capability that does not exist yet.
 */
describe("service center catalogue", () => {
  it("has a unique id per entry", () => {
    const ids = serviceCenterEntries.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("labels every entry and its capabilities in both locales", () => {
    for (const entry of serviceCenterEntries) {
      for (const locale of locales) {
        expect(entry.name[locale].length, `${entry.id}/${locale} name`).toBeGreaterThan(1)
        expect(entry.summary[locale].length, `${entry.id}/${locale} summary`).toBeGreaterThan(1)
        expect(entry.terms[locale].length, `${entry.id}/${locale} terms`).toBeGreaterThan(1)
        expect(entry.includes[locale].length, `${entry.id}/${locale} includes`).toBeGreaterThan(0)
      }
    }
  })

  it("only lets a service carry a destination when it is reachable", () => {
    for (const entry of serviceCenterEntries) {
      if (entry.status === "roadmap") {
        expect(entry.href, `${entry.id} is planned and must not be clickable`).toBeUndefined()
        continue
      }
      expect(entry.href, `${entry.id} is ${entry.status} and needs a route`).toBeTruthy()
      expect(entry.href?.startsWith("/"), `${entry.id} href`).toBe(true)
      expect(
        entry.href?.startsWith("/bg") || entry.href?.startsWith("/de"),
        `${entry.id} must not carry a locale`,
      ).toBe(false)
    }
  })

  it("points every destination at a route that exists in the app", () => {
    // The catalogue is a public index, so a typo here is a 404 on the page whose
    // whole job is to say where things are. The list is the set of real route
    // segments the entries are allowed to use.
    const knownRoutes = new Set([
      "/guide",
      "/learning-center",
      "/versicherungen",
      "/documents",
      "/dashboard",
      "/steuer",
      "/vertraege",
    ])
    for (const entry of serviceCenterEntries) {
      if (!entry.href) continue
      expect(knownRoutes.has(entry.href), `${entry.id} -> ${entry.href}`).toBe(true)
    }
  })

  it("marks the AI assistant as planned, never as active", () => {
    const assistant = serviceCenterEntries.find((entry) => entry.id === "ai-assistant")
    expect(assistant?.status).toBe("roadmap")
    expect(assistant?.href).toBeUndefined()
  })

  it("uses only declared audiences, categories and statuses", () => {
    for (const entry of serviceCenterEntries) {
      expect(serviceCategories).toContain(entry.category)
      expect(entry.audience.length, `${entry.id} needs an audience`).toBeGreaterThan(0)
      for (const audience of entry.audience) {
        expect(serviceAudiences).toContain(audience)
      }
      const statuses: ServiceStatus[] = ["available", "login", "partner", "roadmap"]
      expect(statuses).toContain(entry.status)
    }
  })
})

describe("service center filtering", () => {
  it("returns the whole catalogue for an empty query", () => {
    const all = filterServiceCenter({ locale: "bg" })
    expect(all.length).toBe(serviceCenterEntries.length)
  })

  it("filters by category", () => {
    const contracts = filterServiceCenter({ locale: "bg", category: "contracts" })
    expect(contracts.length).toBeGreaterThan(0)
    for (const entry of contracts) expect(entry.category).toBe("contracts")
  })

  it("filters by audience without leaking unreleased business work", () => {
    const business = filterServiceCenter({ locale: "de", audience: "business" })
    expect(business.length).toBeGreaterThan(0)
    for (const entry of business) expect(entry.audience).toContain("business")
    // The assistant is a personal-only roadmap item, so a business reader must not
    // see it; the filter has to narrow, not just reorder.
    expect(business.some((entry) => entry.id === "ai-assistant")).toBe(false)
  })

  it("matches the query against the selected locale only", () => {
    const german = filterServiceCenter({ locale: "de", query: "Vertrag" })
    expect(german.length).toBeGreaterThan(0)
    for (const entry of german) {
      const haystack = `${entry.name.de} ${entry.summary.de} ${entry.terms.de}`.toLocaleLowerCase("de")
      expect(haystack).toContain("vertrag")
    }
  })

  it("finds a service by a synonym the catalogue does not use as a title", () => {
    const found = filterServiceCenter({ locale: "de", query: "Kündigung" })
    expect(found.some((entry) => entry.id === "cancellation")).toBe(true)
  })

  it("returns nothing for a query that matches no service", () => {
    expect(filterServiceCenter({ locale: "bg", query: "zzzz-no-such-service" })).toHaveLength(0)
  })

  it("combines audience, category and query as an intersection", () => {
    const result = filterServiceCenter({ locale: "de", audience: "personal", category: "contracts", query: "vertrag" })
    for (const entry of result) {
      expect(entry.audience).toContain("personal")
      expect(entry.category).toBe("contracts")
    }
  })

  it("treats 'all' as no narrowing for audience", () => {
    const all = filterServiceCenter({ locale: "bg", audience: "all" })
    expect(all.length).toBe(serviceCenterEntries.length)
  })
})

describe("servesAudience", () => {
  it("accepts every entry for the all audience", () => {
    for (const entry of serviceCenterEntries) expect(servesAudience(entry, "all")).toBe(true)
  })

  it("narrows to the entry's own audiences otherwise", () => {
    const assistant = serviceCenterEntries.find((entry) => entry.id === "ai-assistant")!
    expect(servesAudience(assistant, "personal")).toBe(true)
    expect(servesAudience(assistant, "business")).toBe(false)
  })
})

describe("service center copy and metadata", () => {
  it("writes every page string in both locales", () => {
    for (const locale of locales) {
      const copy = serviceCenterCopy[locale]
      expect(copy.title.length).toBeGreaterThan(1)
      expect(copy.intro.length).toBeGreaterThan(1)
      expect(copy.process.length).toBeGreaterThan(0)
      expect(copy.limits.length).toBeGreaterThan(0)
      for (const status of ["available", "login", "partner", "roadmap"] as const) {
        expect(copy.status[status].length).toBeGreaterThan(1)
        expect(copy.statusHint[status].length).toBeGreaterThan(1)
      }
    }
  })

  it("states the limits the product must not cross", () => {
    const bg = serviceCenterCopy.bg.limits.join(" ")
    expect(bg).toMatch(/ELSTER/)
    expect(bg).toMatch(/автоматично/)
    const de = serviceCenterCopy.de.limits.join(" ")
    expect(de).toMatch(/ELSTER/)
    expect(de).toMatch(/automatisch/)
  })

  it("does not advertise the assistant as active", () => {
    const assistant = serviceCenterEntries.find((entry) => entry.id === "ai-assistant")!
    // The summary must say plainly that it is not yet active, in the reader's own
    // language. A vague roadmap label would let the page imply the assistant works.
    expect(assistant.summary.bg).toMatch(/не е активен/)
    expect(assistant.summary.de).toMatch(/nicht aktiv/)
  })

  it("publishes localized SEO metadata for the service center path", () => {
    // The catch-all keys this table by the slug joined with "/", so the key has no
    // leading slash — the same shape every other entry in the table uses.
    const meta = publicPageMeta[SERVICE_CENTER_PATH.slice(1)]
    expect(meta, "publicPageMeta must carry the service-center entry").toBeDefined()
    for (const locale of locales) {
      expect(meta.title[locale].length).toBeGreaterThan(1)
      expect(meta.description[locale].length).toBeGreaterThan(1)
    }
    // The title must differ per locale, otherwise one language ships the other's page.
    expect(meta.title.bg).not.toBe(meta.title.de)
  })

  it("uses the path the route, the proxy allowlist and the sitemap all expect", () => {
    expect(SERVICE_CENTER_PATH).toBe("/service-center")
  })
})
