import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// `server-only` throws outside a React Server Component graph; the PDF/send
// engines are server-only by design, so the guard is stubbed for unit tests.
vi.mock("server-only", () => ({}))

import {
  EST_1_A_FACT_KEYS,
  STEUER_ANLAGE_ACTIVATOR_KEYS,
  STEUER_OFFICIAL_SOURCES,
  STEUER_YEAR_DEFINITIONS,
  TAX_YEAR_AVAILABILITY,
  anlagenForConfirmedFacts,
  formSupportForTemplate,
  resolveTaxYear,
  steuerFillableTemplateIds,
  steuerSignableTemplateIds,
  steuerYearDefinition,
  supportedTaxYears,
  templateSupportsSignature,
} from "./registry"
import { getSteuerCopy, steuerCopy } from "./copy"
import { requiredKeysFor, selectedTaxYear, STEUER_TAX_YEAR_FACT_KEY } from "../case/missing-info"
import { deriveMissingInformation } from "../case/missing-info"
import { assessDraftRelease, canApproveDraft } from "../case/release"
import { buildApprovalPayload, computeContentHash } from "../case/approval"
import { findTemplateById, templatesForTaxYear } from "../pdf/registry"
import { planPdfFill } from "../pdf/fill"
import { planOverlayFill } from "../pdf/overlay-fill"
import { staticMappingForTemplate } from "../pdf/overlay-map"
import { signaturePlacementForTemplate } from "../pdf/signature-map"
import { readFormOutputSha } from "../pdf/manifest"
import { renderManifestBody, buildManifest } from "../pdf/manifest"
import { computeSha256, verifyTemplateSource, detectCapability } from "../pdf/source"
import { readAcroFormFieldNames, readTemplateBytes } from "../pdf/writer"
import { caseDocumentStoragePath } from "../intake/document"
import type { CaseApproval, CaseDraft } from "../case/contract"

const confirmed = (key: string, value: string) => ({
  key,
  value,
  confirmedAt: "2026-01-01T00:00:00.000Z",
})

const unconfirmed = (key: string, value: string) => ({
  key,
  value,
  confirmedAt: null,
})

describe("the tax-year registry refuses unsupported and unpublished years", () => {
  it("accepts the verified 2025 year", () => {
    const resolved = resolveTaxYear("2025")
    expect(resolved.ok).toBe(true)
    if (resolved.ok) expect(resolved.taxYear).toBe(2025)
  })

  it("refuses 2026 as not yet published rather than mapping it to 2025", () => {
    const resolved = resolveTaxYear("2026")
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.state).toBe("not_yet_published")
      expect(resolved.taxYear).toBe(2026)
    }
  })

  it("refuses an arbitrary year as out of scope, without inventing an entry", () => {
    for (const year of ["2019", "2024", "2027"]) {
      const resolved = resolveTaxYear(year)
      expect(resolved.ok, year).toBe(false)
      if (!resolved.ok) expect(resolved.state, year).toBe("out_of_scope")
    }
  })

  it("refuses a malformed or absent year instead of defaulting", () => {
    for (const raw of [null, undefined, "", "25", "zweitausend", 2025.5]) {
      const resolved = resolveTaxYear(raw as unknown)
      expect(resolved.ok, String(raw)).toBe(false)
    }
  })

  it("lists only supported years as selectable", () => {
    expect(supportedTaxYears()).toEqual([2025])
  })

  it("has no definition for a year whose forms were never verified", () => {
    expect(steuerYearDefinition(2026)).toBeNull()
    expect(steuerYearDefinition(2024)).toBeNull()
  })

  it("offers no templates for an unverified year, not another year's set", () => {
    expect(templatesForTaxYear(2026)).toEqual([])
    expect(templatesForTaxYear(2025).length).toBeGreaterThan(0)
  })

  it("records a verification date and an official source for every year state", () => {
    for (const entry of TAX_YEAR_AVAILABILITY) {
      expect(entry.verifiedOn, String(entry.taxYear)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.source, String(entry.taxYear)).toMatch(/^https:\/\//)
    }
  })

  it("cites official sources only", () => {
    expect(STEUER_OFFICIAL_SOURCES.length).toBeGreaterThan(0)
    for (const source of STEUER_OFFICIAL_SOURCES) {
      expect(source).toMatch(/^https:\/\/(www\.)?(formulare-bfinv\.de|elster\.de|bundesfinanzministerium\.de)/)
    }
  })
})

describe("the selected tax year is only ever a supported year", () => {
  it("returns the year when it is supported", () => {
    expect(selectedTaxYear([confirmed(STEUER_TAX_YEAR_FACT_KEY, "2025")])).toBe(2025)
  })

  it("returns null for an unsupported year stored on the case", () => {
    // A hand-edited or stale fact must not make the workflow behave as if the
    // year's forms existed.
    expect(selectedTaxYear([confirmed(STEUER_TAX_YEAR_FACT_KEY, "2026")])).toBeNull()
    expect(selectedTaxYear([confirmed(STEUER_TAX_YEAR_FACT_KEY, "1999")])).toBeNull()
  })

  it("returns null when no year has been chosen", () => {
    expect(selectedTaxYear([])).toBeNull()
  })

  it("takes the newest selection when the user changes the year", () => {
    const facts = [
      confirmed(STEUER_TAX_YEAR_FACT_KEY, "2026"),
      confirmed(STEUER_TAX_YEAR_FACT_KEY, "2025"),
    ]
    expect(selectedTaxYear(facts)).toBe(2025)
  })
})

describe("required facts are year-scoped and never inherited", () => {
  it("asks only the module's own keys until a supported year is chosen", () => {
    const base = requiredKeysFor("steuererklaerung", [])
    expect(base).toEqual(["tax_year"])
  })

  it("asks the module's own keys for an unsupported year, adding nothing", () => {
    const keys = requiredKeysFor("steuererklaerung", [
      confirmed(STEUER_TAX_YEAR_FACT_KEY, "2026"),
    ])
    expect(keys).toEqual(["tax_year"])
  })

  it("adds the verified form's identity keys once a supported year is chosen", () => {
    const keys = requiredKeysFor("steuererklaerung", [
      confirmed(STEUER_TAX_YEAR_FACT_KEY, "2025"),
    ])
    for (const key of EST_1_A_FACT_KEYS) expect(keys, key).toContain(key)
  })

  it("does not relax another module's requirements", () => {
    const kuendigung = requiredKeysFor("kuendigung", [
      confirmed(STEUER_TAX_YEAR_FACT_KEY, "2025"),
    ])
    expect(kuendigung).toEqual(["contract_provider", "contract_reference"])
  })

  it("reports identity facts as missing for a chosen supported year", () => {
    const missing = deriveMissingInformation(
      [confirmed(STEUER_TAX_YEAR_FACT_KEY, "2025")],
      "steuererklaerung",
    )
    expect(missing.missingFactKeys).toContain("last_name")
    expect(missing.complete).toBe(false)
  })
})

describe("confirmed facts populate allowed fields; unconfirmed facts do not", () => {
  const template = findTemplateById("fms-2025-est-1-a")!

  it("has a verified static mapping bound to this exact template hash and year", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")
    expect(mapping).not.toBeNull()
    expect(mapping!.sourceSha256).toBe(template.sourceSha256)
    expect(mapping!.taxYear).toBe(2025)
  })

  it("places a confirmed value and leaves an unconfirmed one blank", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
      facts: [
        { key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" },
        { key: "first_name", value: "Maria", confirmedAt: null },
      ],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const placed = plan.placements.map((p) => p.factKey)
    expect(placed).toContain("last_name")
    expect(placed).not.toContain("first_name")
    expect(plan.blanks.map((b) => b.factKey)).toContain("first_name")
  })

  it("keeps a missing required fact missing rather than filling it", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const placedKeys = new Set(plan.placements.map((p) => p.factKey))
    for (const key of ["tax_id", "first_name", "city", "street", "postal_code", "date_of_birth"]) {
      expect(placedKeys.has(key), key).toBe(false)
    }
  })

  it("leaves an empty confirmed value blank rather than writing whitespace", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
      facts: [{ key: "last_name", value: "   ", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    // A confirmed-but-blank value is not written at all, so the engine reports
    // that there is nothing to fill rather than emitting an empty-looking form.
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("nothing_to_fill")
  })

  it("refuses a value that does not fit rather than truncating it", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
      facts: [{ key: "last_name", value: "X".repeat(500), confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("value_too_wide")
  })
})

describe("a wrong tax year cannot reuse another year's mapping", () => {
  const template = findTemplateById("fms-2025-est-1-a")!

  it("refuses overlay placement when the requested year differs from the mapping", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2026,
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("tax_year_mismatch")
  })

  it("refuses when the template hash does not match the mapping's binding", () => {
    const mapping = staticMappingForTemplate("fms-2025-est-1-a")!
    const plan = planOverlayFill({
      mapping,
      templateSourceSha256: "0".repeat(64),
      taxYear: 2025,
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
      measure: (text: string) => text.length * 5,
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("source_hash_mismatch")
  })

  it("refuses an AcroForm fill whose declared year differs from the template's", () => {
    const plan = planPdfFill({
      template,
      inspection: { capability: "acroform", fieldNames: ["last_name"] },
      taxYear: 2026,
      mappings: [{ fieldName: "last_name", factKey: "last_name", kind: "text" }],
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("tax_year_mismatch")
  })

  it("refuses an unknown field rather than silently skipping it", () => {
    const plan = planPdfFill({
      template,
      inspection: { capability: "acroform", fieldNames: ["something_else"] },
      taxYear: 2025,
      mappings: [{ fieldName: "last_name", factKey: "last_name", kind: "text" }],
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("unknown_field")
  })

  it("refuses a static template as not fillable through the AcroForm path", () => {
    const plan = planPdfFill({
      template,
      inspection: { capability: "static", fieldNames: [] },
      taxYear: 2025,
      mappings: [{ fieldName: "last_name", factKey: "last_name", kind: "text" }],
      facts: [{ key: "last_name", value: "Musterfrau", confirmedAt: "2026-01-01T00:00:00.000Z" }],
      confirmedFactKeys: ["last_name"],
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.code).toBe("not_fillable")
  })
})

describe("form support is measured against the real template bytes", () => {
  it("reports the ESt 1 A as fillable only because a verified mapping exists", () => {
    expect(formSupportForTemplate("fms-2025-est-1-a")).toBe("fillable")
    expect(staticMappingForTemplate("fms-2025-est-1-a")).not.toBeNull()
  })

  it("reports a template with no verified mapping as manual-only", () => {
    // The Est-Anleitung has official bytes in the repository but no measured
    // coordinates, so it must not be offered as something HORIZON fills.
    expect(formSupportForTemplate("fms-2025-anleitung-est")).toBe("manual_only")
  })

  it("reports an unknown template as manual-only rather than fillable", () => {
    expect(formSupportForTemplate("does-not-exist")).toBe("manual_only")
  })

  it("lists only genuinely fillable templates for the year", () => {
    const fillable = steuerFillableTemplateIds(2025)
    expect(fillable).toContain("fms-2025-est-1-a")
    expect(fillable).not.toContain("fms-2025-anleitung-est")
  })

  it("offers every 2025 official template HORIZON can genuinely fill", () => {
    const fillable = steuerFillableTemplateIds(2025)
    expect(fillable).toContain("fms-2025-anlage-n")
    expect(fillable).toContain("fms-2025-anlage-kind")
    expect(fillable).toContain("fms-2025-anlage-unterhalt")
  })

  it("verifies the shipped ESt 1 A bytes still match the registry hash", async () => {
    const template = findTemplateById("fms-2025-est-1-a")!
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), template.path)))
    expect(await computeSha256(bytes)).toBe(template.sourceSha256)
  })

  it("re-derives the template capability from the bytes rather than trusting it", async () => {
    const template = findTemplateById("fms-2025-est-1-a")!
    const loaded = await readTemplateBytes(template.path)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    const fieldNames = await readAcroFormFieldNames(loaded.bytes)
    const verified = await verifyTemplateSource(template, loaded.bytes)
    expect(verified.ok).toBe(true)
    const inspection = detectCapability({ bytes: loaded.bytes, readerFieldNames: fieldNames })
    expect(inspection.capability).toBe("static")
    expect(inspection.fieldNames).toEqual([])
  })
})

describe("Anlagen follow from confirmed facts only", () => {
  it("activates nothing when no activating fact is confirmed", () => {
    expect(anlagenForConfirmedFacts(2025, [])).toHaveLength(0)
  })

  it("does not treat an unconfirmed activating fact as yes", () => {
    expect(anlagenForConfirmedFacts(2025, [unconfirmed("has_child", "true")])).toHaveLength(0)
  })

  it("does not treat a negative answer as yes", () => {
    for (const value of ["false", "no", "nein", ""]) {
      expect(
        anlagenForConfirmedFacts(2025, [confirmed("has_child", value)]),
        value,
      ).toHaveLength(0)
    }
  })

  it("activates exactly the Anlage a confirmed fact supports", () => {
    const anlagen = anlagenForConfirmedFacts(2025, [confirmed("has_child", "true")])
    expect(anlagen.map((a) => a.id)).toEqual(["anlage-kind"])
  })

  it("activates several Anlagen when several facts are confirmed", () => {
    const anlagen = anlagenForConfirmedFacts(2025, [
      confirmed("has_employment_income", "true"),
      confirmed("has_child", "ja"),
    ])
    expect(anlagen.map((a) => a.id).sort()).toEqual(["anlage-kind", "anlage-n"])
  })

  it("activates nothing for a year with no verified Anlagen set", () => {
    expect(anlagenForConfirmedFacts(2026, [confirmed("has_child", "true")])).toHaveLength(0)
  })

  it("exposes every activator key for the UI's question list", () => {
    expect(STEUER_ANLAGE_ACTIVATOR_KEYS).toContain("has_child")
    expect(new Set(STEUER_ANLAGE_ACTIVATOR_KEYS).size).toBe(STEUER_ANLAGE_ACTIVATOR_KEYS.length)
  })

  it("cites an official source for every Anlage", () => {
    for (const definition of STEUER_YEAR_DEFINITIONS) {
      for (const anlage of definition.anlagen) {
        expect(anlage.officialSource, anlage.id).toMatch(/^https:\/\//)
        expect(anlage.formId, anlage.id).toMatch(/_25$/)
      }
    }
  })

  it("never asserts eligibility, an amount or a deadline in any Anlage entry", () => {
    const serialized = JSON.stringify(STEUER_YEAR_DEFINITIONS)
    for (const forbidden of ["eligible", "refund", "Erstattung", "Anspruch", "Frist"]) {
      expect(serialized.includes(forbidden), forbidden).toBe(false)
    }
  })
})

describe("approval binds to the exact generated form content", () => {
  async function draftFor(body: string): Promise<CaseDraft> {
    const contentHash = await computeContentHash(
      buildApprovalPayload({ subject: "Amtliches Formular ESt 1 A", body, recipient: null }),
    )
    return {
      id: "draft-tax-1",
      caseId: "case-tax-1",
      version: 1,
      subject: "Amtliches Formular ESt 1 A",
      body,
      recipient: null,
      contentHash,
      reviewStatus: "pass",
      model: "horizon-pdf-form-engine",
      createdAt: "2026-06-15T00:00:00.000Z",
    }
  }

  const approvalFor = (draft: CaseDraft, hash = draft.contentHash): CaseApproval => ({
    id: "appr-tax-1",
    caseId: draft.caseId,
    draftId: draft.id,
    approvedHash: hash,
    approvedAt: "2026-06-15T00:00:00.000Z",
  })

  it("releases a form draft whose current content is approved", async () => {
    const draft = await draftFor("ESt 1 A, Steuerjahr 2025")
    const release = assessDraftRelease({ draft, missing: null, approvals: [approvalFor(draft)] })
    expect(release.releasable).toBe(true)
  })

  it("blocks release when the content changed after approval", async () => {
    const approved = await draftFor("ESt 1 A, Steuerjahr 2025")
    const edited = await draftFor("ESt 1 A, Steuerjahr 2025, geändert")
    const release = assessDraftRelease({
      draft: edited,
      missing: null,
      approvals: [approvalFor(approved)],
    })
    expect(release.releasable).toBe(false)
    expect(release.approvalInvalidated).toBe(true)
    expect(release.blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
  })

  it("blocks release when there is no approval at all", async () => {
    const draft = await draftFor("ESt 1 A, Steuerjahr 2025")
    const release = assessDraftRelease({ draft, missing: null, approvals: [] })
    expect(release.releasable).toBe(false)
  })

  it("refuses an approval whose bound hash does not match the draft", async () => {
    const draft = await draftFor("ESt 1 A, Steuerjahr 2025")
    const release = assessDraftRelease({
      draft,
      missing: null,
      approvals: [approvalFor(draft, "1".repeat(64))],
    })
    expect(release.releasable).toBe(false)
  })

  it("refuses approval while a critical fact is unconfirmed", async () => {
    const draft = await draftFor("ESt 1 A, Steuerjahr 2025")
    const missing = {
      missingFactKeys: [],
      unconfirmedCriticalFactKeys: ["last_name"],
      complete: false,
    }
    const approval = canApproveDraft({ draft, missing })
    expect(approval.allowed).toBe(false)
    expect(approval.reason).toBe("UNCONFIRMED_FACTS")
    const release = assessDraftRelease({ draft, missing, approvals: [approvalFor(draft)] })
    expect(release.releasable).toBe(false)
    expect(release.blockers).toContain("UNCONFIRMED_FACTS")
  })

  it("blocks release while required facts are missing", async () => {
    const draft = await draftFor("ESt 1 A, Steuerjahr 2025")
    const missing = { missingFactKeys: ["last_name"], unconfirmedCriticalFactKeys: [], complete: false }
    const release = assessDraftRelease({ draft, missing, approvals: [approvalFor(draft)] })
    expect(release.releasable).toBe(false)
    expect(release.blockers).toContain("MISSING_INFORMATION")
  })
})

describe("the manifest body carries the year and hash the approval covers", () => {
  const template = findTemplateById("fms-2025-est-1-a")!

  it("records the tax year, template hash and output hash", async () => {
    const manifest = buildManifest({
      template,
      mappingVersion: "horizon-pdf-mapping-v1",
      caseId: "case-tax-1",
      generatedAt: "2026-06-15T00:00:00.000Z",
      assignments: [{ fieldName: "last_name", kind: "text", value: "Musterfrau" }],
      blanks: [],
      outputSha256: "a".repeat(64),
    })
    const body = renderManifestBody(manifest)
    expect(body).toContain("Steuerjahr: 2025")
    expect(body).toContain(template.sourceSha256)
    expect(body).toContain("a".repeat(64))
  })

  it("reads the output hash back out of the body it rendered", async () => {
    const manifest = buildManifest({
      template,
      mappingVersion: "horizon-pdf-mapping-v1",
      caseId: "case-tax-1",
      generatedAt: "2026-06-15T00:00:00.000Z",
      assignments: [],
      blanks: [],
      outputSha256: "b".repeat(64),
    })
    expect(readFormOutputSha(renderManifestBody(manifest))).toBe("b".repeat(64))
  })

  it("returns null for a body that carries no form hash", () => {
    expect(readFormOutputSha("Kündigung ohne Formular-Hash")).toBeNull()
    expect(readFormOutputSha("Ausgabe-SHA-256: nicht-hex")).toBeNull()
  })

  it("is deterministic, so a rerun cannot invalidate an approval", () => {
    const input = {
      template,
      mappingVersion: "horizon-pdf-mapping-v1",
      caseId: "case-tax-1",
      generatedAt: "2026-06-15T00:00:00.000Z",
      assignments: [{ fieldName: "last_name", kind: "text" as const, value: "Musterfrau" }],
      blanks: [],
      outputSha256: "c".repeat(64),
    }
    expect(renderManifestBody(buildManifest(input))).toBe(renderManifestBody(buildManifest(input)))
  })
})

describe("signature requires a current approval and a verified placement", () => {
  it("has a verified placement for the ESt 1 A, bound to its exact bytes and year", () => {
    const template = findTemplateById("fms-2025-est-1-a")!
    const placement = signaturePlacementForTemplate({
      templateId: template.id,
      templateSourceSha256: template.sourceSha256,
      taxYear: 2025,
    })
    expect(placement).not.toBeNull()
  })

  it("offers no placement for a template whose area was never measured", () => {
    expect(templateSupportsSignature("fms-2025-anlage-n")).toBe(false)
    expect(templateSupportsSignature("does-not-exist")).toBe(false)
  })

  it("refuses a placement whose template hash does not match", () => {
    expect(
      signaturePlacementForTemplate({
        templateId: "fms-2025-est-1-a",
        templateSourceSha256: "0".repeat(64),
        taxYear: 2025,
      }),
    ).toBeNull()
  })

  it("refuses a placement whose year does not match the template's", () => {
    const template = findTemplateById("fms-2025-est-1-a")!
    expect(
      signaturePlacementForTemplate({
        templateId: template.id,
        templateSourceSha256: template.sourceSha256,
        taxYear: 2026,
      }),
    ).toBeNull()
  })

  it("exposes placements only for templates that were actually verified", () => {
    const signable = steuerSignableTemplateIds()
    expect(signable).toEqual(["fms-2025-est-1-a"])
    for (const id of signable) expect(templateSupportsSignature(id)).toBe(true)
  })

  it("reports no visual signature type beyond VISUAL", () => {
    // Guards against the visual engine being presented as a qualified signature.
    const copy = JSON.stringify(steuerCopy)
    for (const forbidden of ["QES", "PAdES", "qualifiziert", "advanced"]) {
      expect(copy.includes(forbidden), forbidden).toBe(false)
    }
  })
})

describe("no ELSTER execution path exists", () => {
  it("states in both languages that HORIZON does not transmit anything", () => {
    for (const locale of ["de", "bg"] as const) {
      const text = getSteuerCopy(locale).noElsterNote
      expect(text.length, locale).toBeGreaterThan(0)
      expect(text, locale).toMatch(/ELSTER/)
    }
    expect(getSteuerCopy("de").noElsterNote).toMatch(/übermittelt nichts/)
    expect(getSteuerCopy("bg").noElsterNote).toMatch(/не подава/)
  })

  it("records the online route as information, not as an integration", () => {
    for (const definition of STEUER_YEAR_DEFINITIONS) {
      expect(definition.officialOnline.url).toMatch(/^https:\/\/www\.elster\.de\//)
      // The registry carries a URL and a label only: there is no credential,
      // certificate, mandate or transmission field to misuse.
      expect(Object.keys(definition.officialOnline).sort()).toEqual(["label", "url"])
    }
  })

  it("carries no certificate, key or password field anywhere in the registry", () => {
    const serialized = JSON.stringify(STEUER_YEAR_DEFINITIONS) + JSON.stringify(TAX_YEAR_AVAILABILITY)
    for (const forbidden of ["pfx", "certificate", "privateKey", "password", "zertifikat"]) {
      expect(serialized.toLowerCase().includes(forbidden.toLowerCase()), forbidden).toBe(false)
    }
  })
})

describe("no tax result or refund is fabricated", () => {
  it("contains no calculation or amount field in the registry", () => {
    const serialized = JSON.stringify(STEUER_YEAR_DEFINITIONS)
    for (const forbidden of ["refund", "erstattung", "steuerbetrag", "berechnung", "threshold"]) {
      expect(serialized.toLowerCase().includes(forbidden), forbidden).toBe(false)
    }
  })

  it("does not carry a 2025 threshold or amount into any year entry", () => {
    for (const definition of STEUER_YEAR_DEFINITIONS) {
      for (const form of definition.forms) {
        expect(typeof form.support).toBe("string")
        for (const key of form.mappableFactKeys) {
          // Only identity keys are mappable: no amount-bearing fact is offered.
          expect(key, key).toMatch(/^[a-z_]+$/)
          expect(key, key).not.toMatch(/amount|betrag|summe|refund/)
        }
      }
    }
  })

  it("keeps copy free of any promised refund or entitlement", () => {
    const copy = JSON.stringify(steuerCopy)
    for (const forbidden of ["Erstattung", "Rückzahlung", "Anspruch auf", "garantiert"]) {
      expect(copy.includes(forbidden), forbidden).toBe(false)
    }
  })
})

describe("owner-scoped access is preserved", () => {
  it("builds a storage path under the acting owner's prefix", () => {
    const path = caseDocumentStoragePath({
      ownerId: "owner-a",
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "ESt_1_A_2025.pdf",
    })
    expect(path.startsWith("owner-a/")).toBe(true)
    // The owner prefix is the first path segment, so a different owner's read
    // policy cannot match this object.
    expect(path.split("/")[0]).toBe("owner-a")
  })

  it("produces a different path for a different owner, so objects cannot collide", () => {
    const a = caseDocumentStoragePath({
      ownerId: "owner-a",
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "f.pdf",
    })
    const b = caseDocumentStoragePath({
      ownerId: "owner-b",
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "f.pdf",
    })
    expect(a).not.toBe(b)
  })
})

describe("copy is complete in both active languages", () => {
  it("has identical key sets in de and bg", () => {
    const deKeys = Object.keys(steuerCopy.de).sort()
    const bgKeys = Object.keys(steuerCopy.bg).sort()
    expect(bgKeys).toEqual(deKeys)
  })

  it("has no empty string in either language", () => {
    for (const locale of ["de", "bg"] as const) {
      for (const [key, value] of Object.entries(steuerCopy[locale])) {
        if (typeof value === "string") expect(value.length, `${locale}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it("labels every tax-year state in both languages", () => {
    for (const locale of ["de", "bg"] as const) {
      for (const state of ["supported", "not_yet_published", "out_of_scope"] as const) {
        expect(getSteuerCopy(locale).yearStates[state].length, `${locale}.${state}`).toBeGreaterThan(0)
      }
    }
  })

  it("names the module in German as printed on the authority's pages", () => {
    expect(getSteuerCopy("de").heading).toBe("Steuererklärung")
    expect(getSteuerCopy("bg").heading).toBe("Данъчна декларация")
  })
})
