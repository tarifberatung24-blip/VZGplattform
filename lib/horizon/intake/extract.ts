/**
 * P6 — turning extracted pages into the rows and status the case engine stores.
 *
 * Extracted page text is persisted to `document_pages`, which is the only table
 * that holds per-page text. Page-level fact evidence is impossible without it:
 * a fact can only carry `page_no` if the page it came from was stored, and the
 * P16 explanation reads the stored page text rather than re-reading the file.
 *
 * This module is deliberately pure. The IO (downloading the private object,
 * running extraction, writing rows) lives in the action next to it, so the parts
 * that decide *what* is stored can be tested without a network or a database.
 * The status rule mirrors the proven office extraction path exactly, so the same
 * document does not get a different lifecycle label depending on which stack
 * read it.
 */

import type { ExtractedPdfPage } from "../../office/workflow/pdf-extraction"

export type StoredPage = {
  pageNo: number
  text: string
  confidence: number
}

/**
 * The status rule lives in `lib/documents/extraction-contract.ts` so the HORIZON
 * intake and the office workflow path cannot disagree about when a document is
 * READY. Re-exported here because the intake action and its tests import it from
 * this module; the single definition stays in the shared contract.
 */
export { PAGE_CONFIDENCE_FLOOR, documentStatusAfterExtraction } from "../../documents/extraction-contract"

/**
 * Maps extracted pages to `document_pages` rows.
 *
 * `ownerId` and `caseId` are taken from the already-authorized document row, not
 * from the caller, so a row cannot be written under a different owner or case
 * than the document it belongs to. The table's composite foreign key
 * `(document_id, case_id, owner_id)` would reject such a row anyway, but building
 * it correctly here means the failure cannot happen at all.
 */
export function toStoredPageRows(input: {
  ownerId: string
  caseId: string
  documentId: string
  pages: readonly ExtractedPdfPage[]
}): Array<{
  owner_id: string
  case_id: string
  document_id: string
  page_no: number
  text_content: string
  confidence: number
}> {
  return input.pages.map((page) => ({
    owner_id: input.ownerId,
    case_id: input.caseId,
    document_id: input.documentId,
    page_no: page.pageNo,
    text_content: page.text,
    confidence: page.confidence,
  }))
}

/**
 * Whether extraction should even be attempted for a document.
 *
 * Images have no text layer at all and go through the single-page OCR path, so
 * the PDF text extractor must not be handed one. Stated as a function so the
 * action and its UI share one answer instead of each checking the MIME type.
 */
export function extractionRouteFor(mime: string): "pdf" | "image" | "unsupported" {
  if (mime === "application/pdf") return "pdf"
  if (mime === "image/jpeg" || mime === "image/png") return "image"
  return "unsupported"
}
