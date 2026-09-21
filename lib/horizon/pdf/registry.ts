/**
 * P9 — official PDF form registry.
 *
 * Every entry describes an *original* official template that exists as bytes in
 * this repository. Nothing here is recreated from memory, and no field name,
 * coordinate or rule is written down unless it was read from the template
 * itself.
 *
 * Two integrity rules are enforced by construction:
 *
 * 1. `sourceSha256` is the hash of the actual file bytes. `verifyTemplateSource`
 *    recomputes it, so a template that is silently swapped, regenerated or
 *    edited is caught rather than quietly used.
 * 2. Entries are keyed by tax year. Tax-year-specific identifiers are never
 *    shared across years: the P15 source inventory states that 2025 Form-IDs,
 *    field labels and rules must not be carried into 2026 without independent
 *    official verification, so a missing year is a refusal, not an inheritance.
 *
 * `capability` records what the template can actually support. It is a claim
 * about the bytes, and it is re-checked at runtime before generation
 * (`inspectTemplate`) instead of being trusted.
 */

export const PDF_FORM_CAPABILITIES = ["acroform", "xfa", "static"] as const
export type PdfFormCapability = (typeof PDF_FORM_CAPABILITIES)[number]

export const PDF_AUTHORITIES = [
  "bundesfinanzverwaltung_fms",
  "bundesagentur_fuer_arbeit",
  "jobcenter",
] as const
export type PdfAuthority = (typeof PDF_AUTHORITIES)[number]

export type OfficialPdfTemplate = {
  /** Stable internal id, namespaced by authority and year. */
  id: string
  authority: PdfAuthority
  /** Official German form name as printed on the form. */
  formName: string
  /** Official FMS form identifier, e.g. `034037_25`. Null when not printed. */
  formId: string | null
  /** Official source page the template was retrieved from. */
  officialSource: string
  /** Tax year the form belongs to, or null for non-tax forms. */
  taxYear: number | null
  version: string
  /** ISO date the template was retrieved. */
  retrievalDate: string
  /** SHA-256 of the template file bytes. */
  sourceSha256: string
  /** Path within the repository. */
  path: string
  /** What the bytes support, as measured — not assumed. */
  capability: PdfFormCapability
  /**
   * Version string printed on the form itself, when the form carries one.
   *
   * Recorded separately from `version` because an official form's printed
   * revision (e.g. `GR 22 - 09/2020`) is what an authority recognises, and it is
   * not the same claim as "the revision this repository retrieved".
   */
  printedVersion?: string
  /**
   * True when the file carries an XFA packet alongside AcroForm fields.
   *
   * Measured, not assumed. The writer (`pdf-lib`) drops the XFA packet when it
   * saves, so generation yields a plain AcroForm document whose values render.
   * Recorded because "hybrid" is a material fact about the template: a reader
   * that renders XFA (Acrobat) must not be used to interpret a filled copy as the
   * authority's own rendered form.
   */
  xfaHybrid?: boolean
}

/**
 * Version of the fact→field mapping contract for a given form. Bumping this is
 * how a mapping change is made visible: a draft generated under an older mapping
 * version carries that version, so an approval bound to it cannot be mistaken
 * for approval of the newer mapping's output.
 */
export const PDF_MAPPING_VERSION = "horizon-pdf-mapping-v1" as const

/**
 * The 2025 Bundesfinanzverwaltung templates present in `public/forms/`.
 *
 * `capability: "static"` is not a guess. These files were inspected: they
 * contain no `/AcroForm`, no `/Widget` annotations and no XFA packet, and a
 * field lookup returns no fields. They are printable forms, so the engine can
 * verify and attribute them but cannot write values into them.
 */
export const FMS_2025_TEMPLATES: readonly OfficialPdfTemplate[] = [
  {
    id: "fms-2025-est-1-a",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Hauptvordruck ESt 1 A",
    formId: "034037_25",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034037_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "f90b7225a00ea546affdb75a7e5e4d868e1ccc82928c4db236e330b646e25388",
    path: "public/forms/ESt_1_A_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-n",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage N",
    formId: "034027_25",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034027_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "8350d72b44ad725811ce4deaf3911efac678304024022922747281e28dccac34",
    path: "public/forms/Anlage_N_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-vorsorgeaufwand",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Vorsorgeaufwand",
    formId: "034098_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/openForm.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F034098_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "16e365a7e336f0bb3e030d48c04245b3df5c08396cc1d13a7969440c2073754b",
    path: "public/forms/Anlage_Vorsorgeaufwand_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-kind",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Kind",
    formId: "034025_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F034025_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "d283ab8565a142f3d93082d5ba2bfc19e810abf9c68344cb2dd7531b5d1afaba",
    path: "public/forms/Anlage_Kind_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-sonderausgaben",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Sonderausgaben",
    formId: "035006_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035006_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "bd7c6e9c3026bed8865929e96081b7294ae7d725d9a9b183defa6a3ffe8b2ac7",
    path: "public/forms/Anlage_Sonderausgaben_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-haushaltsnahe",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Haushaltsnahe Aufwendungen",
    formId: "035009_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035009_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "ecf58b3b9b34a28b26ab4803de1dccbdb0b1b8779df8ee8442e0f595b6a54b75",
    path: "public/forms/Anlage_Haushaltsnahe_Aufwendungen_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-n-doppelte-haushaltsfuehrung",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage N-Doppelte Haushaltsführung",
    formId: "034027d_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F034027d_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "d8f8358bb0e1a2048e9d622cb303e865c900b272ac35164f89bdbf150ca6469f",
    path: "public/forms/Anlage_N_Doppelte_Haushaltsfuehrung_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-aussergewoehnliche-belastungen",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Außergewöhnliche Belastungen",
    formId: "035007_25",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035007_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "fdbe738e8e0c5f2c7624ce4aeee91db929bcff7a2e4f502af93860484349d5fc",
    path: "public/forms/Anlage_Aussergewoehnliche_Belastungen_2025.pdf",
    capability: "static",
  },
  {
    id: "fms-2025-anlage-unterhalt",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anlage Unterhalt",
    formId: "034031_25",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034031_25",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "9e13dcac4a628356b9f423f7a1b8d0999d85593866601f63b692cfd980ca410e",
    path: "public/forms/Anlage_Unterhalt_2025.pdf",
    capability: "static",
  },
] as const

/** The instruction booklet is reference material, never a fillable target. */
export const FMS_2025_REFERENCE_DOCUMENTS: readonly OfficialPdfTemplate[] = [
  {
    id: "fms-2025-anleitung-est",
    authority: "bundesfinanzverwaltung_fms",
    formName: "Anleitung Einkommensteuererklärung 2025",
    formId: null,
    officialSource: "https://www.elster.de/eportal/helpGlobal?themaGlobal=help_est_ufa_10_2025",
    taxYear: 2025,
    version: "2025",
    retrievalDate: "2026-09-19",
    sourceSha256: "7ce9ce1c9777502672150bab1c352ab2b5fca5cdde0ba947168c50fe1f4ea3e2",
    path: "public/forms/Anleitung_Einkommensteuererklaerung_2025.pdf",
    capability: "static",
  },
] as const

/**
 * Official Agentur-für-Arbeit templates (P12).
 *
 * These are *not* tax forms, so `taxYear` is null and they never appear in the
 * year-scoped picker. `capability: "acroform"` is measured, not assumed: the
 * field names below were read from these exact bytes, and a filled copy was
 * verified to render its values.
 *
 * The Veränderungsmitteilung is an XFA *hybrid* (`formModel both`): it carries a
 * 131 KB XFA template packet alongside its 59 AcroForm widgets. This matters
 * because a reader that renders XFA ignores AcroForm values entirely. The writer
 * drops the XFA packet on save (verified: `/XFA` is absent from generated
 * output), so the generated document is a plain AcroForm PDF whose values render
 * in any viewer. `xfaHybrid: true` records the source's nature so nobody later
 * mistakes the template for a single-format file.
 */
export const AGENTUR_FUER_ARBEIT_TEMPLATES: readonly OfficialPdfTemplate[] = [
  {
    id: "ba-veraenderungsmitteilung-alg",
    authority: "bundesagentur_fuer_arbeit",
    formName: "Veränderungsmitteilung Arbeitslosengeld",
    formId: "BA030410",
    officialSource: "https://www.arbeitsagentur.de/datei/aenderungsmitteilung-alg_ba030410.pdf",
    taxYear: null,
    version: "2020-09",
    printedVersion: "GR 22 - 09/2020 (ID: 5746, BA II 1e)",
    retrievalDate: "2026-09-21",
    sourceSha256: "5f8721a5775244b236e1ce865cb13985fba801049ae478d5e670d8a9193b57ad",
    path: "public/forms/BA_Veraenderungsmitteilung_Arbeitslosengeld_09-2020.pdf",
    capability: "acroform",
    xfaHybrid: true,
  },
] as const

export const OFFICIAL_PDF_TEMPLATES: readonly OfficialPdfTemplate[] = [
  ...FMS_2025_TEMPLATES,
  ...FMS_2025_REFERENCE_DOCUMENTS,
  ...AGENTUR_FUER_ARBEIT_TEMPLATES,
]

export function findTemplateById(id: string): OfficialPdfTemplate | null {
  return OFFICIAL_PDF_TEMPLATES.find((template) => template.id === id) ?? null
}

/**
 * Templates for one tax year. Returns an empty list for a year with no verified
 * entry — deliberately not a fallback to a nearby year, because carrying 2025
 * identifiers into 2026 is exactly the error the P15 inventory forbids.
 */
export function templatesForTaxYear(taxYear: number): readonly OfficialPdfTemplate[] {
  return FMS_2025_TEMPLATES.filter((template) => template.taxYear === taxYear)
}

export function isTemplateVerifiedForYear(id: string, taxYear: number): boolean {
  const template = findTemplateById(id)
  return template !== null && template.taxYear === taxYear
}