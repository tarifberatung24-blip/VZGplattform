/**
 * P12 — fact→field mappings for Agentur-für-Arbeit templates.
 *
 * Kept separate from the tax-form mapping registry (`mappings.ts`) because that
 * one's contract is tax-year-scoped: it refuses to carry a field name from one
 * year into the next. BA forms are not tax-year-bound, so they need their own
 * table rather than a relaxation of the tax-year rule.
 *
 * Every field name below was read from the exact bytes of
 * `public/forms/BA_Veraenderungsmitteilung_Arbeitslosengeld_09-2020.pdf` via the
 * PDF reader, and each one was confirmed to exist in the writer's field list too.
 * A name that only one of the two engines knew would be a latent mismatch, so the
 * two were compared before this table was written.
 *
 * Only facts with real evidence on the case are mapped. A change-report form is
 * only as honest as the fields it fills: mapping a fact the user never confirmed
 * would put a guessed value onto an official document sent to an authority.
 */

import type { PdfFieldMapping } from "@/lib/horizon/pdf/fill"

/**
 * Shared field-name prefix.
 *
 * The BA template names its widgets with a full XFA-style path. The mapping below
 * therefore records the exact path, not a suffix: matching on a suffix would also
 * match a different subform's field of the same name, which is precisely the kind
 * of over-matching that puts a value in the wrong box.
 */
const V = "Veraenderungsmitteilung[0].Seite1[0]"

/**
 * Field name and value shape for the Veränderungsmitteilung.
 *
 * The `kind: "text"` entries are the applicant/heading fields. Checkbox and
 * radio widgets on this form are deliberately *not* mapped here: their export
 * values were read (`/Off`, `/1`, `/0`, `/2`, `/3`) but no confirmed case fact
 * currently corresponds to them, and inferring which change the user is reporting
 * would require interpreting their situation rather than reading their evidence.
 * They remain blank, which the UI states.
 */
export const AGENTUR_VERAENDERUNGSMITTEILUNG_MAPPING: readonly PdfFieldMapping[] = [
  { fieldName: `${V}.Vorname[0]`, factKey: "person_first_name", kind: "text" },
  { fieldName: `${V}.Name[0]`, factKey: "person_last_name", kind: "text" },
  { fieldName: `${V}.Geburtsdatum[0]`, factKey: "person_birth_date", kind: "text" },
  { fieldName: `${V}.Kunden-Nr[0]`, factKey: "customer_number", kind: "text" },
  { fieldName: `${V}.AgenturFuerArbeit[0]`, factKey: "recipient_institution", kind: "text" },
  { fieldName: `${V}.PLZ-Ort[0]`, factKey: "applicant_postal_city", kind: "text" },
  { fieldName: `${V}.TeilformularUnterschrift[0].Datum[0]`, factKey: "signature_date", kind: "text" },
]

/** Template id → the mappings verified for that template. */
export const AGENTUR_TEMPLATE_MAPPINGS: Readonly<Record<string, readonly PdfFieldMapping[]>> = {
  "ba-veraenderungsmitteilung-alg": AGENTUR_VERAENDERUNGSMITTEILUNG_MAPPING,
}

/**
 * Mappings for an Agentur template. An unknown template returns none, so a
 * mapping can never leak between forms.
 */
export function agenturMappingsForTemplate(templateId: string): readonly PdfFieldMapping[] {
  return AGENTUR_TEMPLATE_MAPPINGS[templateId] ?? []
}

export function hasAgenturMappings(templateId: string): boolean {
  return (AGENTUR_TEMPLATE_MAPPINGS[templateId]?.length ?? 0) > 0
}

export function agenturMappedTemplateIds(): readonly string[] {
  return Object.keys(AGENTUR_TEMPLATE_MAPPINGS)
}
