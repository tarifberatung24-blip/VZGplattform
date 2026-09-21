"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { caseDocumentStoragePath } from "@/lib/horizon/intake/document"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { findTemplateById, templatesForTaxYear } from "./registry"
import { planPdfFill, type PdfBlankField, type PdfFact } from "./fill"
import { buildManifest, renderManifestBody, renderManifestSubject } from "./manifest"
import { inspectTemplate, computeSha256 } from "./source"
import {
  readTemplateBytes,
  readAcroFormFieldNames,
  createTextMeasurer,
  generateOverlayPdf,
  generateAcroFormPdf,
} from "./writer"
import { mappingsForTemplate } from "./mappings"
import { agenturMappingsForTemplate, hasAgenturMappings } from "@/lib/horizon/agentur/mappings"
import { jobcenterMappingsForTemplate, hasJobcenterMappings } from "@/lib/horizon/jobcenter/mappings"
import { planOverlayFill } from "./overlay-fill"
import { staticMappingForTemplate } from "./overlay-map"

export type PdfGenerationState = {
  status:
    | "draft_created"
    | "template_not_found"
    | "tax_year_required"
    | "source_hash_mismatch"
    | "unsupported_xfa"
    | "not_fillable"
    | "unknown_field"
    | "no_verified_mapping"
    | "value_too_wide"
    | "unsupported_format_value"
    | "nothing_to_fill"
    | "case_not_found"
    | "storage_unavailable"
    | "failed"
    | null
  detail: string | null
  /** Set when the form cannot be produced and the user must use the official path. */
  manualPath: string | null
}

/**
 * Private bucket holding case documents. Generated official forms are stored here
 * as well: the bucket is not publicly readable and its policies grant access only
 * within the owner's own path prefix, so an object written under
 * `{ownerId}/{caseId}/...` is private and owner-scoped by the same rule the intake
 * path already relies on.
 */
const CASE_DOCUMENT_BUCKET = "source-documents"

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
 * P9 — generate an official form, store it privately, and queue it for review.
 *
 * The official template's bytes are never modified: they are read, hashed, and
 * written into a *new* artifact. Provenance for that artifact (authority, official
 * source, form name and Form-ID, tax year, template SHA-256, mapping version,
 * confirmed inputs, output SHA-256, case id and timestamp) is recorded in the
 * manifest, and the manifest is saved as the draft body so P8's content-hash
 * approval binds approval to these exact inputs. No second approval system.
 *
 * Generation is refused, with the reason reported and a link to the official form
 * offered, when the template cannot be filled: XFA, a static template with no
 * measured coordinates, an oversized value, or a value that does not match its
 * declared format. Nothing is truncated, substituted or inferred.
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
  if (!engine.repository || !engine.userId) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }
  const userId = engine.userId

  const owned = await engine.repository.getMine(caseId)
  if (owned.error || !owned.data) {
    return { status: "case_not_found", detail: null, manualPath: null }
  }

  const loaded = await readTemplateBytes(template.path)
  if (!loaded.ok) {
    return {
      status: "template_not_found",
      detail: loaded.detail,
      manualPath: template.officialSource,
    }
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
  // `confirmedAt`, and only those are offered to the planners.
  const factsResult = await engine.repository.listFacts(caseId)
  if (factsResult.error) return { status: "failed", detail: factsResult.error, manualPath: null }

  const facts: PdfFact[] = (factsResult.data ?? []).map((fact) => ({
    key: fact.key,
    value: fact.value,
    confirmedAt: fact.confirmedAt,
  }))
  const confirmedFactKeys = facts.filter((fact) => fact.confirmedAt).map((fact) => fact.key)

  const staticMapping = staticMappingForTemplate(template.id)
  const agenturMapping = hasAgenturMappings(template.id)
  const jobcenterMapping = hasJobcenterMappings(template.id)
  const acroFormMapping = agenturMapping
    ? agenturMappingsForTemplate(template.id)
    : jobcenterMapping
      ? jobcenterMappingsForTemplate(template.id)
      : mappingsForTemplate(template.id)
  const mappingVersion =
    staticMapping?.mappingVersion ??
    (agenturMapping
      ? "agentur-acroform-v1"
      : jobcenterMapping
        ? "jobcenter-acroform-v1"
        : "acroform-v1")
  const generatedAt = new Date().toISOString()

  let assignments: { fieldName: string; kind: "text"; value: string }[] = []
  let blanks: PdfBlankField[] = []
  let outputBytes: Uint8Array

  if (inspected.inspection.capability === "xfa") {
    return { status: "unsupported_xfa", detail: null, manualPath: template.officialSource }
  }

  if (inspected.inspection.capability === "acroform") {
    // Path A — the template exposes real AcroForm fields, so values are written by
    // field name. A mapping naming a field the template does not contain is refused.
    const plan = planPdfFill({
      template,
      inspection: inspected.inspection,
      taxYear,
      mappings: acroFormMapping,
      facts,
      confirmedFactKeys,
    })
    if (!plan.ok) {
      const status =
        plan.code === "not_fillable"
          ? "not_fillable"
          : plan.code === "unknown_field"
            ? "unknown_field"
            : plan.code === "tax_year_mismatch"
              ? "tax_year_required"
              : "source_hash_mismatch"
      return { status, detail: plan.detail ?? null, manualPath: template.officialSource }
    }
    if (plan.filledCount === 0) {
      return { status: "nothing_to_fill", detail: null, manualPath: template.officialSource }
    }

    const written = await generateAcroFormPdf({
      templateBytes: loaded.bytes,
      assignments: plan.assignments,
      flatten: true,
    })
    if (!written.ok) {
      return { status: "failed", detail: written.detail, manualPath: template.officialSource }
    }
    outputBytes = written.bytes
    assignments = plan.assignments.map((assignment) => ({
      fieldName: assignment.fieldName,
      kind: "text" as const,
      value: String(assignment.value),
    }))
    blanks = plan.blanks
  } else {
    // Path B — a verified static official template. Coordinates are bound to this
    // template's source SHA-256 and tax year, so a set measured for another
    // revision or year is refused rather than drawn.
    if (!staticMapping) {
      return { status: "no_verified_mapping", detail: null, manualPath: template.officialSource }
    }

    const measure = await createTextMeasurer()
    const overlay = planOverlayFill({
      mapping: staticMapping,
      templateSourceSha256: template.sourceSha256,
      taxYear,
      facts,
      confirmedFactKeys,
      measure,
    })
    if (!overlay.ok) {
      const status =
        overlay.code === "tax_year_mismatch"
          ? "tax_year_required"
          : overlay.code === "value_too_wide"
            ? "value_too_wide"
            : overlay.code === "source_hash_mismatch"
              ? "source_hash_mismatch"
              : overlay.code === "unsupported_format_value"
                ? "unsupported_format_value"
                : "nothing_to_fill"
      return { status, detail: overlay.detail ?? null, manualPath: template.officialSource }
    }

    const written = await generateOverlayPdf({
      templateBytes: loaded.bytes,
      mapping: staticMapping,
      plan: overlay,
      shade: true,
    })
    if (!written.ok) {
      return { status: "failed", detail: written.detail, manualPath: template.officialSource }
    }
    outputBytes = written.bytes
    assignments = overlay.placements.map((placement) => ({
      fieldName: placement.fieldName,
      kind: "text" as const,
      value: placement.value,
    }))
    blanks = overlay.blanks
  }

  const outputSha256 = await computeSha256(outputBytes)

  // Private, owner-scoped storage, mirroring the intake path's guarantees: the
  // object key is built from the acting user's id and the case id, and a failure to
  // record the artifact removes the object so storage and records never disagree.
  const admin = createAdminClient()
  if (!admin) {
    return { status: "storage_unavailable", detail: null, manualPath: template.officialSource }
  }

  const safeName = template.formName.replace(/[^a-zA-Z0-9]+/g, "_")
  const storagePath = caseDocumentStoragePath({
    ownerId: userId,
    caseId,
    documentId: randomUUID(),
    fileName: `${safeName}_${taxYear ?? "ohne-jahr"}.pdf`,
  })

  const uploaded = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .upload(storagePath, outputBytes, { contentType: "application/pdf", upsert: false })
  if (uploaded.error) {
    return { status: "failed", detail: uploaded.error.message, manualPath: template.officialSource }
  }

  const manifest = buildManifest({
    template,
    mappingVersion,
    caseId,
    generatedAt,
    assignments,
    blanks,
    outputSha256,
  })

  const saved = await engine.repository.saveDraft(caseId, {
    subject: renderManifestSubject(manifest),
    body: renderManifestBody(manifest),
    recipient: null,
    // Provenance: produced by the engine, not by an AI model.
    model: "horizon-pdf-form-engine",
    promptVersion: manifest.mappingVersion,
  })
  if (saved.error || !saved.data) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([storagePath])
    return { status: "failed", detail: saved.error, manualPath: null }
  }

  const audited = await engine.repository.appendAudit(caseId, "pdf_form_generated", {
    template_id: template.id,
    form_id: template.formId,
    tax_year: template.taxYear,
    source_sha256: template.sourceSha256,
    mapping_version: manifest.mappingVersion,
    output_sha256: outputSha256,
    storage_path: storagePath,
    filled_count: manifest.filledCount,
    blank_count: manifest.blankCount,
  })
  if (audited.error) {
    await admin.storage.from(CASE_DOCUMENT_BUCKET).remove([storagePath])
    return { status: "failed", detail: audited.error, manualPath: null }
  }

  revalidatePath(`/${locale}/guide/${caseId}`)
  return { status: "draft_created", detail: null, manualPath: null }
}

/** Templates available for a tax year, for the picker. */
export async function listTemplatesForYear(taxYear: number) {
  return templatesForTaxYear(taxYear)
}