import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  JOBCENTER_TASKS,
  JOBCENTER_TASK_DEFINITIONS,
  JOBCENTER_OFFICIAL_SOURCES,
  JOBCENTER_ANLAGEN,
  JOBCENTER_ANLAGE_ACTIVATOR_KEYS,
  anlagenForConfirmedFacts,
  isJobcenterFormFillable,
  isJobcenterTask,
  jobcenterTaskDefinition,
  jobcenterTaskKey,
  requiredFactKeysForJobcenterTask,
} from "./registry"
import { JOBCENTER_TEMPLATE_MAPPINGS, jobcenterMappingsForTemplate } from "./mappings"
import { JOBCENTER_TEMPLATES, findTemplateById } from "../pdf/registry"
import { detectCapability, verifyTemplateSource, computeSha256 } from "../pdf/source"
import { planPdfFill } from "../pdf/fill"
import { readAcroFormFieldNames, generateAcroFormPdf, readTemplateBytes } from "../pdf/writer"
import {
  requiredKeysFor,
  JOBCENTER_TASK_FACT_KEY,
  selectedJobcenterTask,
} from "../case/missing-info"
import { getJobcenterCopy } from "./copy"

const readTemplate = (path: string) => new Uint8Array(readFileSync(resolve(process.cwd(), path)))

describe("P13 task registry is complete and self-consistent", () => {
  it("has a definition for every declared task, in order", () => {
    expect(JOBCENTER_TASK_DEFINITIONS.map((d) => d.task)).toEqual([...JOBCENTER_TASKS])
  })

  it("has a copy key for every task", () => {
    for (const task of JOBCENTER_TASKS) expect(jobcenterTaskKey[task], task).toBeTruthy()
  })

  it("rejects an unknown task rather than defaulting to one", () => {
    expect(isJobcenterTask("weiterbewilligung")).toBe(true)
    expect(isJobcenterTask("buergergeld")).toBe(false)
    expect(isJobcenterTask(null)).toBe(false)
  })

  it("resolves a definition for every task", () => {
    for (const task of JOBCENTER_TASKS) {
      expect(jobcenterTaskDefinition(task).task, task).toBe(task)
    }
  })

  it("cites only official arbeitsagentur.de or jobcenter.digital sources", () => {
    for (const url of JOBCENTER_OFFICIAL_SOURCES) {
      // Includes the BA's own service subdomains such as web.arbeitsagentur.de,
      // which host the online application endpoints.
      expect(url).toMatch(/^https:\/\/([a-z0-9-]+\.)*(arbeitsagentur\.de|jobcenter\.digital)\//)
    }
  })
})

describe("the change task does not fabricate a form that no longer exists", () => {
  /**
   * The BA no longer publishes a current SGB II Veränderungsmitteilung PDF: it
   * points to jobcenter.digital or to the responsible Jobcenter for a paper copy.
   * Reusing the retired Arbeitslosengeld change form here would misrepresent a
   * superseded SGB III document as a current SGB II one, so this pins the refusal.
   */
  it("offers no form for veraenderung_mitteilen and says it is online-only", () => {
    const definition = jobcenterTaskDefinition("veraenderung_mitteilen")
    expect(definition.routeKind).toBe("online_only")
    expect(definition.forms).toHaveLength(0)
  })
})

describe("Jobcenter templates are honest about provenance and capability", () => {
  it("registers exactly the two forms that were retrieved and verified", () => {
    expect(JOBCENTER_TEMPLATES).toHaveLength(2)
  })

  for (const template of JOBCENTER_TEMPLATES) {
    describe(template.id, () => {
      it("is not a tax form, so it never enters a tax-year lookup", () => {
        expect(template.taxYear).toBeNull()
      })

      it("matches its recorded hash, so provenance is real", async () => {
        const result = await verifyTemplateSource(template, readTemplate(template.path))
        expect(result.ok).toBe(true)
      })

      it("is reported as acroform from its own bytes", async () => {
        const bytes = readTemplate(template.path)
        const inspection = detectCapability({
          bytes,
          readerFieldNames: await readAcroFormFieldNames(bytes),
        })
        expect(inspection.capability).toBe("acroform")
        expect(inspection.fieldNames.length).toBeGreaterThan(0)
      })

      it("carries no XFA packet", async () => {
        const bytes = Buffer.from(readTemplate(template.path))
        expect(bytes.includes(Buffer.from("/XFA"))).toBe(false)
      })

      it("records the printed revision the authority recognises", () => {
        expect(template.printedVersion).toContain("04/2026")
      })
    })
  }

  it("marks both forms fillable", () => {
    expect(isJobcenterFormFillable("jobcenter-hauptantrag")).toBe(true)
    expect(isJobcenterFormFillable("jobcenter-weiterbewilligung")).toBe(true)
    expect(isJobcenterFormFillable("invented-form")).toBe(false)
  })
})

describe("every mapped field name exists in the real template", () => {
  it("resolves all mapping fields against each template's own field list", async () => {
    for (const [templateId, mappings] of Object.entries(JOBCENTER_TEMPLATE_MAPPINGS)) {
      const template = findTemplateById(templateId)
      expect(template, templateId).not.toBeNull()
      if (!template) continue

      const names = new Set((await readAcroFormFieldNames(readTemplate(template.path))) ?? [])
      expect(names.size, templateId).toBeGreaterThan(0)

      for (const mapping of mappings) {
        expect(
          names.has(mapping.fieldName),
          `${templateId}: ${mapping.fieldName} is not a field of the template`,
        ).toBe(true)
      }
    }
  })

  it("does not leak a mapping between templates", () => {
    expect(jobcenterMappingsForTemplate("unknown-template")).toEqual([])
  })
})

describe("generation writes confirmed values into the official form", () => {
  const template = findTemplateById("jobcenter-hauptantrag")!

  it("leaves the caller's bytes intact after reading field names", async () => {
    const loaded = await readTemplateBytes(template.path)
    if (!loaded.ok) return
    const length = loaded.bytes.byteLength
    expect(length).toBeGreaterThan(0)

    await readAcroFormFieldNames(loaded.bytes)

    expect(loaded.bytes.byteLength).toBe(length)
    expect((await verifyTemplateSource(template, loaded.bytes)).ok).toBe(true)
  })

  it("produces a document that contains the confirmed values", async () => {
    const loaded = await readTemplateBytes(template.path)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return

    const fieldNames = (await readAcroFormFieldNames(loaded.bytes)) ?? []
    const plan = planPdfFill({
      template,
      inspection: { capability: "acroform", fieldNames },
      taxYear: null,
      mappings: jobcenterMappingsForTemplate(template.id),
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

    expect(await computeSha256(written.bytes)).not.toBe(template.sourceSha256)

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
    expect(text).toContain("04/2026")
  })

  it("leaves an unconfirmed fact blank rather than writing a guess", async () => {
    const loaded = await readTemplateBytes(template.path)
    if (!loaded.ok) return
    const fieldNames = (await readAcroFormFieldNames(loaded.bytes)) ?? []

    const plan = planPdfFill({
      template,
      inspection: { capability: "acroform", fieldNames },
      taxYear: null,
      mappings: jobcenterMappingsForTemplate(template.id),
      facts: [{ key: "person_first_name", value: "Maximilian", confirmedAt: null }],
      confirmedFactKeys: [],
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.filledCount).toBe(0)
    expect(plan.blanks.some((blank) => blank.reason === "fact_unconfirmed")).toBe(true)
  })
})

describe("conditional Anlagen are selected from confirmed facts only", () => {
  const confirmed = (key: string, value: string) => ({
    key,
    value,
    confirmedAt: "2026-01-01T00:00:00.000Z",
  })

  it("activates nothing when no activating fact is confirmed", () => {
    expect(anlagenForConfirmedFacts([])).toHaveLength(0)
    expect(anlagenForConfirmedFacts([{ key: "has_child_under_15", value: "true" }])).toHaveLength(0)
  })

  it("activates only the Anlage a confirmed fact supports", () => {
    const active = anlagenForConfirmedFacts([confirmed("has_self_employment", "true")])
    expect(active.map((a) => a.id)).toEqual(["anlage-eks"])
  })

  it("activates several Anlagen when several facts are confirmed", () => {
    const active = anlagenForConfirmedFacts([
      confirmed("has_housing_costs", "true"),
      confirmed("has_child_under_15", "true"),
    ])
    expect(active.map((a) => a.id).sort()).toEqual(["anlage-kdu", "anlage-ki"])
  })

  it("does not treat a negative or empty answer as activating", () => {
    expect(anlagenForConfirmedFacts([confirmed("has_assets", "false")])).toHaveLength(0)
    expect(anlagenForConfirmedFacts([confirmed("has_assets", "")])).toHaveLength(0)
  })

  it("accepts the affirmative forms the BA forms themselves use", () => {
    for (const value of ["true", "yes", "ja", "да", "JA"]) {
      expect(
        anlagenForConfirmedFacts([confirmed("has_assets", value)]).map((a) => a.id),
        value,
      ).toEqual(["anlage-vm"])
    }
  })

  it("cites only official arbeitsagentur.de sources for the Anlagen", () => {
    for (const anlage of JOBCENTER_ANLAGEN) {
      expect(anlage.officialSource).toMatch(/^https:\/\/www\.arbeitsagentur\.de\/datei\//)
    }
  })

  it("exposes every activator key for the UI's question list", () => {
    const fromAnlagen = new Set(JOBCENTER_ANLAGEN.flatMap((a) => a.activatorFactKeys))
    expect(new Set(JOBCENTER_ANLAGE_ACTIVATOR_KEYS)).toEqual(fromAnlagen)
  })
})

describe("module required keys are narrowed by the task, never weakened", () => {
  it("keeps the module's own requirements before a task is chosen", () => {
    expect(requiredKeysFor("jobcenter", [])).toEqual(["recipient_institution", "claim_type"])
  })

  it("adds the task's requirements on top of the module's", () => {
    const keys = requiredKeysFor("jobcenter", [
      { key: JOBCENTER_TASK_FACT_KEY, value: "erstantrag" },
    ])
    expect(keys).toContain("recipient_institution")
    expect(keys).toContain("claim_type")
    expect(keys).toContain("person_first_name")
    expect(keys).toContain("person_last_name")
  })

  it("keeps a task's optional facts out of the required set", () => {
    // bg_number and wba_period are offered as questions, not demanded: a user who
    // has not confirmed them can still prepare a first WBA, so listing them as
    // required would block the workflow on data the authority accepts later.
    const keys = requiredKeysFor("jobcenter", [
      { key: JOBCENTER_TASK_FACT_KEY, value: "weiterbewilligung" },
    ])
    expect(keys).not.toContain("bg_number")
    expect(keys).not.toContain("wba_period")
    expect(jobcenterTaskDefinition("weiterbewilligung").optionalFactKeys).toEqual(
      expect.arrayContaining(["bg_number", "wba_period"]),
    )
  })

  it("ignores a task value that is not a known task", () => {
    expect(
      requiredKeysFor("jobcenter", [{ key: JOBCENTER_TASK_FACT_KEY, value: "invented" }]),
    ).toEqual(["recipient_institution", "claim_type"])
    expect(selectedJobcenterTask([{ key: JOBCENTER_TASK_FACT_KEY, value: "invented" }])).toBeNull()
  })

  it("does not let a Jobcenter selection answer an Agentur case's questions", () => {
    // The two modules keep separate task facts, so a Jobcenter choice must not
    // resolve as an Agentur task or change the Agentur requirement set.
    expect(selectedJobcenterTask([{ key: "agentur_task", value: "arbeitslos_melden" }])).toBeNull()
    expect(
      requiredKeysFor("agentur_fuer_arbeit", [
        { key: JOBCENTER_TASK_FACT_KEY, value: "erstantrag" },
      ]),
    ).toEqual(["recipient_institution", "claim_type"])
  })

  it("returns each task's required keys without duplicates", () => {
    for (const task of JOBCENTER_TASKS) {
      const keys = requiredFactKeysForJobcenterTask(task)
      expect(new Set(keys).size, task).toBe(keys.length)
    }
  })
})

describe("copy covers both active languages and every task", () => {
  it("labels every task in de and bg", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getJobcenterCopy(locale)
      for (const task of JOBCENTER_TASKS) {
        expect(copy.tasks[task].title.length, `${locale}/${task}`).toBeGreaterThan(0)
        expect(copy.tasks[task].text.length, `${locale}/${task}`).toBeGreaterThan(0)
      }
    }
  })

  it("explains every route kind in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getJobcenterCopy(locale)
      for (const definition of JOBCENTER_TASK_DEFINITIONS) {
        expect(
          copy.routeKinds[definition.routeKind].length,
          `${locale}/${definition.task}`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it("states the absence of a form and the blank-checkbox rule rather than staying silent", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getJobcenterCopy(locale)
      expect(copy.noPaperForm.length).toBeGreaterThan(0)
      expect(copy.formsBlankNote.length).toBeGreaterThan(0)
      expect(copy.anlagenNone.length).toBeGreaterThan(0)
    }
  })
})