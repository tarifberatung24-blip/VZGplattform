import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  AGENTUR_TASKS,
  AGENTUR_TASK_DEFINITIONS,
  AGENTUR_OFFICIAL_SOURCES,
  agenturTaskDefinition,
  agenturTaskKey,
  isAgenturFormFillable,
  isAgenturTask,
  requiredFactKeysForTask,
  agenturTasksWithFillableForm,
} from "./registry"
import { AGENTUR_TEMPLATE_MAPPINGS, agenturMappingsForTemplate } from "./mappings"
import { AGENTUR_FUER_ARBEIT_TEMPLATES, findTemplateById } from "../pdf/registry"
import { detectCapability, verifyTemplateSource } from "../pdf/source"
import { planPdfFill, type PdfFact } from "../pdf/fill"
import { readAcroFormFieldNames, generateAcroFormPdf, readTemplateBytes } from "../pdf/writer"
import { computeSha256 } from "../pdf/source"
import { requiredKeysFor, AGENTUR_TASK_FACT_KEY, selectedAgenturTask } from "../case/missing-info"
import { getAgenturCopy } from "./copy"

const readTemplate = (path: string) => new Uint8Array(readFileSync(resolve(process.cwd(), path)))

describe("task registry is complete and self-consistent", () => {
  it("has a definition for every declared task, in order", () => {
    expect(AGENTUR_TASK_DEFINITIONS.map((d) => d.task)).toEqual([...AGENTUR_TASKS])
  })

  it("has a copy key for every task", () => {
    for (const task of AGENTUR_TASKS) {
      expect(agenturTaskKey[task], task).toBeTruthy()
    }
  })

  it("rejects an unknown task rather than defaulting to one", () => {
    expect(isAgenturTask("arbeitslos_melden")).toBe(true)
    expect(isAgenturTask("sozialhilfe")).toBe(false)
    expect(isAgenturTask(null)).toBe(false)
  })

  it("resolves a definition for every task", () => {
    for (const task of AGENTUR_TASKS) {
      expect(agenturTaskDefinition(task).task, task).toBe(task)
    }
  })
})

describe("online-only tasks do not fabricate a paper form", () => {
  /**
   * The BA publishes no fillable PDF for reporting as job-seeking or unemployed:
   * both are handled by an online service. Offering a form here would be the
   * exact fabrication the launch rules forbid, so this test pins the refusal.
   */
  const onlineOnly = AGENTUR_TASK_DEFINITIONS.filter((d) => d.routeKind === "online_only")

  it("covers the tasks the BA actually handles online-only", () => {
    expect(onlineOnly.map((d) => d.task)).toEqual(["arbeitsuchend_melden", "arbeitslos_melden"])
  })

  it("declares no form for an online-only task", () => {
    for (const definition of onlineOnly) {
      expect(definition.forms, definition.task).toEqual([])
    }
  })

  it("names the official online service for every task", () => {
    for (const definition of AGENTUR_TASK_DEFINITIONS) {
      expect(definition.official.onlineUrl, definition.task).toMatch(/^https:\/\//)
    }
  })

  it("cites only https official sources", () => {
    for (const source of AGENTUR_OFFICIAL_SOURCES) {
      expect(source).toMatch(/^https:\/\//)
    }
  })
})

describe("the one fillable form is genuinely fillable", () => {
  const template = findTemplateById("ba-veraenderungsmitteilung-alg")!

  it("is registered with measured capability and a recorded hash", () => {
    expect(template).not.toBeNull()
    expect(template.authority).toBe("bundesagentur_fuer_arbeit")
    // Measured: the template exposes real AcroForm fields.
    expect(template.capability).toBe("acroform")
    expect(template.sourceSha256).toMatch(/^[0-9a-f]{64}$/)
    // Not a tax form, so it must never enter a tax-year lookup.
    expect(template.taxYear).toBeNull()
  })

  it("matches its recorded hash, so provenance is real", async () => {
    const bytes = readTemplate(template.path)
    const result = await verifyTemplateSource(template, bytes)
    expect(result.ok).toBe(true)
  })

  it("is reported as acroform from its own bytes", async () => {
    const bytes = readTemplate(template.path)
    const fieldNames = await readAcroFormFieldNames(bytes)
    const inspection = detectCapability({ bytes, readerFieldNames: fieldNames })
    expect(inspection.capability).toBe("acroform")
    expect(inspection.fieldNames.length).toBeGreaterThan(0)
  })

  it("is listed as fillable by the task that uses it", () => {
    expect(isAgenturFormFillable("ba-veraenderungsmitteilung-alg")).toBe(true)
    expect(agenturTasksWithFillableForm()).toEqual(["veraenderungen_mitteilen"])
  })

  it("is not claimed fillable for a template with no measured mapping", () => {
    expect(isAgenturFormFillable("ba-antrag-sgb2")).toBe(false)
  })
})

describe("every mapped field name exists in the real template", () => {
  /**
   * The invariant that makes the mapping safe: a name that is not in the bytes is
   * a hard failure in `planPdfFill`, so this catches a typo or a mapping carried
   * across a template revision before it can reach a user.
   */
  it("resolves all mapping fields against the reader's field list", async () => {
    const template = findTemplateById("ba-veraenderungsmitteilung-alg")!
    const bytes = readTemplate(template.path)
    const fieldNames = (await readAcroFormFieldNames(bytes)) ?? []
    const names = new Set(fieldNames)

    for (const [templateId, mappings] of Object.entries(AGENTUR_TEMPLATE_MAPPINGS)) {
      for (const mapping of mappings) {
        expect(
          names.has(mapping.fieldName),
          `${templateId}: ${mapping.fieldName} is not a field of the template`,
        ).toBe(true)
      }
    }
    expect(agenturMappingsForTemplate("unknown-template")).toEqual([])
  })

  it("does not map a field the template lacks", () => {
    const template = findTemplateById("ba-veraenderungsmitteilung-alg")!
    const plan = planPdfFill({
      template,
      inspection: {
        capability: "acroform",
        fieldNames: agenturMappingsForTemplate(template.id).map((m) => m.fieldName),
      },
      taxYear: null,
      mappings: [
        { fieldName: "Veraenderungsmitteilung[0].Seite1[0].Erfunden[0]", factKey: "x", kind: "text" },
      ],
      facts: [{ key: "x", value: "1", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["x"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unknown_field")
  })
})

describe("only confirmed facts reach the form", () => {
  const template = findTemplateById("ba-veraenderungsmitteilung-alg")!
  const mappings = agenturMappingsForTemplate(template.id)
  const inspection = { capability: "acroform" as const, fieldNames: mappings.map((m) => m.fieldName) }

  const fact = (key: string, value: string, confirmed: boolean): PdfFact => ({
    key,
    value,
    confirmedAt: confirmed ? "2026-01-01T00:00:00.000Z" : null,
  })

  it("fills a confirmed name and leaves the rest blank with a reason", () => {
    const plan = planPdfFill({
      template,
      inspection,
      taxYear: null,
      mappings,
      facts: [fact("person_first_name", "Maximilian", true)],
      confirmedFactKeys: ["person_first_name"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.assignments).toHaveLength(1)
    expect(plan.assignments[0].value).toBe("Maximilian")
    expect(plan.blanks.length).toBe(mappings.length - 1)
    // Every unmapped-but-present fact is blank because the fact is absent, not
    // because the engine guessed a value.
    expect(plan.blanks.every((b) => b.reason === "fact_absent")).toBe(true)
  })

  it("never writes an unconfirmed fact onto an official form", () => {
    const plan = planPdfFill({
      template,
      inspection,
      taxYear: null,
      mappings,
      facts: [fact("person_first_name", "Maximilian", false)],
      confirmedFactKeys: [],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.filledCount).toBe(0)
    expect(plan.blanks[0].reason).toBe("fact_unconfirmed")
  })

  it("refuses to present an unchanged form as generated output", () => {
    const plan = planPdfFill({
      template,
      inspection,
      taxYear: null,
      mappings,
      facts: [],
      confirmedFactKeys: [],
    })
    expect(plan.ok).toBe(true)
    // A zero-fill plan is not generatable; the action maps it to nothing_to_fill.
    if (plan.ok) expect(plan.filledCount).toBe(0)
  })
})

describe("generation actually writes the values into the official form", () => {
  const template = findTemplateById("ba-veraenderungsmitteilung-alg")!

  /**
   * Every mapped field name must exist in the template's own bytes. A stale name
   * would make the planner refuse the whole form (`unknown_field`) or, worse,
   * silently drop a value the user believed was submitted.
   */
  it("names only fields the official template actually exposes", async () => {
    const loaded = await readTemplateBytes(template.path)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return

    const present = new Set((await readAcroFormFieldNames(loaded.bytes)) ?? [])
    expect(present.size).toBeGreaterThan(0)

    const mapped = agenturMappingsForTemplate(template.id)
    expect(mapped.length).toBeGreaterThan(0)
    for (const mapping of mapped) {
      expect(present.has(mapping.fieldName)).toBe(true)
    }
  })

  /**
   * Regression: pdf.js takes ownership of the `data` it is handed and detaches the
   * buffer on cleanup. Reading field names first and then hashing/filling the same
   * array used to see zero bytes, so every official form failed with a spurious
   * `source_hash_mismatch`. The reader now copies, and this pins that.
   */
  it("leaves the caller's bytes intact after reading field names", async () => {
    const loaded = await readTemplateBytes(template.path)
    if (!loaded.ok) return
    const expectedLength = loaded.bytes.byteLength
    expect(expectedLength).toBeGreaterThan(0)

    await readAcroFormFieldNames(loaded.bytes)

    expect(loaded.bytes.byteLength).toBe(expectedLength)
    const verification = await verifyTemplateSource(template, loaded.bytes)
    expect(verification.ok).toBe(true)
  })

  /**
   * End-to-end against the real bytes: plan, write, then read the written PDF back
   * and confirm the value is present in the document rather than merely accepted by
   * the planner. This is what distinguishes a genuine fill from a no-op that would
   * hand the user an unchanged official form.
   */
  it("produces a document that contains the confirmed value", async () => {
    const loaded = await readTemplateBytes(template.path)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return

    const fieldNames = (await readAcroFormFieldNames(loaded.bytes)) ?? []
    const plan = planPdfFill({
      template,
      inspection: { capability: "acroform", fieldNames },
      taxYear: null,
      mappings: agenturMappingsForTemplate(template.id),
      facts: [
        { key: "person_first_name", value: "Maximilian", confirmedAt: "2026-01-01T00:00:00.000Z" },
        { key: "person_last_name", value: "Mustermann", confirmedAt: "2026-01-01T00:00:00.000Z" },
      ],
      confirmedFactKeys: ["person_first_name", "person_last_name"],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.filledCount).toBe(2)

    const written = await generateAcroFormPdf({
      templateBytes: loaded.bytes,
      assignments: plan.assignments,
      flatten: true,
    })
    expect(written.ok).toBe(true)
    if (!written.ok) return

    // The output is a distinct artifact, so it cannot be confused with the input.
    expect(await computeSha256(written.bytes)).not.toBe(template.sourceSha256)

    // The values must be findable in the produced document's rendered text. A
    // "successful" write that dropped them would hand the user an unchanged
    // official form. The content stream is compressed, so this extracts text
    // rather than scanning raw bytes.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(written.bytes),
      useSystemFonts: false,
    }).promise
    let text = ""
    for (let page = 1; page <= doc.numPages; page += 1) {
      const content = await (await doc.getPage(page)).getTextContent()
      text += content.items.map((item) => ("str" in item ? item.str : "")).join("")
    }
    await doc.cleanup()

    expect(text).toContain("Maximilian")
    expect(text).toContain("Mustermann")
    // The form's own printed revision is untouched by the fill.
    expect(text).toContain("09/2020")
  })

  it("does not carry the source's XFA packet into the generated document", async () => {
    const loaded = await readTemplateBytes(template.path)
    if (!loaded.ok) return
    const written = await generateAcroFormPdf({
      templateBytes: loaded.bytes,
      assignments: [
        {
          fieldName: "Veraenderungsmitteilung[0].Seite1[0].Vorname[0]",
          kind: "text",
          value: "Maximilian",
        },
      ],
      flatten: true,
    })
    expect(written.ok).toBe(true)
    if (!written.ok) return

    // The writer drops XFA on save, which is what makes the filled AcroForm the
    // document a viewer renders instead of an XFA form that ignores the values.
    const marker = Buffer.from("/XFA")
    const output = Buffer.from(written.bytes)
    expect(output.includes(marker)).toBe(false)
  })
})

describe("module required keys are narrowed by the task, never weakened", () => {
  it("keeps the module's own requirements before a task is chosen", () => {
    expect(requiredKeysFor("agentur_fuer_arbeit", [])).toEqual([
      "recipient_institution",
      "claim_type",
    ])
  })

  it("adds the task's requirements on top of the module's", () => {
    const keys = requiredKeysFor("agentur_fuer_arbeit", [
      { key: AGENTUR_TASK_FACT_KEY, value: "arbeitslos_melden" },
    ])
    expect(keys).toContain("recipient_institution")
    expect(keys).toContain("claim_type")
    expect(keys).toContain("unemployment_start_date")
    expect(keys).toContain("already_reported_as_jobseeker")
  })

  it("ignores a task value that is not a known task", () => {
    expect(
      requiredKeysFor("agentur_fuer_arbeit", [{ key: AGENTUR_TASK_FACT_KEY, value: "invented" }]),
    ).toEqual(["recipient_institution", "claim_type"])
    expect(selectedAgenturTask([{ key: AGENTUR_TASK_FACT_KEY, value: "invented" }])).toBeNull()
  })

  it("does not let a task relax another module's requirements", () => {
    expect(requiredKeysFor("kuendigung", [{ key: AGENTUR_TASK_FACT_KEY, value: "arbeitslos_melden" }])).toEqual([
      "contract_provider",
      "contract_reference",
    ])
  })

  it("returns each task's required keys without duplicates", () => {
    for (const task of AGENTUR_TASKS) {
      const keys = requiredFactKeysForTask(task)
      expect(new Set(keys).size, task).toBe(keys.length)
    }
  })
})

describe("copy covers both active languages and every task", () => {
  it("labels every task in de and bg", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getAgenturCopy(locale)
      for (const task of AGENTUR_TASKS) {
        expect(copy.tasks[task].title.length, `${locale}/${task}`).toBeGreaterThan(0)
        expect(copy.tasks[task].text.length, `${locale}/${task}`).toBeGreaterThan(0)
      }
    }
  })

  it("explains every route kind in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getAgenturCopy(locale)
      for (const definition of AGENTUR_TASK_DEFINITIONS) {
        expect(copy.routeKinds[definition.routeKind].length, `${locale}/${definition.task}`).toBeGreaterThan(0)
      }
    }
  })

  it("states the absence of a paper form rather than staying silent", () => {
    for (const locale of ["de", "bg"] as const) {
      expect(getAgenturCopy(locale).noPaperForm.length).toBeGreaterThan(0)
    }
  })
})

describe("template registry stays honest about form count", () => {
  it("registers exactly the BA templates that were retrieved and verified", () => {
    expect(AGENTUR_FUER_ARBEIT_TEMPLATES).toHaveLength(1)
  })

  it("records the hybrid XFA nature of the Veränderungsmitteilung", () => {
    // The file carries an XFA packet alongside its AcroForm fields; recording it
    // stops a later reader from treating the template as single-format.
    expect(AGENTUR_FUER_ARBEIT_TEMPLATES[0].xfaHybrid).toBe(true)
    // The printed revision is what the authority recognises, and it is not the
    // same claim as the retrieval date.
    expect(AGENTUR_FUER_ARBEIT_TEMPLATES[0].printedVersion).toContain("09/2020")
  })
})
