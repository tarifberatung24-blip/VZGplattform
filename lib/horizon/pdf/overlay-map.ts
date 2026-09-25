/**
 * P9 — static overlay mapping schema and the verified reference mapping.
 *
 * The official FMS templates are static printable forms: they expose no AcroForm
 * fields, so values are placed by drawing text into the printed input boxes.
 * That is only safe if the coordinates were measured from the exact template
 * being written, which is what this file enforces.
 *
 * **Coordinate binding.** A mapping declares the `sourceSha256` and `taxYear` of
 * the template it was measured against. `planOverlayFill` refuses unless both
 * match the template being generated. A coordinate set can therefore never drift
 * onto a different revision, a different form, or another tax year without a
 * fresh measurement — which is the rule the owner set: never reuse coordinates
 * across a different template hash/version/year without verification.
 *
 * **Coordinate space.** Values are stored in the PDF's own space: origin at the
 * bottom-left, y increasing upward, unit = point. The measuring tool reports
 * positions from the top instead, so `evidence` records the measured label and
 * input boxes in the tool's top-down space together with the page height. The two
 * are kept side by side deliberately: the derivation is auditable, and a test
 * re-measures the real PDF and asserts that the stored box still sits under the
 * printed label it claims to belong to.
 */

export const OVERLAY_FIELD_KINDS = ["text", "checkbox", "radio", "date", "numeric"] as const
export type OverlayFieldKind = (typeof OVERLAY_FIELD_KINDS)[number]

/** Explicit, deterministic presentation rules. None of these compute a value. */
export const OVERLAY_FORMATS = [
  /** `YYYY-MM-DD` → `DD.MM.YYYY`. Applied only on an exact ISO match. */
  "date_de",
  /** Decimal comma → decimal point normalisation for a numeric field. */
  "decimal_comma_to_point",
] as const
export type OverlayFormat = (typeof OVERLAY_FORMATS)[number]

/** A box measured from the template, in the measuring tool's top-down space. */
export type MeasuredBox = { x0: number; top: number; x1: number; bottom: number }

export type OverlayFieldPlacement = {
  /** Stable logical field name, unique within the template. */
  fieldName: string
  factKey: string
  /** 1-based page number. */
  page: number
  kind: OverlayFieldKind
  format?: OverlayFormat
  /** Left edge of the printed input box, in PDF points from the page left. */
  x: number
  /** Bottom edge of the printed input box, in PDF points from the page bottom. */
  yBottom: number
  /** Usable width of the input box; text wider than this is refused. */
  maxWidth: number
  /** Usable height of the input box. */
  maxHeight: number
  fontSize: number
  /** The printed label this box belongs to, and both measured boxes. */
  evidence: {
    label: string
    labelBox: MeasuredBox
    inputBox: MeasuredBox
    pageHeight: number
  }
}

export type StaticTemplateMapping = {
  templateId: string
  taxYear: number
  /** SHA-256 of the exact template these coordinates were measured from. */
  sourceSha256: string
  mappingVersion: string
  pageHeight: number
  fields: readonly OverlayFieldPlacement[]
}

/** ESt 1 A 2025, page 1, is 595.3 x 841.9 pt (A4). */
const EST_1_A_PAGE_HEIGHT = 841.9

/**
 * Converts a measured top-down `bottom` into the PDF `yBottom` stored on a field.
 *
 * Exported because the tests re-derive each stored coordinate from the recorded
 * measurement; keeping one conversion in one place means the test cannot agree
 * with the mapping by accident.
 */
export const toPdfY = (topDownBottom: number, pageHeight: number) =>
  pageHeight - topDownBottom

/**
 * Reference mapping: Hauptvordruck ESt 1 A (2025), page 1, identity boxes.
 *
 * Coordinates were measured from `public/forms/ESt_1_A_2025.pdf` at the hash
 * recorded in `registry.ts`. Each `inputBox` is the printed rectangle directly
 * beneath the printed `labelBox`; the values below are that rectangle converted
 * into PDF space. Nothing here is estimated from a screenshot or carried over
 * from another form.
 */
export const EST_1_A_2025_MAPPING: StaticTemplateMapping = {
  templateId: "fms-2025-est-1-a",
  taxYear: 2025,
  sourceSha256: "f90b7225a00ea546affdb75a7e5e4d868e1ccc82928c4db236e330b646e25388",
  mappingVersion: "horizon-pdf-mapping-v1",
  pageHeight: EST_1_A_PAGE_HEIGHT,
  fields: [
    {
      fieldName: "idnr",
      factKey: "tax_id",
      page: 1,
      kind: "text",
      x: 61.73,
      yBottom: 504.02,
      maxWidth: 161.48,
      maxHeight: 15.84,
      fontSize: 10,
      evidence: {
        label: "Identifikationsnummer",
        labelBox: { x0: 67.45, top: 315.9, x1: 126.11, bottom: 321.9 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 322.04, x1: 223.21, bottom: 337.88 },
      },
    },
    {
      fieldName: "geburtsdatum",
      factKey: "date_of_birth",
      page: 1,
      kind: "date",
      format: "date_de",
      x: 304.76,
      yBottom: 504.02,
      maxWidth: 111.69,
      maxHeight: 15.84,
      fontSize: 10,
      evidence: {
        label: "Geburtsdatum",
        labelBox: { x0: 310.48, top: 315.9, x1: 348.48, bottom: 321.9 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 304.76, top: 322.04, x1: 416.45, bottom: 337.88 },
      },
    },
    {
      fieldName: "name",
      factKey: "last_name",
      page: 1,
      kind: "text",
      x: 61.73,
      yBottom: 472.58,
      maxWidth: 354.34,
      maxHeight: 15.84,
      fontSize: 10,
      evidence: {
        label: "Name",
        labelBox: { x0: 67.45, top: 347.46, x1: 83.45, bottom: 353.46 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 353.48, x1: 416.07, bottom: 369.32 },
      },
    },
    {
      fieldName: "vorname",
      factKey: "first_name",
      page: 1,
      kind: "text",
      x: 61.73,
      yBottom: 446.29,
      maxWidth: 354.34,
      maxHeight: 15.85,
      fontSize: 10,
      evidence: {
        label: "Vorname",
        labelBox: { x0: 67.45, top: 373.74, x1: 91.79, bottom: 379.74 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 379.76, x1: 416.07, bottom: 395.61 },
      },
    },
    {
      fieldName: "strasse",
      factKey: "street",
      page: 1,
      kind: "text",
      x: 61.73,
      yBottom: 367.57,
      maxWidth: 354.34,
      maxHeight: 15.84,
      fontSize: 10,
      evidence: {
        label: "Straße",
        labelBox: { x0: 67.45, top: 452.35, x1: 85.44, bottom: 458.35 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 458.49, x1: 416.07, bottom: 474.33 },
      },
    },
    {
      fieldName: "plz",
      factKey: "postal_code",
      page: 1,
      kind: "numeric",
      x: 61.73,
      yBottom: 315.0,
      maxWidth: 68.94,
      maxHeight: 15.84,
      fontSize: 10,
      evidence: {
        label: "Postleitzahl",
        labelBox: { x0: 67.45, top: 504.92, x1: 98.11, bottom: 510.92 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 511.06, x1: 130.67, bottom: 526.9 },
      },
    },
    {
      fieldName: "wohnort",
      factKey: "city",
      page: 1,
      kind: "text",
      x: 61.73,
      yBottom: 288.72,
      maxWidth: 354.34,
      maxHeight: 15.96,
      fontSize: 10,
      evidence: {
        label: "Wohnort",
        labelBox: { x0: 67.45, top: 531.2, x1: 90.11, bottom: 537.2 },
        pageHeight: EST_1_A_PAGE_HEIGHT,
        inputBox: { x0: 61.73, top: 537.22, x1: 416.07, bottom: 553.18 },
      },
    },
  ],
}

/** The 2025 Anlagen are also A4. */
const ANLAGEN_PAGE_HEIGHT = 841.89

/**
 * The identity header every 2025 Anlage shares.
 *
 * Each Anlage prints `Name` and `Vorname` with the value box directly beneath
 * the printed label, so the same two fields recur. The coordinates are *not*
 * shared code: every Anlage was measured separately and its own measured boxes
 * are passed in, because a header that merely looks identical can sit at a
 * different offset (the reference ESt 1 A header differs from every Anlage by
 * roughly 300 pt). Reusing one form's offsets would put a name in the wrong box,
 * which is exactly what the hash and evidence binding exist to prevent.
 */
function anlagenIdentityMapping(input: {
  templateId: string
  sourceSha256: string
  nameLabelBox: MeasuredBox
  nameInputBox: MeasuredBox
  vornameLabelBox: MeasuredBox
  vornameInputBox: MeasuredBox
}): StaticTemplateMapping {
  const field = (
    fieldName: string,
    factKey: string,
    label: string,
    labelBox: MeasuredBox,
    inputBox: MeasuredBox,
  ): OverlayFieldPlacement => ({
    fieldName,
    factKey,
    page: 1,
    kind: "text",
    x: inputBox.x0,
    yBottom: toPdfY(inputBox.bottom, ANLAGEN_PAGE_HEIGHT),
    maxWidth: inputBox.x1 - inputBox.x0,
    maxHeight: inputBox.bottom - inputBox.top,
    fontSize: 10,
    evidence: { label, labelBox, pageHeight: ANLAGEN_PAGE_HEIGHT, inputBox },
  })
  return {
    templateId: input.templateId,
    taxYear: 2025,
    sourceSha256: input.sourceSha256,
    mappingVersion: "horizon-pdf-mapping-v1",
    pageHeight: ANLAGEN_PAGE_HEIGHT,
    fields: [
      field("name", "last_name", "Name", input.nameLabelBox, input.nameInputBox),
      field("vorname", "first_name", "Vorname", input.vornameLabelBox, input.vornameInputBox),
    ],
  }
}

/**
 * Anlage N (2025), page 1, identity boxes.
 *
 * Measured from `public/forms/Anlage_N_2025.pdf` at the registry hash. `Name`
 * label sits at top 46.42 and its box begins at top 55.01; `Vorname` at 72.70
 * and 81.17.
 */
export const ANLAGE_N_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-n",
  sourceSha256: "8350d72b44ad725811ce4deaf3911efac678304024022922747281e28dccac34",
  nameLabelBox: { x0: 67.45, top: 46.42, x1: 83.45, bottom: 52.42 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 72.7, x1: 91.79, bottom: 78.7 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 97.13 },
})

/** Anlage Vorsorgeaufwand (2025), page 1, identity boxes. */
export const ANLAGE_VORSORGEAUFWAND_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-vorsorgeaufwand",
  sourceSha256: "16e365a7e336f0bb3e030d48c04245b3df5c08396cc1d13a7969440c2073754b",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 97.13 },
})

/** Anlage Kind (2025), page 1, identity boxes (its boxes are ~1 pt taller). */
export const ANLAGE_KIND_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-kind",
  sourceSha256: "d283ab8565a142f3d93082d5ba2bfc19e810abf9c68344cb2dd7531b5d1afaba",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 72.04 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 98.32 },
})

/** Anlage Sonderausgaben (2025), page 1, identity boxes. */
export const ANLAGE_SONDERAUSGABEN_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-sonderausgaben",
  sourceSha256: "bd7c6e9c3026bed8865929e96081b7294ae7d725d9a9b183defa6a3ffe8b2ac7",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 419.05, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 419.05, bottom: 97.13 },
})

/** Anlage Haushaltsnahe Aufwendungen (2025), page 1, identity boxes. */
export const ANLAGE_HAUSHALTSNAHE_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-haushaltsnahe",
  sourceSha256: "ecf58b3b9b34a28b26ab4803de1dccbdb0b1b8779df8ee8442e0f595b6a54b75",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 415.48, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 415.48, bottom: 97.13 },
})

/** Anlage N — Doppelte Haushaltsführung (2025), page 1, identity boxes. */
export const ANLAGE_N_DOPPELTE_HAUSHALTSFUEHRUNG_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-n-doppelte-haushaltsfuehrung",
  sourceSha256: "d8f8358bb0e1a2048e9d622cb303e865c900b272ac35164f89bdbf150ca6469f",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 97.01 },
})

/** Anlage Außergewöhnliche Belastungen (2025), page 1, identity boxes. */
export const ANLAGE_AUSSERGEWOEHNLICHE_BELASTUNGEN_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-aussergewoehnliche-belastungen",
  sourceSha256: "fdbe738e8e0c5f2c7624ce4aeee91db929bcff7a2e4f502af93860484349d5fc",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 97.13 },
})

/** Anlage Unterhalt (2025), page 1, identity boxes. */
export const ANLAGE_UNTERHALT_2025_MAPPING = anlagenIdentityMapping({
  templateId: "fms-2025-anlage-unterhalt",
  sourceSha256: "9e13dcac4a628356b9f423f7a1b8d0999d85593866601f63b692cfd980ca410e",
  nameLabelBox: { x0: 67.45, top: 47.01, x1: 83.45, bottom: 53.01 },
  nameInputBox: { x0: 61.73, top: 55.01, x1: 416.07, bottom: 70.85 },
  vornameLabelBox: { x0: 67.45, top: 73.3, x1: 91.79, bottom: 79.3 },
  vornameInputBox: { x0: 61.73, top: 81.17, x1: 416.07, bottom: 97.13 },
})

/**
 * Verified overlay mappings, keyed by template id.
 *
 * Only templates whose coordinates were measured against the exact source bytes
 * appear here. Adding an entry requires re-measuring the real PDF; the tests
 * assert that every entry is hash-bound and that each stored box sits under the
 * label it names.
 */
export const STATIC_TEMPLATE_MAPPINGS: Readonly<Record<string, StaticTemplateMapping>> = {
  "fms-2025-est-1-a": EST_1_A_2025_MAPPING,
  "fms-2025-anlage-n": ANLAGE_N_2025_MAPPING,
  "fms-2025-anlage-vorsorgeaufwand": ANLAGE_VORSORGEAUFWAND_2025_MAPPING,
  "fms-2025-anlage-kind": ANLAGE_KIND_2025_MAPPING,
  "fms-2025-anlage-sonderausgaben": ANLAGE_SONDERAUSGABEN_2025_MAPPING,
  "fms-2025-anlage-haushaltsnahe": ANLAGE_HAUSHALTSNAHE_2025_MAPPING,
  "fms-2025-anlage-n-doppelte-haushaltsfuehrung":
    ANLAGE_N_DOPPELTE_HAUSHALTSFUEHRUNG_2025_MAPPING,
  "fms-2025-anlage-aussergewoehnliche-belastungen":
    ANLAGE_AUSSERGEWOEHNLICHE_BELASTUNGEN_2025_MAPPING,
  "fms-2025-anlage-unterhalt": ANLAGE_UNTERHALT_2025_MAPPING,
}

export function staticMappingForTemplate(templateId: string): StaticTemplateMapping | null {
  return STATIC_TEMPLATE_MAPPINGS[templateId] ?? null
}

export function staticOverlayTemplateIds(): readonly string[] {
  return Object.keys(STATIC_TEMPLATE_MAPPINGS)
}