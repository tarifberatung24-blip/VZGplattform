/**
 * P10 — planning a visual signature onto an already-approved document.
 *
 * **What a visual signature is, and what it is not.** This draws an image and a
 * date into the page. It is not a qualified electronic signature, not an advanced
 * electronic signature, and not a cryptographic or PAdES signature: nothing is
 * cryptographically bound to the signer, and no certificate is involved. The
 * engine reports the type as VISUAL everywhere it is recorded, and the type
 * vocabulary deliberately contains only that one value so no caller can label
 * this output as something stronger.
 *
 * **Why the input is a hash rather than a document id.** A document id is a
 * pointer, and a pointer can come to name different bytes than the ones that were
 * approved — a regenerated form, a re-upload, a replaced object. Signing is only
 * legitimate when it is applied to *the exact bytes that were approved*, so the
 * chain is verified by value, not by reference: the manifest's recorded
 * `outputSha256` must equal the hash of the bytes actually being signed, and the
 * approval must still match the manifest's content hash. If any input changed
 * after approval, the draft hash moved and the approval stops matching on its own.
 *
 * The guard order below is deliberate and each step is a real check:
 *   1. a verified placement for this template revision, or refuse;
 *   2. a supported image, or refuse;
 *   3. the template bytes must hash to the template the manifest names;
 *   4. the document bytes must hash to the SHA-256 the manifest recorded;
 *   5. the approval's bound hash must equal the manifest's content hash;
 *   6. the explicit confirmation must be present.
 * Signing happens only when all six hold.
 */

import { isWinAnsiRepresentable } from "./encoding"
import {
  signatureDrawTarget,
  type SignaturePlacement,
} from "./signature-map"

/** The only signature type this engine produces. Intentionally a single value. */
export const SIGNATURE_TYPES = ["VISUAL"] as const
export type SignatureType = (typeof SIGNATURE_TYPES)[number]

/** Raster formats pdf-lib can embed without another dependency. */
export const SIGNATURE_IMAGE_FORMATS = ["png", "jpeg"] as const
export type SignatureImageFormat = (typeof SIGNATURE_IMAGE_FORMATS)[number]

export const SIGNATURE_IMAGE_MAX_BYTES = 2 * 1024 * 1024

export type SignaturePlanFailure =
  | "no_verified_placement"
  | "unsupported_image_format"
  | "image_empty"
  | "image_too_large"
  | "template_hash_mismatch"
  | "document_hash_mismatch"
  | "approval_missing"
  | "approval_stale"
  | "case_mismatch"
  | "date_unsupported"
  | "not_confirmed"
  | "multiple_signatures_required"
  | "joint_assessment_unconfirmed"

export type SignaturePlan = {
  kind: SignatureType
  placement: SignaturePlacement
  imageFormat: SignatureImageFormat
  dateText: string
  /** SHA-256 of the document being signed, verified against the manifest. */
  unsignedSha256: string
  approvalHash: string
  templateSourceSha256: string
}

export type SignaturePlanResult =
  | { ok: true; plan: SignaturePlan }
  | { ok: false; code: SignaturePlanFailure; detail: string | null }

export function detectSignatureImageFormat(bytes: Uint8Array): SignatureImageFormat | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg"
  }
  return null
}

/**
 * The date that is drawn next to the signature.
 *
 * The value must already be in ISO form. Anything else is refused rather than
 * guessed at, because a misread date on a signed tax declaration is worse than no
 * signature: an ambiguous `03/04/2026` cannot be resolved without inventing a
 * convention the user never agreed to.
 */
export function formatSignatureDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, year, month, day] = match
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ]
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return null
  const asDate = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(asDate.getTime()) || asDate.getUTCDate() !== Number(day)) return null
  const text = `${day}. ${monthNames[monthIndex]} ${year}`
  return isWinAnsiRepresentable(text) ? text : null
}

/**
 * Fact keys the engine recognises as establishing a joint assessment (a jointly
 * assessed couple, where German tax forms require both spouses to sign).
 *
 * Deliberately a whitelist of explicit keys rather than a heuristic over marital
 * status wording: the engine must not infer a legal filing status from free text,
 * and an unrecognised key is simply not evidence either way.
 */
export const JOINT_ASSESSMENT_FACT_KEYS = ["joint_assessment", "veranlagung_zusammen"] as const

export type JointAssessmentReading = {
  /** A recognised fact is present and confirmed as affirmative. */
  joint: boolean
  /** A recognised fact is present but not confirmed by the user. */
  unconfirmed: boolean
}

/**
 * Reads joint-assessment intent from the case's facts.
 *
 * Only an explicitly affirmative value counts as joint. `false`/`nein`/anything
 * else recorded is treated as a deliberate negative, not as joint. A present but
 * unconfirmed recognised fact is reported as `unconfirmed` so the caller can
 * refuse instead of choosing an answer the user never gave.
 */
export function readJointAssessment(
  facts: readonly { key: string; value: string; confirmedAt: string | null }[],
): JointAssessmentReading {
  const recognised = facts.filter((fact) =>
    (JOINT_ASSESSMENT_FACT_KEYS as readonly string[]).includes(fact.key),
  )
  if (recognised.length === 0) return { joint: false, unconfirmed: false }

  const confirmed = recognised.filter((fact) => fact.confirmedAt)
  if (confirmed.length === 0) return { joint: false, unconfirmed: true }

  const affirmative = confirmed.some((fact) =>
    ["true", "ja", "1", "yes", "zusammen"].includes(fact.value.trim().toLowerCase()),
  )
  return { joint: affirmative, unconfirmed: false }
}

/**
 * The subset of a generation manifest that signing actually relies on. Narrowed
 * deliberately: the planner has no business reading the rest of a manifest, and
 * accepting the whole type would invite it to.
 */
export type SignatureManifestFacts = {
  sourceSha256: string
  outputSha256: string | null
  caseId: string
}

export function planSignature(input: {
  manifest: SignatureManifestFacts
  /** The case the signature is being requested under. Must match the manifest. */
  expectedCaseId: string
  /** SHA-256 of the bytes that are about to be signed. */
  unsignedSha256: string
  /** SHA-256 of the template those bytes were generated from. */
  templateSourceSha256: string
  placement: SignaturePlacement | null
  imageBytes: Uint8Array
  /** Bound hash of the approval being relied on. Null when none exists. */
  approvedHash: string | null
  /** The manifest's own content hash, as bound by the P8 approval. */
  manifestContentHash: string
  /** The date the user entered, ISO `YYYY-MM-DD`. */
  dateIso: string
  /** The user's explicit confirmation that they intend to sign this document. */
  confirmed: boolean
  /**
   * Whether the case's own facts establish a second required signatory — e.g. a
   * jointly assessed couple. Derived by the caller from confirmed facts only, so
   * an unknown marital status is not treated as either yes or no.
   */
  jointAssessment: boolean
  /** The joint-assessment fact is present but not confirmed by the user. */
  jointAssessmentUnconfirmed: boolean
}): SignaturePlanResult {
  if (!input.placement) {
    return { ok: false, code: "no_verified_placement", detail: null }
  }
  /*
   * Multi-signatory refusal, and why it comes before anything is drawn.
   *
   * Some official forms require more than one handwritten signature — the
   * reference area is explicitly captioned "bei Ehegatten / Lebenspartnern von
   * beiden". This engine draws exactly one signature, so when the form can
   * require two *and* the case's confirmed facts establish a joint assessment,
   * one signature would leave the document materially incomplete while looking
   * finished. That is worse than refusing. It is refused outright, never
   * partially applied, and the record is never presented as fully signed.
   *
   * An *unconfirmed* joint-assessment fact also refuses: the engine cannot tell
   * whether a second signature is required, and guessing either way is unsafe —
   * assume "single" and we may under-sign; assume "joint" and we block a valid
   * single signature. The user resolves it by confirming or removing the fact.
   */
  if (input.placement.signatoryRule.max > 1 && input.jointAssessment) {
    return { ok: false, code: "multiple_signatures_required", detail: null }
  }
  // Kept distinct from the above so the user is told which of the two situations
  // they are in: "this form needs two signatures" versus "we cannot tell whether
  // it does, because the relevant fact is unconfirmed".
  if (input.placement.signatoryRule.max > 1 && input.jointAssessmentUnconfirmed) {
    return { ok: false, code: "joint_assessment_unconfirmed", detail: null }
  }
  if (!input.confirmed) {
    return { ok: false, code: "not_confirmed", detail: null }
  }
  if (input.imageBytes.length === 0) {
    return { ok: false, code: "image_empty", detail: null }
  }
  if (input.imageBytes.length > SIGNATURE_IMAGE_MAX_BYTES) {
    return { ok: false, code: "image_too_large", detail: null }
  }
  const imageFormat = detectSignatureImageFormat(input.imageBytes)
  if (!imageFormat) {
    return { ok: false, code: "unsupported_image_format", detail: null }
  }
  if (input.manifest.sourceSha256 !== input.templateSourceSha256) {
    return { ok: false, code: "template_hash_mismatch", detail: null }
  }
  // The document must be exactly the bytes the manifest recorded. A null
  // outputSha256 means no artifact was ever produced for this manifest.
  if (!input.manifest.outputSha256) {
    return { ok: false, code: "document_hash_mismatch", detail: null }
  }
  if (input.manifest.outputSha256 !== input.unsignedSha256) {
    return { ok: false, code: "document_hash_mismatch", detail: null }
  }
  // The manifest must describe the case the signature is being requested under,
  // so a manifest from one case cannot be signed through another case's request.
  if (input.manifest.caseId !== input.expectedCaseId) {
    return { ok: false, code: "case_mismatch", detail: null }
  }
  if (!input.approvedHash) {
    return { ok: false, code: "approval_missing", detail: null }
  }
  if (input.approvedHash !== input.manifestContentHash) {
    return { ok: false, code: "approval_stale", detail: null }
  }
  const dateText = formatSignatureDate(input.dateIso)
  if (!dateText) {
    return { ok: false, code: "date_unsupported", detail: null }
  }

  return {
    ok: true,
    plan: {
      kind: "VISUAL",
      placement: input.placement,
      imageFormat,
      dateText,
      unsignedSha256: input.unsignedSha256,
      approvalHash: input.approvedHash,
      templateSourceSha256: input.templateSourceSha256,
    },
  }
}

/**
 * Where the signature image and date are drawn.
 *
 * The image keeps its aspect ratio inside the signature column and is anchored to
 * the bottom of the area, so it sits on the notional line rather than floating.
 * The left quarter of the height is left clear for descenders, which is what keeps
 * the date from colliding with the image when the image fills the width.
 */
export function signatureImageBox(plan: SignaturePlan): {
  x: number
  y: number
  width: number
  height: number
} {
  const target = signatureDrawTarget(plan.placement)
  return {
    x: target.x,
    y: target.yBottom,
    width: target.maxWidth,
    height: target.maxHeight,
  }
}

export function signatureDatePosition(plan: SignaturePlan): { x: number; y: number } {
  const target = signatureDrawTarget(plan.placement)
  return { x: target.dateX, y: target.dateYBottom }
}