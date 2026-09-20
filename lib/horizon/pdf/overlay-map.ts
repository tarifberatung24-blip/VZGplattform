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
}

export function staticMappingForTemplate(templateId: string): StaticTemplateMapping | null {
  return STATIC_TEMPLATE_MAPPINGS[templateId] ?? null
}

export function staticOverlayTemplateIds(): readonly string[] {
  return Object.keys(STATIC_TEMPLATE_MAPPINGS)
}