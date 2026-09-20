import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { planPdfFill, planIsGeneratable, checkTemplateSupport, type PdfFact } from "./fill"
import {
  OFFICIAL_PDF_TEMPLATES,
  FMS_2025_TEMPLATES,
  findTemplateById,
  templatesForTaxYear,
  isTemplateVerifiedForYear,
  PDF_MAPPING_VERSION,
} from "./registry"
import { detectCapability, verifyTemplateSource, computeSha256, inspectTemplate } from "./source"
import { buildManifest, renderManifestBody, renderManifestSubject } from "./manifest"

const est1a = findTemplateById("fms-2025-est-1-a")!
const readTemplate = (path: string) =>
  new Uint8Array(readFileSync(resolve(process.cwd(), path)))

/** An AcroForm inspection, used to exercise the fill path that real 2025
 *  templates cannot reach because they are static. */
const acroform = (fieldNames: string[]) => ({ capability: "acroform" as const, fieldNames })

const confirmed = (key: string, value: string): PdfFact => ({
  key,
  value,
  confirmedAt: "2026-01-01T00:00:00.000Z",
})
const unconfirmed = (key: string, value: string): PdfFact => ({
  key,
  value,
  confirmedAt: null,
})

describe("registry integrity", () => {
  it("has a unique id per template", () => {
    const ids = OFFICIAL_PDF_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("declares a sha256 and an official source for every template", () => {
    for (const template of OFFICIAL_PDF_TEMPLATES) {
      expect(template.sourceSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(template.officialSource).toMatch(/^https:\/\//)
      expect(template.retrievalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("keeps tax-year lookups year-scoped with no fallback to another year", () => {
    expect(templatesForTaxYear(2025).length).toBe(FMS_2025_TEMPLATES.length)
    // 2026 is not verified anywhere: an empty result is the correct answer, not
    // the 2025 set.
    expect(templatesForTaxYear(2026)).toEqual([])
    expect(isTemplateVerifiedForYear("fms-2025-est-1-a", 2025)).toBe(true)
    expect(isTemplateVerifiedForYear("fms-2025-est-1-a", 2026)).toBe(false)
  })

  it("uses a single mapping version constant", () => {
    expect(PDF_MAPPING_VERSION).toBe("horizon-pdf-mapping-v1")
  })
})

describe("source verification against the real template bytes", () => {
  it("accepts every registered template whose bytes are present", async () => {
    for (const template of OFFICIAL_PDF_TEMPLATES) {
      const bytes = readTemplate(template.path)
      const result = await verifyTemplateSource(template, bytes)
      expect(result.ok, `hash mismatch for ${template.path}`).toBe(true)
    }
  })

  /**
   * The invariant that makes the provenance claim meaningful: if the bytes change,
   * generation must stop rather than attribute new output to the old source.
   */
  it("rejects a template whose bytes changed", async () => {
    const bytes = readTemplate(est1a.path)
    const tampered = new Uint8Array(bytes)
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] + 1) % 256
    const result = await verifyTemplateSource(est1a, tampered)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.expected).toBe(est1a.sourceSha256)
      expect(result.actual).not.toBe(est1a.sourceSha256)
    }
  })

  it("computes sha256 over bytes deterministically", async () => {
    const bytes = new TextEncoder().encode("horizon")
    expect(await computeSha256(bytes)).toBe(await computeSha256(bytes))
    expect(await computeSha256(bytes)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("capability detection", () => {
  it("reports the real 2025 templates as static, not fillable", () => {
    // Measured, not assumed: these official printable forms expose no fields.
    for (const template of FMS_2025_TEMPLATES) {
      const inspection = detectCapability({
        bytes: readTemplate(template.path),
        readerFieldNames: null,
      })
      expect(inspection.capability, template.path).toBe("static")
      expect(inspection.fieldNames).toEqual([])
      expect(template.capability).toBe("static")
    }
  })

  it("prefers reader-reported fields when the reader exposes a form", () => {
    const inspection = detectCapability({
      bytes: readTemplate(est1a.path),
      readerFieldNames: ["Zeile1", "Zeile2"],
    })
    expect(inspection.capability).toBe("acroform")
    expect(inspection.fieldNames).toEqual(["Zeile1", "Zeile2"])
  })

  it("detects XFA when no fields were exposed", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 /XFA 12 0 R")
    expect(detectCapability({ bytes, readerFieldNames: null }).capability).toBe("xfa")
  })

  it("does not let a reader field list override an XFA packet", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 /XFA 12 0 R")
    expect(detectCapability({ bytes, readerFieldNames: ["a"] }).capability).toBe("acroform")
  })
})

describe("refusals are reported, never faked", () => {
  const mapping = [
    { fieldName: "Zeile1", factKey: "first_name", kind: "text" as const },
  ]

  it("refuses an XFA template with an explicit code", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: { capability: "xfa", fieldNames: [] },
      taxYear: 2025,
      mappings: mapping,
      facts: [confirmed("first_name", "Anna")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unsupported_xfa")
  })

  it("refuses a static template as not fillable", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: { capability: "static", fieldNames: [] },
      taxYear: 2025,
      mappings: mapping,
      facts: [confirmed("first_name", "Anna")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("not_fillable")
  })

  it("refuses an AcroForm that exposes no fields", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform([]),
      taxYear: 2025,
      mappings: mapping,
      facts: [],
      confirmedFactKeys: [],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("not_fillable")
  })

  /** Carrying a mapping onto a differently-shaped form must fail loudly. */
  it("refuses a mapping whose field does not exist in the template", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile2"]),
      taxYear: 2025,
      mappings: mapping,
      facts: [confirmed("first_name", "Anna")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) {
      expect(plan.code).toBe("unknown_field")
      expect(plan.detail).toBe("Zeile1")
    }
  })

  it("refuses generation for a tax year the template does not cover", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1"]),
      taxYear: 2026,
      mappings: mapping,
      facts: [confirmed("first_name", "Anna")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("tax_year_mismatch")
  })

  it("refuses when no year is supplied for a year-specific form", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1"]),
      taxYear: null,
      mappings: mapping,
      facts: [confirmed("first_name", "Anna")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("tax_year_mismatch")
  })

  it("treats an unknown capability as a refusal", () => {
    const refusal = checkTemplateSupport(est1a, {
      capability: "mystery" as never,
      fieldNames: ["a"],
    })
    expect(refusal?.ok).toBe(false)
    if (refusal && !refusal.ok) expect(refusal.code).toBe("capability_unknown")
  })

  it("does not present a plan that filled nothing as generated", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1"]),
      taxYear: 2025,
      mappings: mapping,
      facts: [],
      confirmedFactKeys: [],
    })
    expect(planIsGeneratable(plan)).toBe(false)
  })
})

describe("fill plan: confirmed facts only, nothing inferred", () => {
  const mappings = [
    { fieldName: "Zeile1", factKey: "first_name", kind: "text" as const },
    { fieldName: "Zeile2", factKey: "last_name", kind: "text" as const },
  ]

  it("fills confirmed facts and blanks the rest", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1", "Zeile2"]),
      taxYear: 2025,
      mappings,
      facts: [confirmed("first_name", "Anna"), unconfirmed("last_name", "Müller")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.assignments).toEqual([
      { fieldName: "Zeile1", kind: "text", value: "Anna" },
    ])
    expect(plan.blanks).toEqual([
      { fieldName: "Zeile2", factKey: "last_name", reason: "fact_unconfirmed" },
    ])
    expect(plan.filledCount).toBe(1)
    expect(plan.blankCount).toBe(1)
    expect(planIsGeneratable(plan)).toBe(true)
  })

  /**
   * A fact that exists, is confirmed, but was not included in the confirmation
   * set for this generation must not be written: confirmation is asserted per
   * generation, not inherited from the case.
   */
  it("does not fill a fact that was not confirmed for this generation", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1", "Zeile2"]),
      taxYear: 2025,
      mappings,
      facts: [confirmed("first_name", "Anna"), confirmed("last_name", "Müller")],
      confirmedFactKeys: ["first_name"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.assignments.map((a) => a.fieldName)).toEqual(["Zeile1"])
    expect(plan.blanks.map((b) => b.reason)).toEqual(["fact_unconfirmed"])
  })

  it("distinguishes absent, unconfirmed and empty values", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1", "Zeile2", "Zeile3"]),
      taxYear: 2025,
      mappings: [...mappings, { fieldName: "Zeile3", factKey: "city", kind: "text" }],
      facts: [
        unconfirmed("first_name", "Anna"),
        confirmed("last_name", ""),
        confirmed("city", "  "),
      ],
      confirmedFactKeys: ["first_name", "last_name", "city"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const reasons = Object.fromEntries(plan.blanks.map((b) => [b.fieldName, b.reason]))
    expect(reasons.Zeile1).toBe("fact_unconfirmed")
    expect(reasons.Zeile2).toBe("value_empty")
    // Whitespace-only is empty, so it must not be written as blank-looking text.
    expect(reasons.Zeile3).toBe("value_empty")
    expect(plan.assignments).toEqual([])
  })

  it("never invents a value for a fact that was not supplied at all", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1", "Zeile2", "Zeile3", "Zeile4"]),
      taxYear: 2025,
      mappings: [
        ...mappings,
        { fieldName: "Zeile3", factKey: "tax_id", kind: "text" },
        { fieldName: "Zeile4", factKey: "amount", kind: "text" },
      ],
      facts: [confirmed("first_name", "Anna"), confirmed("last_name", "Müller")],
      confirmedFactKeys: ["first_name", "last_name"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.assignments).toHaveLength(2)
    expect(plan.blanks.every((b) => b.reason === "fact_absent")).toBe(true)
  })

  it("sets a checkbox only when the confirmed value matches its declared literal", () => {
    const checkboxMappings = [
      { fieldName: "Kinder", factKey: "has_children", kind: "checkbox" as const, selectValue: "ja" },
    ]
    const yes = planPdfFill({
      template: est1a,
      inspection: acroform(["Kinder"]),
      taxYear: 2025,
      mappings: checkboxMappings,
      facts: [confirmed("has_children", "ja")],
      confirmedFactKeys: ["has_children"],
    })
    expect(yes.ok).toBe(true)
    if (yes.ok) {
      expect(yes.assignments).toEqual([{ fieldName: "Kinder", kind: "checkbox", value: true }])
    }

    // "yes"/"1"/"true" must not be interpreted as "ja".
    const notMatched = planPdfFill({
      template: est1a,
      inspection: acroform(["Kinder"]),
      taxYear: 2025,
      mappings: checkboxMappings,
      facts: [confirmed("has_children", "yes")],
      confirmedFactKeys: ["has_children"],
    })
    expect(notMatched.ok).toBe(true)
    if (notMatched.ok) {
      expect(notMatched.assignments).toEqual([])
      expect(notMatched.blanks).toHaveLength(1)
    }
  })

  it("sets a radio field to its declared export value", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Veranlagung"]),
      taxYear: 2025,
      mappings: [
        {
          fieldName: "Veranlagung",
          factKey: "assessment",
          kind: "radio",
          selectValue: "zusammen",
          exportValue: "2",
        },
      ],
      facts: [confirmed("assessment", "zusammen")],
      confirmedFactKeys: ["assessment"],
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.assignments).toEqual([
        { fieldName: "Veranlagung", kind: "radio", value: "2" },
      ])
    }
  })

  it("refuses a checkbox mapping with no declared literal", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Kinder"]),
      taxYear: 2025,
      mappings: [{ fieldName: "Kinder", factKey: "has_children", kind: "checkbox" }],
      facts: [confirmed("has_children", "ja")],
      confirmedFactKeys: ["has_children"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unknown_field")
  })

  it("preserves German characters without transliteration", () => {
    const plan = planPdfFill({
      template: est1a,
      inspection: acroform(["Zeile1"]),
      taxYear: 2025,
      mappings: [{ fieldName: "Zeile1", factKey: "name", kind: "text" }],
      facts: [confirmed("name", "Müller-Öztürk, Straße 5, 10115 Berlin")],
      confirmedFactKeys: ["name"],
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.assignments[0].value).toBe("Müller-Öztürk, Straße 5, 10115 Berlin")
    }
  })
})

describe("manifest and P8 binding", () => {
  const plan = planPdfFill({
    template: est1a,
    inspection: acroform(["Zeile1", "Zeile2"]),
    taxYear: 2025,
    mappings: [
      { fieldName: "Zeile2", factKey: "last_name", kind: "text" },
      { fieldName: "Zeile1", factKey: "first_name", kind: "text" },
    ],
    facts: [confirmed("first_name", "Anna"), confirmed("last_name", "Müller")],
    confirmedFactKeys: ["first_name", "last_name"],
  })

  const build = (generatedAt = "2026-01-01T00:00:00.000Z") => {
    if (!plan.ok) throw new Error("plan must succeed")
    return buildManifest({
      template: est1a,
      mappingVersion: PDF_MAPPING_VERSION,
      caseId: "case-1",
      generatedAt,
      assignments: plan.assignments,
      blanks: plan.blanks,
    })
  }

  it("records every required provenance item", () => {
    const manifest = build()
    expect(manifest.authority).toBe("bundesfinanzverwaltung_fms")
    expect(manifest.formName).toBe("Hauptvordruck ESt 1 A")
    expect(manifest.formId).toBe("034037_25")
    expect(manifest.officialSource).toMatch(/^https:\/\/www\.formulare-bfinv\.de\//)
    expect(manifest.formVersion).toBe("2025")
    expect(manifest.taxYear).toBe(2025)
    expect(manifest.retrievalDate).toBe("2026-09-19")
    expect(manifest.sourceSha256).toBe(est1a.sourceSha256)
    expect(manifest.mappingVersion).toBe(PDF_MAPPING_VERSION)
    expect(manifest.caseId).toBe("case-1")
    expect(manifest.generatedAt).toBe("2026-01-01T00:00:00.000Z")
    // No output exists until bytes are produced, so the field is null, not faked.
    expect(manifest.outputSha256).toBeNull()
  })

  /** Approval is bound to the body, so the body must depend only on the inputs. */
  it("renders the same body for the same inputs regardless of mapping order", () => {
    const forward = build()
    const reversed = buildManifest({
      template: est1a,
      mappingVersion: PDF_MAPPING_VERSION,
      caseId: "case-1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      assignments: [...forward.assignments].reverse(),
      blanks: [...forward.blanks].reverse(),
    })
    expect(renderManifestBody(reversed)).toBe(renderManifestBody(forward))
  })

  it("changes the body when an input changes, so an approval stops matching", () => {
    const base = renderManifestBody(build())
    const laterGeneration = renderManifestBody(build("2026-02-02T00:00:00.000Z"))
    expect(laterGeneration).not.toBe(base)

    const otherMapping = renderManifestBody(
      buildManifest({
        template: est1a,
        mappingVersion: "horizon-pdf-mapping-v2",
        caseId: "case-1",
        generatedAt: "2026-01-01T00:00:00.000Z",
        assignments: build().assignments,
        blanks: build().blanks,
      }),
    )
    expect(otherMapping).not.toBe(base)
  })

  it("states in the body that unconfirmed values were left blank", () => {
    const body = renderManifestBody(build())
    expect(body).toContain("ausschließlich bestätigte Angaben")
    expect(body).toContain(est1a.sourceSha256)
  })

  it("derives a subject naming the official form", () => {
    expect(renderManifestSubject(build())).toBe(
      "Amtliches Formular Hauptvordruck ESt 1 A (034037_25)",
    )
  })

  it("reports blank fields in the body so an empty form cannot look complete", () => {
    const manifest = buildManifest({
      template: est1a,
      mappingVersion: PDF_MAPPING_VERSION,
      caseId: "case-1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      assignments: [],
      blanks: [{ fieldName: "Zeile1", factKey: "first_name", reason: "fact_unconfirmed" }],
    })
    const body = renderManifestBody(manifest)
    expect(body).toContain("Leer gebliebene Felder (1)")
    expect(body).toContain("Zeile1 = (leer: fact_unconfirmed)")
  })
})

describe("inspectTemplate end to end on real bytes", () => {
  it("verifies and reports the real template as static", async () => {
    const result = await inspectTemplate({
      template: est1a,
      bytes: readTemplate(est1a.path),
      readerFieldNames: null,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.inspection.capability).toBe("static")
  })

  it("refuses before reporting a capability when the hash does not match", async () => {
    const bytes = readTemplate(est1a.path)
    const tampered = new Uint8Array(bytes)
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] + 1) % 256
    const result = await inspectTemplate({
      template: est1a,
      bytes: tampered,
      readerFieldNames: ["Zeile1"],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("source_hash_mismatch")
  })
})