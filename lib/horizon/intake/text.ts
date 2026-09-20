/**
 * P6 — text intake: pasted text and email content.
 *
 * The P6 target accepts five input types. Three (PDF, photo, screenshot) are
 * files and travel through `uploadOwnedDocument` into the `source-documents`
 * bucket. The other two are text and have no file to store.
 *
 * `source_documents.mime` is CHECK-constrained to
 * (application/pdf, image/jpeg, image/png), and the `source-documents` bucket
 * declares the same three MIME types. Widening either would require dropping a
 * constraint, so text intake does not reuse that table. Instead the verbatim
 * text is persisted through the owner-scoped `case_messages` spine, which is
 * already column-granted and RLS-protected, and its provenance is recorded in
 * the append-only audit trail.
 *
 * Text intake deliberately performs NO extraction. It stores exactly the text
 * the user supplied and nothing derived from it — no dates, amounts, deadlines
 * or recipient addresses are read out of free text here, because guessing those
 * from prose is inventing facts. Classification and explanation belong to the
 * assistant (P7), which runs on confirmed text and produces drafts only.
 */

export const TEXT_INTAKE_KINDS = ["pasted_text", "email_content"] as const
export type TextIntakeKind = (typeof TEXT_INTAKE_KINDS)[number]

export function isTextIntakeKind(value: unknown): value is TextIntakeKind {
  return typeof value === "string" && (TEXT_INTAKE_KINDS as readonly string[]).includes(value)
}

/**
 * Upper bound mirrors the `case_messages.content` CHECK
 * (`length(content) between 1 and 30000`) so a value accepted here cannot be
 * rejected by the database for length.
 */
export const TEXT_INTAKE_MAX_LENGTH = 30000

export type TextIntakeNormalized = {
  text: string
  kind: TextIntakeKind
  characterCount: number
}

export type TextIntakeRejection = "empty" | "too_long" | "unknown_kind"

/**
 * Normalizes intake text without altering its meaning.
 *
 * Normalization is limited to line-ending style and trailing newlines. It never
 * strips, rewrites or summarizes content, so what is stored is what the user
 * pasted.
 */
export function normalizeTextIntake(
  raw: string,
  kind: unknown,
): { ok: true; value: TextIntakeNormalized } | { ok: false; reason: TextIntakeRejection } {
  if (!isTextIntakeKind(kind)) return { ok: false, reason: "unknown_kind" }

  const text = raw.replace(/\r\n?/g, "\n").replace(/\n+$/, "")
  if (text.trim().length === 0) return { ok: false, reason: "empty" }
  if (text.length > TEXT_INTAKE_MAX_LENGTH) return { ok: false, reason: "too_long" }

  return { ok: true, value: { text, kind, characterCount: text.length } }
}

/**
 * Provenance written to the audit trail alongside the intake.
 *
 * The hash is over the normalised text, so a later edit is detectable without
 * storing a second copy of the content.
 */
export function textIntakeAuditMetadata(input: {
  kind: TextIntakeKind
  characterCount: number
  sha256: string
}): Record<string, unknown> {
  return {
    input_type: input.kind,
    character_count: input.characterCount,
    sha256: input.sha256,
  }
}