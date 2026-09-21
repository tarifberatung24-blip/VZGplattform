import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The active catalogs are the source of every string a user sees. Legacy product
 * branding survived migration in a handful of values, so this pins the active
 * brand and refuses the retired names. It reads the shipped JSON rather than a
 * module, because the defect is in the catalogs themselves.
 */
const readCatalog = (locale: "de" | "bg") =>
  readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")

const locales = ["de", "bg"] as const

describe("active catalog branding", () => {
  it("uses the canonical brand, not a retired one", () => {
    for (const locale of locales) {
      const catalog = readCatalog(locale)

      expect(catalog).toContain("HORIZON by VZG")
      expect(catalog).not.toContain("HAMMAL")
      expect(catalog).not.toContain("KintexBG")
      expect(catalog).not.toContain("Kintex Radar")
    }
  })

  it("brands the brand node itself", () => {
    for (const locale of locales) {
      const brand = JSON.parse(readCatalog(locale)).brand
      expect(brand.name).toBe("HORIZON by VZG")
      expect(brand.tagline.length).toBeGreaterThan(0)
    }
  })
})
