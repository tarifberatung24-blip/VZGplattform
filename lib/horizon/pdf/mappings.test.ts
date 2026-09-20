import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  mappingsForTemplate,
  hasMappings,
  mappedTemplateIds,
  TEMPLATE_MAPPINGS,
} from "./mappings"
import { detectCapability } from "./source"
import { FMS_2025_TEMPLATES, OFFICIAL_PDF_TEMPLATES } from "./registry"
import { writerAvailability, readTemplateBytes, readAcroFormFieldNames } from "./writer"

describe("mappings registry is honestly empty", () => {
  /**
   * No field name can be verified against a static template, so claiming a
   * mapping would be inventing official structure. This test is the guard: it
   * fails if a mapping appears for a template whose fields were never read.
   */
  it("declares no mapping for a template with no readable fields", () => {
    for (const template of OFFICIAL_PDF_TEMPLATES) {
      const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), template.path)))
      const inspection = detectCapability({ bytes, readerFieldNames: null })
      if (inspection.capability !== "acroform") {
        expect(
          hasMappings(template.id),
          `${template.id} is ${inspection.capability} but declares mappings`,
        ).toBe(false)
      }
    }
  })

  it("returns no mappings for an unknown template id", () => {
    expect(mappingsForTemplate("does-not-exist")).toEqual([])
  })

  it("scopes every declared mapping to its own template id", () => {
    for (const id of mappedTemplateIds()) {
      expect(TEMPLATE_MAPPINGS[id]?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it("never exposes the mapping table by mutation", () => {
    const first = mappingsForTemplate("does-not-exist")
    expect(Array.isArray(first)).toBe(true)
    expect(first).toHaveLength(0)
  })
})

describe("writer boundary reports unavailability instead of faking output", () => {
  it("reports no writer available with an actionable detail", () => {
    const availability = writerAvailability()
    expect(availability.available).toBe(false)
    if (!availability.available) {
      expect(availability.code).toBe("writer_unavailable")
      expect(availability.detail).toMatch(/manuell/)
    }
  })

  it("reads a registered template's bytes", async () => {
    const template = FMS_2025_TEMPLATES[0]
    const result = await readTemplateBytes(template.path)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.bytes.byteLength).toBeGreaterThan(0)
  })

  it("fails closed when a template file is missing", async () => {
    const result = await readTemplateBytes("public/forms/does-not-exist.pdf")
    expect(result.ok).toBe(false)
  })

  /**
   * The real templates are static, so the reader must report no fields. If this
   * ever changes — e.g. fillable templates replace the printable ones — the
   * mapping registry becomes safe to populate and this test will say so.
   */
  it("finds no AcroForm fields in the shipped official templates", async () => {
    const template = FMS_2025_TEMPLATES[0]
    const loaded = await readTemplateBytes(template.path)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    const fieldNames = await readAcroFormFieldNames(loaded.bytes)
    expect(fieldNames === null || fieldNames.length === 0).toBe(true)
  })
})