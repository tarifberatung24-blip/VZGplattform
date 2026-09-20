/**
 * P10 — verified signature placement, bound to one template revision.
 *
 * **Why this is a separate registry from `overlay-map.ts`.** The two are measured
 * the same way, but they answer different questions and must be able to disagree.
 * A form's field coordinates can be verified while its signature area is still
 * unknown; if both lived in one mapping, adding field coordinates would silently
 * imply signature placement was verified too. Keeping them apart means a template
 * can be fillable and not signable, which is the honest state for most forms.
 *
 * **How these coordinates were established.** They were measured from
 * `public/forms/ESt_1_A_2025.pdf`, and the binding is to that file's SHA-256 —
 * not to its filename. The page carries no `/AcroForm`, no `/Widget` and no XFA
 * packet, and the signature region draws no box either: the only stroked
 * rectangles near the signature are the letterhead rules and one small 12x16pt
 * checkbox at x 481-493. So there is nothing machine-readable to snap to, and the
 * placement is derived from the printed caption instead:
 *
 *   the caption "Datum, Unterschrift(en) … zu unterschreiben." occupies
 *   y 724.52-731.36, and the shaded box immediately above it spans
 *   x 39.17-535.71, y 688.08-719.64.
 *
 * Both boxes are recorded as evidence below, exactly as the field mappings do,
 * so the claim is checkable rather than asserted.
 *
 * **The one convention this file does make.** The caption names two things —
 * a date and a signature — inside one wide box, so the placement splits the box
 * into a left date column and a right signature column. That split is a layout
 * convention, not something measured, which is why it is part of the placement
 * version: changing it changes the version, and a signature recorded against the
 * old version stays explainable.
 */

import { toPdfY, type MeasuredBox } from "./overlay-map"

export type SignaturePlacement = {
  templateId: string
  /** The exact template revision these coordinates were measured against. */
  templateSourceSha256: string
  taxYear: number | null
  /** 1-based, matching how the rest of the engine numbers pages. */
  page: number
  pageHeight: number
  placementVersion: string
  evidence: {
    /** The printed caption that names this area. */
    label: string
    labelBox: MeasuredBox
    /** The blank area the caption refers to. */
    areaBox: MeasuredBox
    /** How the area was identified, so a reviewer knows what was relied on. */
    method: string
    verifiedAt: string
  }
  /** Width of the date column on the left of the area. Convention, not measured. */
  dateColumnWidth: number
  /** Margin kept between the area edge and the drawn content. */
  inset: number
  /** Drawn at the top of the area, so the area itself stays identifiable. */
  dateFontSize: number
  /**
   * How many handwritten signatures the official form's own wording can require.
   *
   * This is a property of the printed form, not of the user, and it is recorded
   * so the engine can refuse rather than under-sign. The reference area's caption
   * reads "… – bei Ehegatten / Lebenspartnern von beiden – zu unterschreiben.",
   * i.e. a jointly assessed couple must both sign. The engine can draw exactly one
   * signature, so it cannot satisfy `max > 1` on its own and must not pretend to.
   */
  signatoryRule: {
    max: number
    /** The printed wording this is derived from. */
    basis: string
  }
}

/** Bump when the date/signature split or insets change. */
export const SIGNATURE_PLACEMENT_VERSION = "horizon-signature-placement-v1"

export const SIGNATURE_PLACEMENTS: Readonly<Record<string, SignaturePlacement>> = {
  "fms-2025-est-1-a": {
    templateId: "fms-2025-est-1-a",
    templateSourceSha256:
      "f90b7225a00ea546affdb75a7e5e4d868e1ccc82928c4db236e330b646e25388",
    taxYear: 2025,
    page: 2,
    pageHeight: 841.89,
    placementVersion: SIGNATURE_PLACEMENT_VERSION,
    evidence: {
      label: "Datum, Unterschrift(en) – Steuererklärungen sind eigenhändig zu unterschreiben.",
      labelBox: { x0: 44.17, top: 724.52, x1: 482.22, bottom: 731.36 },
      areaBox: { x0: 39.17, top: 688.08, x1: 535.71, bottom: 719.64 },
      method: "blank-field-band-immediately-above-signature-caption",
      verifiedAt: "2026-09-19",
    },
    dateColumnWidth: 92,
    inset: 3,
    dateFontSize: 9,
    signatoryRule: {
      max: 2,
      basis:
        "Datum, Unterschrift(en) – Steuererklärungen sind eigenhändig – bei Ehegatten / Lebenspartnern von beiden – zu unterschreiben.",
    },
  },
}

/**
 * The placement for a template revision, or null when none has been verified.
 *
 * Refuses on a hash or year mismatch rather than reusing a mapping measured for
 * another revision: coordinates measured against one revision say nothing about
 * another, and drawing a signature in the wrong place on an official form is a
 * silent, plausible-looking error.
 */
export function signaturePlacementForTemplate(input: {
  templateId: string
  templateSourceSha256: string
  taxYear: number | null
}): SignaturePlacement | null {
  const placement = SIGNATURE_PLACEMENTS[input.templateId]
  if (!placement) return null
  if (placement.templateSourceSha256 !== input.templateSourceSha256) return null
  if (placement.taxYear !== input.taxYear) return null
  return placement
}

export function verifiedSignatureTemplateIds(): readonly string[] {
  return Object.keys(SIGNATURE_PLACEMENTS)
}

/**
 * The two rectangles a signature is actually drawn into, derived from the
 * measured area and the recorded convention. Exported so a test can prove both
 * stay inside the area they claim to come from.
 */
export function signatureBoxes(placement: SignaturePlacement): {
  dateBox: MeasuredBox
  signatureBox: MeasuredBox
} {
  const { areaBox } = placement.evidence
  const { dateColumnWidth, inset } = placement
  const top = areaBox.top + inset
  const bottom = areaBox.bottom - inset
  const divider = areaBox.x0 + dateColumnWidth

  return {
    dateBox: { x0: areaBox.x0 + inset, top, x1: divider - inset, bottom },
    signatureBox: {
      x0: divider,
      top,
      x1: areaBox.x1 - inset,
      bottom,
    },
  }
}

/** Bottom-left point and size limits in PDF space, for the writer. */
export function signatureDrawTarget(placement: SignaturePlacement): {
  x: number
  yBottom: number
  maxWidth: number
  maxHeight: number
  dateX: number
  dateYBottom: number
} {
  const { dateBox, signatureBox } = signatureBoxes(placement)
  return {
    x: signatureBox.x0,
    yBottom: toPdfY(signatureBox.bottom, placement.pageHeight),
    maxWidth: signatureBox.x1 - signatureBox.x0,
    maxHeight: signatureBox.bottom - signatureBox.top,
    dateX: dateBox.x0,
    // Baseline of the date sits just above the bottom of its column.
    dateYBottom: toPdfY(dateBox.bottom, placement.pageHeight),
  }
}