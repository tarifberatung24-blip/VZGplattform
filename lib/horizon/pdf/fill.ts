/**
 * P9 — official PDF form fill engine.
 *
 * This module decides *whether* a form can be generated and *what* values would
 * be written. It performs no I/O and constructs no PDF bytes, which is what
 * makes the safety rules testable: the refusal paths are ordinary return values
 * rather than exceptions raised deep inside a writer.
 *
 * Four rules are enforced here, and each has a test:
 *
 * 1. **Nothing is inferred.** A field is assigned only from a fact that exists
 *    *and* is confirmed. An unconfirmed fact and an absent fact both leave the
 *    field blank; they are reported with different reasons so the user can tell
 *    "we have this but you have not confirmed it" from "we do not have this".
 * 2. **Nothing is guessed into existence.** A mapping naming a field that the
 *    template does not actually contain is a hard failure, never a silent skip.
 *    This is what prevents a mapping being carried across tax years onto a
 *    differently-shaped form.
 * 3. **Unsupported formats are refused, not approximated.** An XFA template is
 *    reported as unsupported and a static template as not fillable. Neither
 *    produces a partially-filled document that would look like success.
 * 4. **A blank is honest.** The result always reports how many fields were
 *    filled and which were left blank, so a mostly-empty form cannot be mistaken
 *    for a completed one.
 *
 * There is no fallback that writes text at coordinates. An overlay would place
 * values at positions this codebase has not verified against the official
 * template, which is inference with extra steps; the engine refuses instead and
 * routes the user to the official printable path.
 */

import type { OfficialPdfTemplate, PdfFormCapability } from "./registry"

/** Why a mapped field was left blank. */
export const PDF_BLANK_REASONS = [
  /** The fact is not present in the case at all. */
  "fact_absent",
  /** The fact exists but the user has not confirmed it. */
  "fact_unconfirmed",
  /** The fact is present and confirmed but has no usable value. */
  "value_empty",
] as const
export type PdfBlankReason = (typeof PDF_BLANK_REASONS)[number]

export const PDF_REFUSAL_CODES = [
  "template_not_found",
  "tax_year_mismatch",
  "source_hash_mismatch",
  "unsupported_xfa",
  "not_fillable",
  "unknown_field",
  "capability_unknown",
] as const
export type PdfRefusalCode = (typeof PDF_REFUSAL_CODES)[number]

export type PdfFact = {
  key: string
  value: string | null
  /** ISO timestamp, or null when the user has not confirmed the fact. */
  confirmedAt: string | null
}

/**
 * One fact→field assignment. `fieldName` must be an AcroForm field name that
 * exists in the template; it is never a coordinate or a row number, because
 * those are exactly the values that change between tax years.
 */
export type PdfFieldMapping = {
  fieldName: string
  factKey: string
  /** `text` for AcroForm text fields; `checkbox`/`radio` for button fields. */
  kind: "text" | "checkbox" | "radio"
  /** For checkbox/radio: the value that selects this field. */
  selectValue?: string
  /** Required for radio fields: the exported value to set. */
  exportValue?: string
}

export type PdfFieldAssignment = {
  fieldName: string
  kind: PdfFieldMapping["kind"]
  value: string | boolean
}

export type PdfBlankField = {
  fieldName: string
  factKey: string
  reason: PdfBlankReason
}

export type PdfFillPlan =
  | {
      ok: true
      assignments: PdfFieldAssignment[]
      blanks: PdfBlankField[]
      filledCount: number
      blankCount: number
    }
  | { ok: false; code: PdfRefusalCode; detail?: string }

/**
 * The template's real field inventory, as reported by the PDF reader.
 * `null` means the reader found no interactive form at all.
 */
export type TemplateInspection = {
  capability: PdfFormCapability
  /** AcroForm field names present in the template. */
  fieldNames: readonly string[]
}

/**
 * Refuses generation when the template format cannot be written.
 *
 * The capability is re-derived from the file at runtime rather than trusted from
 * the registry, so a template swapped for a different revision is caught here.
 */
export function checkTemplateSupport(
  template: OfficialPdfTemplate,
  inspection: TemplateInspection,
): PdfFillPlan | null {
  if (inspection.capability === "xfa") {
    return {
      ok: false,
      code: "unsupported_xfa",
      detail:
        "Dieses Formular ist ein XFA-Formular und wird nicht unterstützt. Bitte das amtliche Formular manuell ausfüllen.",
    }
  }
  if (inspection.capability === "static") {
    return {
      ok: false,
      code: "not_fillable",
      detail:
        "Dieses amtliche PDF enthält keine ausfüllbaren Felder. Bitte das amtliche Formular manuell ausfüllen oder den amtlichen Online-Dienst nutzen.",
    }
  }
  if (inspection.capability !== "acroform") {
    return { ok: false, code: "capability_unknown" }
  }
  if (inspection.fieldNames.length === 0) {
    // Claimed AcroForm but exposes no fields: treat as not fillable rather than
    // producing an unchanged copy that would look generated.
    return { ok: false, code: "not_fillable" }
  }
  void template
  return null
}

/**
 * Builds the fill plan. Returns a refusal instead of throwing so the caller can
 * tell the user precisely why nothing was generated.
 */
export function planPdfFill(input: {
  template: OfficialPdfTemplate
  inspection: TemplateInspection
  /** Tax year the case is being generated for. */
  taxYear: number | null
  mappings: readonly PdfFieldMapping[]
  facts: readonly PdfFact[]
  /** Facts the user explicitly confirmed for this generation. */
  confirmedFactKeys: readonly string[]
}): PdfFillPlan {
  const { template, inspection, mappings, facts } = input

  const refusal = checkTemplateSupport(template, inspection)
  if (refusal) return refusal

  // A tax form must not be generated for a year the registry has not verified.
  if (template.taxYear !== null && input.taxYear !== template.taxYear) {
    return {
      ok: false,
      code: "tax_year_mismatch",
      detail: `Dieses Formular gilt für ${template.taxYear}. Für ${input.taxYear ?? "das gewählte Jahr"} liegt keine geprüfte amtliche Vorlage vor.`,
    }
  }

  const confirmed = new Set(input.confirmedFactKeys)
  const present = new Set(inspection.fieldNames)
  const factByKey = new Map(facts.map((fact) => [fact.key, fact]))

  const assignments: PdfFieldAssignment[] = []
  const blanks: PdfBlankField[] = []

  for (const mapping of mappings) {
    if (!present.has(mapping.fieldName)) {
      // Hard failure: the mapping references a field this template does not have.
      return { ok: false, code: "unknown_field", detail: mapping.fieldName }
    }

    const fact = factByKey.get(mapping.factKey)
    if (!fact) {
      blanks.push({ fieldName: mapping.fieldName, factKey: mapping.factKey, reason: "fact_absent" })
      continue
    }
    if (!fact.confirmedAt || !confirmed.has(mapping.factKey)) {
      blanks.push({
        fieldName: mapping.fieldName,
        factKey: mapping.factKey,
        reason: "fact_unconfirmed",
      })
      continue
    }

    const raw = fact.value
    if (raw === null || raw.trim() === "") {
      blanks.push({ fieldName: mapping.fieldName, factKey: mapping.factKey, reason: "value_empty" })
      continue
    }

    if (mapping.kind === "text") {
      assignments.push({ fieldName: mapping.fieldName, kind: "text", value: raw })
      continue
    }

    // Checkbox and radio values are set from the mapping's declared literals,
    // never parsed from free text: "ja"/"yes"/"x" must not be guessed.
    if (mapping.kind === "checkbox") {
      if (mapping.selectValue === undefined) {
        return { ok: false, code: "unknown_field", detail: mapping.fieldName }
      }
      if (raw === mapping.selectValue) {
        assignments.push({ fieldName: mapping.fieldName, kind: "checkbox", value: true })
      } else {
        // A confirmed fact that does not select this option leaves it untouched.
        blanks.push({
          fieldName: mapping.fieldName,
          factKey: mapping.factKey,
          reason: "value_empty",
        })
      }
      continue
    }

    if (mapping.exportValue === undefined) {
      return { ok: false, code: "unknown_field", detail: mapping.fieldName }
    }
    if (raw === mapping.selectValue) {
      assignments.push({
        fieldName: mapping.fieldName,
        kind: "radio",
        value: mapping.exportValue,
      })
    } else {
      blanks.push({
        fieldName: mapping.fieldName,
        factKey: mapping.factKey,
        reason: "value_empty",
      })
    }
  }

  return {
    ok: true,
    assignments,
    blanks,
    filledCount: assignments.length,
    blankCount: blanks.length,
  }
}

/**
 * Whether a plan is safe to present as a generated document. A plan that filled
 * nothing is refused: producing an unchanged copy of an official form and
 * calling it generated would misrepresent what the user is about to review.
 */
export function planIsGeneratable(plan: PdfFillPlan): boolean {
  return plan.ok && plan.filledCount > 0
}