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
