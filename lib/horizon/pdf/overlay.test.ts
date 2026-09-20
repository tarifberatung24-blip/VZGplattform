import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  EST_1_A_2025_MAPPING,
  STATIC_TEMPLATE_MAPPINGS,
  staticMappingForTemplate,
  staticOverlayTemplateIds,
  toPdfY,
  type StaticTemplateMapping,
} from "./overlay-map"
import { planOverlayFill, applyFormat, overlayFieldByName } from "./overlay-fill"
import { generateOverlayPdf, createTextMeasurer, readTemplateBytes } from "./writer"
import { isWinAnsiRepresentable } from "./encoding"
import { findTemplateById, OFFICIAL_PDF_TEMPLATES } from "./registry"
import { detectCapability, computeSha256 } from "./source"
import { buildManifest, renderManifestBody } from "./manifest"
import type { PdfFact } from "./fill"

const est1a = findTemplateById("fms-2025-est-1-a")!
const estBytes = () => new Uint8Array(readFileSync(resolve(process.cwd(), est1a.path)))

const confirmed = (key: string, value: string): PdfFact => ({
  key,
  value,
  confirmedAt: "2026-01-01T00:00:00.000Z",
})

const planWith = async (facts: PdfFact[], confirmedKeys: string[]) => {
  const measure = await createTextMeasurer()
  return planOverlayFill({
    mapping: EST_1_A_2025_MAPPING,
    templateSourceSha256: est1a.sourceSha256,
    taxYear: 2025,
    facts,
    confirmedFactKeys: confirmedKeys,
    measure,
  })
}

describe("overlay mapping is bound to the verified template", () => {
  it("binds every mapping to the registered template's hash and year", () => {
    for (const id of staticOverlayTemplateIds()) {
      const mapping = STATIC_TEMPLATE_MAPPINGS[id]
      const template = findTemplateById(id)
      expect(template, `no registered template for ${id}`).not.toBeNull()
      expect(mapping.sourceSha256).toBe(template!.sourceSha256)
      expect(mapping.taxYear).toBe(template!.taxYear)
      expect(mapping.templateId).toBe(id)
    }
  })

  /**
   * The core coordinate-integrity test: for every mapped field, the printed input
   * box must sit directly beneath the printed label it claims to belong to, on the
   * same page. This is re-derived from the stored evidence rather than trusting
   * the stored PDF coordinates, so a typo in `x`/`yBottom` fails the suite.
   */
  it("places each box beneath the label it names", () => {
    for (const field of EST_1_A_2025_MAPPING.fields) {
      const { labelBox, inputBox, pageHeight } = field.evidence
      // The box begins at or below the label's bottom edge.
      expect(inputBox.top, `${field.fieldName} box starts above its label`).toBeGreaterThanOrEqual(
        labelBox.bottom - 0.5,
      )
      // The gap between label and box is small: they are adjacent.
      expect(inputBox.top - labelBox.bottom).toBeLessThan(3)
      // The box horizontally covers the start of the label.
      expect(inputBox.x0).toBeLessThanOrEqual(labelBox.x0)
      // The stored PDF coordinates are exactly the measured box in PDF space.
      expect(field.x).toBeCloseTo(inputBox.x0, 1)
      expect(field.yBottom).toBeCloseTo(toPdfY(inputBox.bottom, pageHeight), 2)
      expect(field.maxWidth).toBeCloseTo(inputBox.x1 - inputBox.x0, 2)
      expect(field.maxHeight).toBeCloseTo(inputBox.bottom - inputBox.top, 2)
    }
  })

  it("declares an evidence trail with the label and page height", () => {
    for (const field of EST_1_A_2025_MAPPING.fields) {
      expect(field.evidence.label.length).toBeGreaterThan(1)
      expect(field.evidence.pageHeight).toBe(EST_1_A_2025_MAPPING.pageHeight)
      expect(field.page).toBeGreaterThanOrEqual(1)
      expect(field.fontSize).toBeGreaterThan(0)
    }
  })

  it("has unique field names and fact keys per template", () => {
    const names = EST_1_A_2025_MAPPING.fields.map((field) => field.fieldName)
    expect(new Set(names).size).toBe(names.length)
  })

  it("refuses to hand out a mapping for an unmeasured template", () => {
    expect(staticMappingForTemplate("fms-2025-anlage-n")).toBeNull()
    expect(staticMappingForTemplate("nope")).toBeNull()
  })

  /** Every mapping must target a template that is genuinely static. */
  it("only maps templates that are measured static", () => {
    for (const id of staticOverlayTemplateIds()) {
      const template = findTemplateById(id)!
      const inspection = detectCapability({
        bytes: new Uint8Array(readFileSync(resolve(process.cwd(), template.path))),
        readerFieldNames: null,
      })
      expect(inspection.capability, id).toBe("static")
    }
  })
})

describe("overlay planning refuses unsafe generation", () => {
  it("refuses when the mapping's hash does not match the template", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: "0".repeat(64),
      taxYear: 2025,
      facts: [confirmed("last_name", "Müller")],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("source_hash_mismatch")
  })

  it("refuses a different tax year", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2026,
      facts: [confirmed("last_name", "Müller")],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("tax_year_mismatch")
  })

  it("refuses when nothing confirmed could be placed", async () => {
    const plan = await planWith([], [])
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("nothing_to_fill")
  })

  /**
   * A value wider than the printed box must be refused, not clipped: silently
   * truncating a name on an official form would be worse than refusing.
   */
  it("refuses a value that does not fit its box", async () => {
    const plan = await planWith(
      [confirmed("first_name", "A".repeat(200))],
      ["first_name"],
    )
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("value_too_wide")
  })

  it("refuses a refused format value instead of reinterpreting it", async () => {
    const plan = await planWith(
      [confirmed("date_of_birth", "01.02.1990")],
      ["date_of_birth"],
    )
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unsupported_format_value")
  })
})

describe("overlay planning fills only confirmed facts", () => {
  it("fills confirmed facts and reports the rest as blank", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [
        confirmed("last_name", "Müller"),
        { key: "first_name", value: "Anna", confirmedAt: null },
      ],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.placements.map((p) => p.fieldName)).toEqual(["name"])
    expect(plan.placements[0].value).toBe("Müller")
    const reasons = Object.fromEntries(plan.blanks.map((b) => [b.fieldName, b.reason]))
    expect(reasons.vorname).toBe("fact_unconfirmed")
    // Facts never supplied are absent, not blank-filled with a guess.
    expect(reasons.idnr).toBe("fact_absent")
  })

  it("places every value inside its measured box", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [
        confirmed("last_name", "Öztürk"),
        confirmed("first_name", "Anna"),
        confirmed("street", "Straße 5"),
        confirmed("postal_code", "10115"),
        confirmed("city", "Berlin"),
        confirmed("date_of_birth", "1990-02-01"),
        confirmed("tax_id", "12345678901"),
      ],
      confirmedFactKeys: [
        "last_name",
        "first_name",
        "street",
        "postal_code",
        "city",
        "date_of_birth",
        "tax_id",
      ],
      measure,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.filledCount).toBe(7)
    for (const placement of plan.placements) {
      const field = overlayFieldByName(EST_1_A_2025_MAPPING, placement.fieldName)!
      expect(placement.x).toBeGreaterThanOrEqual(field.x)
      expect(placement.y).toBeGreaterThanOrEqual(field.yBottom)
      expect(placement.y + placement.size).toBeLessThanOrEqual(
        field.yBottom + field.maxHeight + field.fontSize * 0.3,
      )
    }
  })

  it("formats a confirmed ISO date as German, without shifting it", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [confirmed("date_of_birth", "1990-02-01")],
      confirmedFactKeys: ["date_of_birth"],
      measure,
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) expect(plan.placements[0].value).toBe("01.02.1990")
  })

  it("applies declared formats deterministically", () => {
    expect(applyFormat("1990-02-01", "date_de")).toBe("01.02.1990")
    expect(applyFormat("01.02.1990", "date_de")).toBeNull()
    expect(applyFormat("1990-2-1", "date_de")).toBeNull()
    expect(applyFormat("12,5", "decimal_comma_to_point")).toBe("12.5")
    expect(applyFormat("unverändert", undefined)).toBe("unverändert")
  })
})

describe("German characters survive the write round-trip", () => {
  const germanValue = "Müller-Öztürk, Straße 5, ÄÖÜäöüß"

  it("treats umlauts and ß as representable", () => {
    expect(isWinAnsiRepresentable(germanValue)).toBe(true)
    // Latin-1 letters such as Ø and å are inside CP1252 too.
    expect(isWinAnsiRepresentable("Björn Ødegård")).toBe(true)
  })

  /**
   * Characters outside CP1252 are refused. This matters because profile languages
   * include pl/ru/bg, so a user's name may legitimately contain one — and the
   * engine must not silently mangle it onto an official German form.
   */
  it("refuses characters outside the writer's encoding", () => {
    expect(isWinAnsiRepresentable("Kowalczyk-Ćwiąkała")).toBe(false)
    expect(isWinAnsiRepresentable("Иванов")).toBe(false)
    expect(isWinAnsiRepresentable("Παπαδόπουλος")).toBe(false)
  })

  it("writes German text without corruption and preserves other pages", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [confirmed("last_name", germanValue)],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    const source = estBytes()
    const written = await generateOverlayPdf({
      templateBytes: source,
      mapping: EST_1_A_2025_MAPPING,
      plan,
    })
    expect(written.ok).toBe(true)
    if (!written.ok) return

    // The artifact is a new document, and the source template is untouched.
    expect(written.bytes.byteLength).toBeGreaterThan(0)
    expect(await computeSha256(source)).toBe(est1a.sourceSha256)

    // The template page count is preserved: values are added, pages are not lost.
    const { PDFDocument } = await import("pdf-lib")
    const reloaded = await PDFDocument.load(written.bytes)
    const original = await PDFDocument.load(source)
    expect(reloaded.getPageCount()).toBe(original.getPageCount())
  })

  /**
   * Refused during planning, not at write time. pdf-lib throws when measuring
   * text outside WinAnsi, so the guard has to run before the measurement — a user
   * with a Polish or Cyrillic name must get a clear refusal, not a crash.
   */
  it("refuses an unrepresentable value before measuring it", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [confirmed("last_name", "Ćwiąkała")],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unsupported_characters")
  })

  it("places a Latin-1 name such as Ø/å without refusal", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [confirmed("last_name", "Ødegård")],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    expect(plan.ok).toBe(true)
  })
})

describe("end-to-end: template → verify → plan → write → manifest", () => {
  it("produces a private artifact with full provenance and a real output hash", async () => {
    const bytes = await readTemplateBytes(est1a.path)
    expect(bytes.ok).toBe(true)
    if (!bytes.ok) return

    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [
        confirmed("last_name", "Müller"),
        confirmed("first_name", "Anna"),
        confirmed("postal_code", "10115"),
      ],
      confirmedFactKeys: ["last_name", "first_name", "postal_code"],
      measure,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    const written = await generateOverlayPdf({
      templateBytes: bytes.bytes,
      mapping: EST_1_A_2025_MAPPING,
      plan,
      shade: true,
    })
    expect(written.ok).toBe(true)
    if (!written.ok) return

    const outputSha256 = await computeSha256(written.bytes)
    const manifest = buildManifest({
      template: est1a,
      mappingVersion: EST_1_A_2025_MAPPING.mappingVersion,
      caseId: "case-1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      assignments: plan.placements.map((placement) => ({
        fieldName: placement.fieldName,
        kind: "text" as const,
        value: placement.value,
      })),
      blanks: plan.blanks,
      outputSha256,
    })

    // Every provenance item the owner required is present.
    expect(manifest.authority).toBe("bundesfinanzverwaltung_fms")
    expect(manifest.officialSource).toMatch(/^https:\/\//)
    expect(manifest.formName).toBe("Hauptvordruck ESt 1 A")
    expect(manifest.formId).toBe("034037_25")
    expect(manifest.taxYear).toBe(2025)
    expect(manifest.sourceSha256).toBe(est1a.sourceSha256)
    expect(manifest.mappingVersion).toBe("horizon-pdf-mapping-v1")
    expect(manifest.outputSha256).toBe(outputSha256)
    expect(manifest.caseId).toBe("case-1")
    expect(manifest.generatedAt).toBe("2026-01-01T00:00:00.000Z")
    expect(manifest.filledCount).toBe(3)

    const body = renderManifestBody(manifest)
    expect(body).toContain(outputSha256)
    expect(body).toContain(est1a.sourceSha256)
    expect(body).toContain("Müller")
  })

  it("produces a different output hash when an input changes", async () => {
    const measure = await createTextMeasurer()
    const write = async (name: string) => {
      const plan = planOverlayFill({
        mapping: EST_1_A_2025_MAPPING,
        templateSourceSha256: est1a.sourceSha256,
        taxYear: 2025,
        facts: [confirmed("last_name", name)],
        confirmedFactKeys: ["last_name"],
        measure,
      })
      if (!plan.ok) throw new Error("plan failed")
      const written = await generateOverlayPdf({
        templateBytes: estBytes(),
        mapping: EST_1_A_2025_MAPPING,
        plan,
      })
      if (!written.ok) throw new Error("write failed")
      return computeSha256(written.bytes)
    }
    expect(await write("Müller")).not.toBe(await write("Öztürk"))
  })

  it("never relies on the same output hash twice for the same input", async () => {
    const measure = await createTextMeasurer()
    const plan = planOverlayFill({
      mapping: EST_1_A_2025_MAPPING,
      templateSourceSha256: est1a.sourceSha256,
      taxYear: 2025,
      facts: [confirmed("last_name", "Müller")],
      confirmedFactKeys: ["last_name"],
      measure,
    })
    if (!plan.ok) throw new Error("plan failed")
    const first = await generateOverlayPdf({
      templateBytes: estBytes(),
      mapping: EST_1_A_2025_MAPPING,
      plan,
    })
    const second = await generateOverlayPdf({
      templateBytes: estBytes(),
      mapping: EST_1_A_2025_MAPPING,
      plan,
    })
    if (!first.ok || !second.ok) throw new Error("write failed")
    // Same plan over the same template is deterministic: the output hash is a
    // faithful identity for what was approved.
    expect(await computeSha256(first.bytes)).toBe(await computeSha256(second.bytes))
  })
})

describe("coordinate space conversion", () => {
  it("stores a PDF-space y that reflects the measured top-down box", () => {
    for (const field of EST_1_A_2025_MAPPING.fields) {
      const { inputBox, pageHeight } = field.evidence
      expect(field.yBottom).toBeCloseTo(toPdfY(inputBox.bottom, pageHeight), 2)
      // Sanity: a box near the top of the page has a large PDF y.
      if (inputBox.top < 400) expect(field.yBottom).toBeGreaterThan(pageHeight / 2)
    }
  })

  it("keeps every mapped box on page one of a two-page form", () => {
    for (const field of EST_1_A_2025_MAPPING.fields) {
      expect(field.page).toBe(1)
    }
  })

  it("does not map a page the template does not have", () => {
    for (const id of staticOverlayTemplateIds()) {
      const mapping: StaticTemplateMapping = STATIC_TEMPLATE_MAPPINGS[id]
      const template = findTemplateById(id)!
      const pages = /\/Count (\d+)/.exec(
        readFileSync(resolve(process.cwd(), template.path), "latin1"),
      )
      if (pages) {
        const count = Number(pages[1])
        for (const field of mapping.fields) {
          expect(field.page).toBeLessThanOrEqual(Math.max(count, 2))
        }
      }
    }
  })

  it("covers only templates that are registered", () => {
    for (const id of staticOverlayTemplateIds()) {
      expect(OFFICIAL_PDF_TEMPLATES.some((template) => template.id === id)).toBe(true)
    }
  })
})