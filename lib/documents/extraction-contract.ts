/**
 * P6 — the one extraction contract both document stacks share.
 *
 * The HORIZON intake path and the older office workflow path read the same
 * files into the same `document_pages` table, but each carried its own copy of
 * the "when is a document READY" rule. Two copies drift: one of them was fixed
 * to stop reporting an empty extraction as READY, and the other kept the bug,
 * so the same unreadable file could be labelled differently depending on which
 * code path happened to pick it up.
 *
 * This module is the single source of that rule. It is deliberately pure — no
 * IO, no database, no provider — so both stacks can depend on it without either
 * pulling in the other's server-only imports.
 */

export type DocumentStatus = "READY" | "NEEDS_CONFIRMATION"

/**
 * Pages below this confidence, and pages that produced no text at all, require a
 * human to look before anything is built on them.
 */
export const PAGE_CONFIDENCE_FLOOR = 0.75

/**
 * The lifecycle status a document takes after extraction.
 *
 * A page that OCR could not read, or read with low confidence, is still stored —
 * dropping it would lose the fact that the page exists — but the document is
 * marked `NEEDS_CONFIRMATION` so the user is asked rather than the text being
 * treated as reliable.
 *
 * Zero pages is also `NEEDS_CONFIRMATION`: "nothing was read" is not "read
 * successfully", and reporting READY over an empty extraction would tell the user
 * a document was understood when no text exists to have understood.
 */
export function documentStatusAfterExtraction(
  pages: readonly { text: string; confidence: number }[],
): DocumentStatus {
  if (pages.length === 0) return "NEEDS_CONFIRMATION"
  const uncertain = pages.some(
    (page) => page.text.trim().length === 0 || page.confidence < PAGE_CONFIDENCE_FLOOR,
  )
  return uncertain ? "NEEDS_CONFIRMATION" : "READY"
}

/**
 * Whether a page needs a human to confirm it. Stated once so a caller classifying
 * a single page (the OCR image path) cannot disagree with the whole-document rule.
 */
export function pageNeedsConfirmation(page: { text: string; confidence: number }): boolean {
  return page.text.trim().length === 0 || page.confidence < PAGE_CONFIDENCE_FLOOR
}

/**
 * Files the extraction paths can read. A single list so admission and routing
 * cannot disagree about what "supported" means.
 */
export const EXTRACTABLE_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const

export type ExtractionRoute = "pdf" | "image" | "unsupported"

/**
 * Whether extraction should even be attempted for a document, and by which path.
 *
 * Images have no text layer at all and go through the single-page OCR path, so
 * the PDF text extractor must not be handed one.
 */
export function extractionRouteFor(mime: string): ExtractionRoute {
  if (mime === "application/pdf") return "pdf"
  if (mime === "image/jpeg" || mime === "image/png") return "image"
  return "unsupported"
}

/**
 * Most scanned pages one OCR run reads. Scanned pages are rendered and recognised
 * one by one, which is slow and memory-heavy, so the run is capped. Stated here so
 * the cap and the user-facing "too many scanned pages" state cannot drift apart.
 */
export const MAX_OCR_PAGES = 10

/**
 * Why a document could not be read. Before this, every failure collapsed into one
 * generic "extraction failed", so a password-protected PDF, a corrupt file, a
 * scan that is too long for OCR and a storage outage all told the user the same
 * thing — and "try again" is the wrong advice for three of the four.
 *
 * The document row still settles at `FAILED` (no schema change); the reason is
 * returned to the caller and written to the audit trail.
 */
export type ExtractionFailureCode =
  | "STORAGE_READ_FAILED"
  | "DOCUMENT_PASSWORD_PROTECTED"
  | "DOCUMENT_UNREADABLE"
  | "TOO_MANY_SCANNED_PAGES"
  | "OCR_FAILED"
  | "PERSIST_FAILED"
  | "EXTRACTION_FAILED"

/** The step of the extraction pipeline an error came from. */
export type ExtractionStage = "read" | "parse" | "ocr" | "persist"

/** An error tagged with the pipeline step it came from, so it can be classified. */
export class ExtractionStageError extends Error {
  readonly stage: ExtractionStage
  readonly original: unknown

  constructor(stage: ExtractionStage, original: unknown) {
    super(original instanceof Error ? original.message : String(original))
    this.name = "ExtractionStageError"
    this.stage = stage
    this.original = original
  }
}

/** Raised before OCR starts when a PDF has more scanned pages than one run reads. */
export class TooManyScannedPagesError extends Error {
  readonly scannedPages: number

  constructor(scannedPages: number) {
    super(`OCR is limited to ${MAX_OCR_PAGES} pages per PDF; ${scannedPages} scanned pages found`)
    this.name = "TooManyScannedPagesError"
    this.scannedPages = scannedPages
  }
}

function errorName(error: unknown): string | null {
  return error && typeof error === "object" && "name" in error && typeof error.name === "string"
    ? error.name
    : null
}

/**
 * Maps an extraction error to the reason shown to the user.
 *
 * File-level problems are recognised by the error class pdf.js raises
 * (`PasswordException`, `InvalidPDFException`) wherever they surface, because the
 * OCR path parses the same PDF again and can hit them too. Everything else is
 * classified by the step it came from. An error without a known step stays the
 * generic `EXTRACTION_FAILED` rather than being guessed into a specific reason.
 */
export function classifyExtractionFailure(error: unknown): ExtractionFailureCode {
  const stage = error instanceof ExtractionStageError ? error.stage : null
  const cause = error instanceof ExtractionStageError ? error.original : error
  const name = errorName(cause)

  if (cause instanceof TooManyScannedPagesError || name === "TooManyScannedPagesError") {
    return "TOO_MANY_SCANNED_PAGES"
  }
  if (name === "PasswordException") return "DOCUMENT_PASSWORD_PROTECTED"
  if (name === "InvalidPDFException") return "DOCUMENT_UNREADABLE"

  switch (stage) {
    case "read":
      return "STORAGE_READ_FAILED"
    case "parse":
      return "DOCUMENT_UNREADABLE"
    case "ocr":
      return "OCR_FAILED"
    case "persist":
      return "PERSIST_FAILED"
    default:
      return "EXTRACTION_FAILED"
  }
}

/**
 * Whether retrying the same file can help. A storage outage, a failed write or a
 * crashed OCR worker are transient; a locked, corrupt or over-long file fails the
 * same way every time, so the UI should say what to change instead of "try again".
 */
export function isRetryableExtractionFailure(code: ExtractionFailureCode): boolean {
  return (
    code === "STORAGE_READ_FAILED" ||
    code === "OCR_FAILED" ||
    code === "PERSIST_FAILED" ||
    code === "EXTRACTION_FAILED"
  )
}
