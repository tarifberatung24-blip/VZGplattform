import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  buildSchufaPlan,
  countByCategory,
  parseSchufaText,
  SCHUFA_CATEGORIES,
  SCHUFA_CATEGORY_LABEL,
  SCHUFA_PACK_VERSION,
} from "./plan"
import { locales } from "@/lib/i18n/routing"

const sample = `
SCHUFA Holding AG
Datenkopie nach Art. 15 DSGVO

Personendaten
Name: Ivan Petrov
Geburtsdatum: 01.02.1990

Anschriften
Hauptstraße 1, 10115 Berlin

Konten und Kredite
Ratenkredit bei Musterbank, 5000 EUR, laufend

Negativmerkmale
Forderung Muster Inkasso GmbH, 480 EUR, Mahnverfahren eröffnet

Anfragen
Konditionsanfrage Musterbank, 01.05.2026
`

/**
 * The parser decides what the plan is about, so these tests hold the two rules
 * that keep the plan honest: it never invents an entry that is not in the text,
 * and it never claims a score. The plan is deterministic, so the same document
 * must produce the same steps on every run.
 */
describe("SCHUFA parser", () => {
  it("groups lines under their section", () => {
    const parsed = parseSchufaText(sample)
    expect(parsed.empty).toBe(false)
    const negatives = parsed.entries.filter((entry) => entry.category === "negative")
    expect(negatives.map((entry) => entry.text).join(" ")).toContain("Muster Inkasso")
    expect(parsed.entries.some((entry) => entry.category === "accounts")).toBe(true)
    expect(parsed.entries.some((entry) => entry.category === "inquiries")).toBe(true)
  })

  it("reports an empty document rather than guessing entries", () => {
    const parsed = parseSchufaText("Dies ist nur ein Begleitbrief ohne Einträge.")
    expect(parsed.empty).toBe(true)
    expect(parsed.entries).toHaveLength(0)
    const plan = buildSchufaPlan(parsed)
    expect(plan.actions).toHaveLength(0)
    expect(plan.empty).toBe(true)
  })

  it("flags a category heading it saw but could not read", () => {
    const parsed = parseSchufaText("Negativmerkmale")
    expect(parsed.unreadable).toContain("negative")
  })

  it("recovers the sections from text whose whitespace was collapsed", () => {
    // `extractPdfText` collapses all whitespace, so a real data copy reaches the
    // parser as one line. Segmenting on the section titles is what keeps the whole
    // document from landing in a single category.
    const collapsed = sample.replace(/\s+/g, " ").trim()
    expect(collapsed).not.toContain("\n")
    const parsed = parseSchufaText(collapsed)
    const categories = new Set(parsed.entries.map((entry) => entry.category))
    for (const category of ["personal", "address", "accounts", "negative", "inquiries"]) {
      expect(categories.has(category as never), `${category} lost in collapsed text`).toBe(true)
    }
    const plan = buildSchufaPlan(parsed)
    expect(plan.actions.map((action) => action.category)).toContain("negative")
  })

  it("keeps every negative entry in a collapsed document", () => {
    const collapsed = sample.replace(/\s+/g, " ").trim()
    const parsed = parseSchufaText(collapsed)
    const negatives = parsed.entries.filter((entry) => entry.category === "negative")
    expect(negatives.map((entry) => entry.text).join(" ")).toContain("Muster Inkasso")
  })
})

describe("SCHUFA plan", () => {
  const plan = buildSchufaPlan(parseSchufaText(sample))

  it("orders the steps by severity, most damaging first", () => {
    const ids = plan.actions.map((action) => action.category)
    expect(ids).toEqual(["negative", "accounts", "inquiries", "address", "personal"])
    expect(ids.indexOf("negative")).toBeLessThan(ids.indexOf("accounts"))
    expect(ids.indexOf("accounts")).toBeLessThan(ids.indexOf("address"))
  })

  it("never promises a score and always carries the disclaimer", () => {
    expect(plan.packVersion).toBe(SCHUFA_PACK_VERSION)
    expect(plan.disclaimer).toMatch(/keine Rechts- oder Finanzberatung/)
    const joined = JSON.stringify(plan)
    expect(joined).not.toMatch(/\d+\s*(Punkte|точки|points)/i)
  })

  it("labels every category in both locales", () => {
    for (const category of SCHUFA_CATEGORIES) {
      for (const locale of locales) {
        expect(SCHUFA_CATEGORY_LABEL[category][locale].length, `${category}/${locale}`).toBeGreaterThan(1)
      }
    }
  })

  it("is deterministic for the same input", () => {
    const again = buildSchufaPlan(parseSchufaText(sample))
    expect(JSON.stringify(again)).toBe(JSON.stringify(plan))
  })

  it("counts entries per category", () => {
    const counts = countByCategory(plan.entries)
    expect(counts.negative).toBeGreaterThanOrEqual(1)
    expect(counts.insolvency).toBe(0)
  })

  it("adds an insolvency step only when an insolvency entry exists", () => {
    const withInsolvency = buildSchufaPlan(parseSchufaText("Insolvenz\nVerfahren eröffnet 2024"))
    expect(withInsolvency.actions.some((action) => action.category === "insolvency")).toBe(true)
    expect(plan.actions.some((action) => action.category === "insolvency")).toBe(false)
  })
})

describe("SCHUFA routes", () => {
  const analyze = readFileSync(join(process.cwd(), "app/api/schufa/analyze/route.ts"), "utf8")
  const extract = readFileSync(join(process.cwd(), "app/api/schufa/extract/route.ts"), "utf8")

  it("requires authentication and rate-limits both routes", () => {
    for (const source of [analyze, extract]) {
      expect(source).toContain("auth.getUser()")
      expect(source).toContain("AUTHENTICATION_REQUIRED")
      expect(source).toContain("checkRateLimit")
    }
  })

  it("does not persist the uploaded document", () => {
    // The file is read for its text and never written to storage; saving is a
    // separate, explicit user action. A `storage` call here would break that.
    expect(extract).not.toContain(".storage")
    expect(analyze).not.toContain(".storage")
  })
})
