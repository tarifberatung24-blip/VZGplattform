"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { findTemplateById, PDF_MAPPING_VERSION, templatesForTaxYear } from "./registry"
import { planPdfFill, planIsGeneratable, type PdfFact } from "./fill"
import { buildManifest, renderManifestBody, renderManifestSubject } from "./manifest"
import { inspectTemplate } from "./source"
import { readTemplateBytes, readAcroFormFieldNames, writerAvailability } from "./writer"
import { mappingsForTemplate } from "./mappings"

export type PdfGenerationState = {
  status:
    | "draft_created"
    | "template_not_found"
    | "tax_year_required"
    | "source_hash_mismatch"
    | "unsupported_xfa"
    | "not_fillable"
    | "unknown_field"
    | "nothing_to_fill"
    | "case_not_found"
    | "failed"
    | null
  detail: string | null
  /** Set when the form cannot be produced and the user must use the official path. */
  manualPath: string | null
}

function resolveContext(formData: FormData): { caseId: string | null; locale: Locale } {
  const rawCaseId = formData.get("caseId")
  const rawLocale = formData.get("locale")
  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale
  return {
    caseId: typeof rawCaseId === "string" && rawCaseId.length > 0 ? rawCaseId : null,
    locale,
  }
}

/**
 * P9 — prepare an official form for review.
 *
 * This produces a *manifest draft*, not a filled PDF. The manifest records the
 * template, its official source and hash, the mapping version, every value that
 * would be written and every field left blank. Saving it through the P8 draft
 * path is what binds approval to these exact inputs: the draft's content hash
 * covers the manifest, so approving the draft in the existing review panel
 * approves this generation and nothing else.
 *
 * Generation is refused, with the reason reported, when the template is XFA, is
 * a static printable form with no fields, or cannot be produced because no PDF
 * writer is installed. The `manualPath` is supplied in those cases so the user
 * has a real alternative rather than a dead end.
 */
export async function prepareOfficialForm(
  _previous: PdfGenerationState,
  formData: FormData,
): Promise<PdfGenerationState> {
  const { caseId, locale } = resolveContext(formData)
  const rawTemplateId = formData.get("templateId")
  const rawTaxYear = formData.get("taxYear")

  if (!caseId) return { status: "case_not_found", detail: null, manualPath: null }
  if (typeof rawTemplateId !== "string") {
    return { status: "template_not_found", detail: null, manualPath: null }
  }

  const template = findTemplateById(rawTemplateId)
  if (!template) return { status: "template_not_found", detail: null, manualPath: null }

  const taxYear =
    typeof rawTaxYear === "string" && /^\d{4}$/.test(rawTaxYear) ? Number(rawTaxYear) : null

  const engine = await createCaseEngine()
  if (!engine.repository) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }

  const loaded = await readTemplateBytes(template.path)
  if (!loaded.ok) {
    return { status: "template_not_found", detail: loaded.detail, manualPath: template.officialSource }
  }

  const fieldNames = await readAcroFormFieldNames(loaded.bytes)
  const inspected = await inspectTemplate({
    template,
    bytes: loaded.bytes,
    readerFieldNames: fieldNames,
  })

  if (!inspected.ok) {
    return {
      status: "source_hash_mismatch",
      detail: inspected.detail ?? null,
      manualPath: template.officialSource,
    }
  }

  // Facts come from the case spine. Only facts the user has confirmed carry a
  // `confirmedAt`, and only those are offered to the planner.
  const factsResult = await engine.repository.listFacts(caseId)
  if (factsResult.error) return { status: "failed", detail: factsResult.error, manualPath: null }

  const facts: PdfFact[] = (factsResult.data ?? []).map((fact) => ({
    key: fact.key,
    value: fact.value,
    confirmedAt: fact.confirmedAt,
  }))
  const confirmedFactKeys = facts.filter((fact) => fact.confirmedAt).map((fact) => fact.key)

  const plan = planPdfFill({
    template,
    inspection: inspected.inspection,
    taxYear,
    mappings: mappingsForTemplate(template.id),
    facts,
    confirmedFactKeys,
  })

  if (!plan.ok) {
    const status =
      plan.code === "unsupported_xfa"
        ? "unsupported_xfa"
        : plan.code === "not_fillable"
          ? "not_fillable"
          : plan.code === "unknown_field"
            ? "unknown_field"
            : plan.code === "tax_year_mismatch"
              ? "tax_year_required"
              : "source_hash_mismatch"
    return { status, detail: plan.detail ?? null, manualPath: template.officialSource }
  }

  if (!planIsGeneratable(plan)) {
    // Nothing confirmed to place. Creating a draft now would look like progress
    // while containing no user data.
    return {
      status: "nothing_to_fill",
      detail: null,
      manualPath: template.officialSource,
    }
  }

  const writer = writerAvailability()
  const manifest = buildManifest({
    template,
    mappingVersion: PDF_MAPPING_VERSION,
    caseId,
    generatedAt: new Date().toISOString(),
    assignments: plan.assignments,
    blanks: plan.blanks,
  })

  const saved = await engine.repository.saveDraft(caseId, {
    subject: renderManifestSubject(manifest),
    body: renderManifestBody(manifest),
    recipient: null,
    // Provenance: this draft was produced by the engine, not by an AI model.
    model: "horizon-pdf-form-engine",
    promptVersion: manifest.mappingVersion,
  })
  if (saved.error || !saved.data) {
    return { status: "failed", detail: saved.error, manualPath: null }
  }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return {
    status: "draft_created",
    detail: writer.available ? null : writer.detail,
    manualPath: writer.available ? null : template.officialSource,
  }
}

/** Templates available for a tax year, for the picker. */
export async function listTemplatesForYear(taxYear: number) {
  return templatesForTaxYear(taxYear)
}