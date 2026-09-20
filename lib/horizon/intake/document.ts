/**
 * P6 — file intake: PDF, photo, screenshot.
 *
 * Three of the five P6 input types are files, and they land on the canonical
 * case spine rather than a separate stack: a `source_documents` row owned by the
 * acting user, plus the object in the private `source-documents` bucket at
 * `{ownerId}/{caseId}/{documentId}-{name}`. That path shape is not a convention
 * — the table's CHECK requires `split_part(path,'/',1)=owner_id` and
 * `split_part(path,'/',2)=case_id`, and the bucket's read policy requires the
 * same two folders, so a path built any other way is rejected by the database.
 *
 * MIME admission is unchanged. The three accepted types below are exactly the
 * `source_documents.mime` CHECK and the bucket allowlist; a test asserts they
 * stay equal, so this module cannot drift into admitting more than the database
 * will store or the bucket will hold.
 *
 * `File.type` is client-supplied and therefore untrustworthy — a text file named
 * `.pdf` would pass a MIME-only check. Validation is done on the leading bytes,
 * which is what makes the persisted `mime` mean something.
 */

import {
  DocumentValidationError,
  MAX_DOCUMENT_BYTES,
  validateDocument,
} from "../../documents/validation"

export const CASE_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export type CaseDocumentMime = (typeof CASE_DOCUMENT_MIME_TYPES)[number]

export const CASE_DOCUMENT_KINDS = ["pdf", "photo", "screenshot"] as const
export type CaseDocumentKind = (typeof CASE_DOCUMENT_KINDS)[number]

/**
 * Stable failure codes. The UI localizes these rather than surfacing a provider
 * message, so a raw storage or Postgres error cannot leak into the interface.
 */
export type CaseDocumentFailureCode =
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_NOT_ALLOWED"
  | "FILE_INVALID_SIGNATURE"
  | "FILE_NAME_INVALID"
  | "CASE_NOT_FOUND"
  | "UNAUTHORIZED"
  | "STORAGE_NOT_CONFIGURED"
  | "UPLOAD_FAILED"

export const CASE_DOCUMENT_MAX_BYTES = MAX_DOCUMENT_BYTES

export function isCaseDocumentMime(value: unknown): value is CaseDocumentMime {
  return (
    typeof value === "string" &&
    (CASE_DOCUMENT_MIME_TYPES as readonly string[]).includes(value)
  )
}

export function isCaseDocumentKind(value: unknown): value is CaseDocumentKind {
  return (
    typeof value === "string" && (CASE_DOCUMENT_KINDS as readonly string[]).includes(value)
  )
}

/**
 * What the user considered the upload to be, for labelling and audit only.
 *
 * Deliberately not derived from the MIME type alone: a screenshot of a letter and
 * a photographed letter are both PNG or JPEG, so the distinction is about what
 * the user was doing, not about the bytes. It never changes validation, the
 * storage path, or any later extraction — only the label the user sees. Falling
 * back to the MIME type keeps the field total rather than optional.
 */
export function classifyCaseDocumentKind(intent: unknown, mime: string): CaseDocumentKind {
  if (isCaseDocumentKind(intent)) return intent
  return mime === "application/pdf" ? "pdf" : "photo"
}

/**
 * Builds the storage path required by both the table CHECK and the bucket policy.
 *
 * The file name is reduced to a safe character set because it becomes an object
 * key; the surrounding owner and case folders are the authorization boundary and
 * are inserted verbatim, never derived from the file name.
 */
export function caseDocumentStoragePath(input: {
  ownerId: string
  caseId: string
  documentId: string
  fileName: string
}): string {
  const sanitized = input.fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    // Collapse dot runs so a name like "../../etc/passwd" cannot carry a
    // traversal sequence into the object key even after separators are stripped.
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .slice(0, 120)
  // A name of only separators (" ", "…") sanitizes to underscores, which is a
  // legal object key but tells the user nothing about the file. Fall back only
  // when nothing meaningful survives.
  const safeName = /[a-zA-Z0-9]/.test(sanitized) ? sanitized : "document"
  return `${input.ownerId}/${input.caseId}/${input.documentId}-${safeName}`
}

/**
 * Shows the file name without the storage path.
 *
 * The path is `{ownerId}/{caseId}/{documentId}-{name}`, so rendering it verbatim
 * puts the owner's user id and the internal case id on screen. Those are
 * identifiers the user never needs and should not have to reason about; only the
 * trailing file name is meaningful to them.
 */
export function documentDisplayName(path: string): string {
  const segments = path.split("/")
  const last = segments[segments.length - 1] || path
  // The stored object key is `{documentId}-{name}` and the document id is a
  // uuid, which itself contains dashes — so the prefix is matched structurally
  // rather than by taking the first dash.
  const withoutId = last.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  )
  return withoutId || last
}

export type ValidatedCaseDocument = {
  name: string
  mime: CaseDocumentMime
  sizeBytes: number
}

/**
 * Validates a candidate upload and narrows it to the admitted MIME set.
 *
 * Returns a failure code rather than throwing, so the caller renders an explicit
 * error state for every rejection path instead of a generic failure.
 */
export async function validateCaseDocumentFile(
  file: File,
): Promise<{ ok: true; value: ValidatedCaseDocument } | { ok: false; code: CaseDocumentFailureCode }> {
  try {
    const metadata = await validateDocument(file)
    if (!isCaseDocumentMime(metadata.type)) return { ok: false, code: "FILE_TYPE_NOT_ALLOWED" }
    return {
      ok: true,
      value: { name: metadata.name, mime: metadata.type, sizeBytes: metadata.size },
    }
  } catch (error) {
    if (error instanceof DocumentValidationError) return { ok: false, code: error.code }
    return { ok: false, code: "UPLOAD_FAILED" }
  }
}