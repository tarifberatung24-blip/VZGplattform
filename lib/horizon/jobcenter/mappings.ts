/**
 * P13 — fact→field mappings for Jobcenter (SGB II) templates.
 *
 * Separate from both the tax mapping registry (tax-year scoped) and the Agentur
 * mapping table, because these forms are neither: they carry no tax year and they
 * use plain, stable AcroForm names rather than XFA-style paths.
 *
 * Every field name below was read from the exact bytes of the shipped template via
 * the PDF reader. Only heading/identity facts that the user must supply anyway are
 * mapped — no eligibility, no amount, no value that represents a decision the
 * authority makes.
 *
 * Button widgets (checkboxes, radios) are deliberately not mapped. Their export
 * values exist, but which one applies depends on interpreting the user's
 * situation rather than reading their evidence, so they are left blank and the UI
 * says so. A wrong checkbox on a benefit application is worse than a blank one.
 */

import type { PdfFieldMapping } from "@/lib/horizon/pdf/fill"

/**
 * Fields common to the person completing the form.
 *
 * Both the Hauptantrag and the WBA name these identically, so they are defined
 * once and reused rather than duplicated with a chance of drifting apart.
 */
const PERSON_FIELDS: readonly PdfFieldMapping[] = [
  { fieldName: "txtfPersonVorname", factKey: "person_first_name", kind: "text" },
  { fieldName: "txtfPersonNachname", factKey: "person_last_name", kind: "text" },
  { fieldName: "datePersonGebDatum", factKey: "person_birth_date", kind: "text" },
]

const ADDRESS_FIELDS: readonly PdfFieldMapping[] = [
  { fieldName: "txtfPersonStr", factKey: "applicant_street", kind: "text" },
  { fieldName: "txtfPersonHausNr", factKey: "applicant_house_number", kind: "text" },
  { fieldName: "txtfPersonPlz", factKey: "applicant_postal_code", kind: "text" },
  { fieldName: "txtfPersonOrt", factKey: "applicant_city", kind: "text" },
]

/**
 * Hauptantrag (HA) — first application for Grundsicherungsgeld.
 *
 * Section headings only: identity, address, and the signature date. The
 * application's substantive sections (income, housing, assets, household) are
 * handled by the Anlagen, which HORIZON links to rather than fills.
 */
export const JOBCENTER_HAUPTANTRAG_MAPPING: readonly PdfFieldMapping[] = [
  ...PERSON_FIELDS,
  { fieldName: "txtfPersonGebName", factKey: "person_birth_name", kind: "text" },
  ...ADDRESS_FIELDS,
  { fieldName: "txtfPersonTel", factKey: "person_phone", kind: "text" },
  { fieldName: "txtfKontoIBAN", factKey: "bank_iban", kind: "text" },
  { fieldName: "dateUnterschriftPerson", factKey: "signature_date", kind: "text" },
]

/**
 * Weiterbewilligungsantrag (WBA) — continuation application.
 *
 * Narrows to what a continuation actually needs: the same identity/address block,
 * the applicant's Bedarfsgemeinschaft number, the period the form covers, and the
 * signature date. The benefit-number field is mapped to `bg_number` and stays
 * blank unless the user has confirmed it from their own documents.
 */
export const JOBCENTER_WBA_MAPPING: readonly PdfFieldMapping[] = [
  { fieldName: "txtfWBAZeitraum", factKey: "wba_period", kind: "text" },
  ...PERSON_FIELDS,
  { fieldName: "txtfBGNr", factKey: "bg_number", kind: "text" },
  ...ADDRESS_FIELDS,
  { fieldName: "dateUnterschriftPerson", factKey: "signature_date", kind: "text" },
]

/** Template id → the mappings verified for that template. */
export const JOBCENTER_TEMPLATE_MAPPINGS: Readonly<Record<string, readonly PdfFieldMapping[]>> = {
  "jobcenter-hauptantrag": JOBCENTER_HAUPTANTRAG_MAPPING,
  "jobcenter-weiterbewilligung": JOBCENTER_WBA_MAPPING,
}

/**
 * Mappings for a Jobcenter template. An unknown template returns none, so a
 * mapping can never leak between forms.
 */
export function jobcenterMappingsForTemplate(templateId: string): readonly PdfFieldMapping[] {
  return JOBCENTER_TEMPLATE_MAPPINGS[templateId] ?? []
}

export function hasJobcenterMappings(templateId: string): boolean {
  return (JOBCENTER_TEMPLATE_MAPPINGS[templateId]?.length ?? 0) > 0
}

export function jobcenterMappedTemplateIds(): readonly string[] {
  return Object.keys(JOBCENTER_TEMPLATE_MAPPINGS)
}
