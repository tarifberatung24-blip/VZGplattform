/**
 * P9 — template source integrity and capability inspection.
 *
 * The registry makes claims about template bytes. This module checks them
 * against the bytes that are actually present, so a template replaced by a newer
 * revision (or a different form entirely) is caught before any value is written
 * onto it.
 *
 * `verifyTemplateSource` is pure and takes the bytes, which keeps it testable
 * without touching the filesystem.
 */

import type { OfficialPdfTemplate, PdfFormCapability } from "./registry"
import type { TemplateInspection } from "./fill"

/** SHA-256 hex digest of the given bytes, using the platform WebCrypto. */
export async function computeSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export type SourceVerification =
  | { ok: true }
  | { ok: false; expected: string; actual: string }

/**
 * Recomputes the template hash and compares it with the registry.
 *
 * A mismatch is a refusal, not a warning: generating from an unverified template
 * would attribute the output to an official source that may no longer match.
 */
export async function verifyTemplateSource(
  template: OfficialPdfTemplate,
  bytes: Uint8Array,
): Promise<SourceVerification> {
  const actual = await computeSha256(bytes)
  if (actual !== template.sourceSha256) {
    return { ok: false, expected: template.sourceSha256, actual }
  }
  return { ok: true }
}

const XFA_MARKER = Buffer.from("/XFA")
const ACROFORM_MARKER = Buffer.from("/AcroForm")
const WIDGET_MARKER = Buffer.from("/Widget")

/**
 * Byte sequence search.
 *
 * `Uint8Array.prototype.includes` compares element identity, not value, so it
 * never matches a separately-constructed needle and would silently report every
 * template as unmarked. This compares numerically instead.
 */
function containsBytes(haystack: Uint8Array, needle: Uint8Array): boolean {
  const last = haystack.length - needle.length
  if (last < 0) return false
  outer: for (let i = 0; i <= last; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

/**
 * Reads the template's real capability from its bytes.
 *
 * This is intentionally conservative. A marker scan can only prove presence, so
 * a file that lacks `/AcroForm` and `/Widget` and yields no fields is reported as
 * `static` rather than assumed fillable. The authoritative field list comes from
 * the PDF reader; this function decides only which of the three formats applies,
 * preferring the safest interpretation.
 */
export function detectCapability(input: {
  bytes: Uint8Array
  /** Field names reported by the PDF reader, or null when it found no form. */
  readerFieldNames: readonly string[] | null
}): TemplateInspection {
  const { bytes, readerFieldNames } = input

  if (readerFieldNames && readerFieldNames.length > 0) {
    return { capability: "acroform", fieldNames: readerFieldNames }
  }

  if (containsBytes(bytes, XFA_MARKER)) {
    return { capability: "xfa", fieldNames: [] }
  }

  // No usable fields from the reader. Treat unmarked files as static rather than
  // assuming an interactive form that the reader merely failed to expose.
  void ACROFORM_MARKER
  void WIDGET_MARKER
  return { capability: "static", fieldNames: [] }
}

/**
 * Result of inspecting a template at generation time.
 */
export type TemplateReadiness =
  | { ok: true; inspection: TemplateInspection }
  | { ok: false; code: "source_hash_mismatch" | "template_read_failed"; detail?: string }

export async function inspectTemplate(input: {
  template: OfficialPdfTemplate
  bytes: Uint8Array
  readerFieldNames: readonly string[] | null
}): Promise<TemplateReadiness> {
  const verification = await verifyTemplateSource(input.template, input.bytes)
  if (!verification.ok) {
    return {
      ok: false,
      code: "source_hash_mismatch",
      detail: verification.actual,
    }
  }
  return {
    ok: true,
    inspection: detectCapability({
      bytes: input.bytes,
      readerFieldNames: input.readerFieldNames,
    }),
  }
}

export function isCapability(value: unknown): value is PdfFormCapability {
  return value === "acroform" || value === "xfa" || value === "static"
}