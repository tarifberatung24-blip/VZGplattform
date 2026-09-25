"use server"

import { revalidatePath } from "next/cache"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { extractPdfPages } from "@/lib/office/workflow/pdf-extraction"
import { ocrScannedPdfPages } from "@/lib/office/workflow/pdf-ocr"
import { TesseractOcrProvider } from "@/lib/office/workflow/ocr-provider"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import {
  PAGE_CONFIDENCE_FLOOR,
  documentStatusAfterExtraction,
  extractionRouteFor,
  toStoredPageRows,
} from "./extract"

export type ExtractDocumentState = {
  error:
    | "missing_case"
    | "missing_document"
    | "CASE_NOT_FOUND"
    | "UNAUTHORIZED"
    | "STORAGE_NOT_CONFIGURED"
    | "DOCUMENT_NOT_FOUND"
    | "UNSUPPORTED_TYPE"
    | "EXTRACTION_FAILED"
    | null
  ok: boolean
  pageCount: number
}

const CASE_DOCUMENT_BUCKET = "source-documents"

/**
 * P6 — reads a case document into per-page text.
 *
 * Without this the intake stores a file nobody can read: `document_pages` stays
 * empty, so the P16 explanation has no text and no extracted fact can ever carry
 * a `page_no`. This is the missing step between "there is a file on the case" and
 * "the case knows what the file says".
 *
 * The read goes through the service-role client for the same reason the write in
 * `document-actions.ts` does: the `source-documents` bucket grants authenticated
 * users read-only object access, but its SELECT policy is not something to lean
 * on for an extraction that must stay inside the case boundary. Ownership is
 * proven first with `getMine` (the case) plus an owner-scoped `source_documents`
 * read (the document), and both must pass before any bytes are touched.
 *
 * The document is marked `EXTRACTING` before the work and left as `FAILED` if it
 * throws, so a document that was read is never indistinguishable from one that
 * was not. Extracted pages are upserted on `(document_id, page_no)`, so running
 * this twice replaces the text rather than duplicating it.
 */
export async function extractCaseDocument(
  _previous: ExtractDocumentState,
  formData: FormData,
): Promise<ExtractDocumentState> {
  const rawCaseId = formData.get("caseId")
  const rawDocumentId = formData.get("documentId")
  const rawLocale = formData.get("locale")

  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (typeof rawCaseId !== "string" || rawCaseId.length === 0) {
    return { error: "missing_case", ok: false, pageCount: 0 }
  }
  if (typeof rawDocumentId !== "string" || rawDocumentId.length === 0) {
    return { error: "missing_document", ok: false, pageCount: 0 }
  }

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) {
    return { error: "UNAUTHORIZED", ok: false, pageCount: 0 }
  }

  const owned = await engine.repository.getMine(rawCaseId)
  if (owned.error || !owned.data) return { error: "CASE_NOT_FOUND", ok: false, pageCount: 0 }

  const admin = createAdminClient()
  if (!admin) return { error: "STORAGE_NOT_CONFIGURED", ok: false, pageCount: 0 }

  const userId = engine.userId
  const { data: document, error: lookupError } = await admin
    .from("source_documents")
    .select("id, owner_id, case_id, path, mime, size_bytes")
    .eq("id", rawDocumentId)
    .eq("owner_id", userId)
    .eq("case_id", rawCaseId)
    .maybeSingle()

  if (lookupError) return { error: "EXTRACTION_FAILED", ok: false, pageCount: 0 }
  if (!document) return { error: "DOCUMENT_NOT_FOUND", ok: false, pageCount: 0 }

  const route = extractionRouteFor(document.mime)
  if (route === "unsupported") return { error: "UNSUPPORTED_TYPE", ok: false, pageCount: 0 }

  await admin
    .from("source_documents")
    .update({ status: "EXTRACTING" })
    .eq("id", document.id)
    .eq("owner_id", userId)

  const downloaded = await admin.storage.from(CASE_DOCUMENT_BUCKET).download(document.path)
  if (downloaded.error) {
    await admin
      .from("source_documents")
      .update({ status: "FAILED" })
      .eq("id", document.id)
      .eq("owner_id", userId)
    return { error: "EXTRACTION_FAILED", ok: false, pageCount: 0 }
  }

  try {
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer())

    const pages =
      route === "pdf"
        ? await extractPdfBytes(bytes)
        : await extractImageBytes(bytes)

    const status = documentStatusAfterExtraction(pages)

    const upserted = await admin
      .from("document_pages")
      .upsert(
        toStoredPageRows({
          ownerId: userId,
          caseId: document.case_id,
          documentId: document.id,
          pages,
        }),
        { onConflict: "document_id,page_no" },
      )
    if (upserted.error) throw new Error(upserted.error.message)

    const updated = await admin
      .from("source_documents")
      .update({ status })
      .eq("id", document.id)
      .eq("owner_id", userId)
    if (updated.error) throw new Error(updated.error.message)

    await engine.repository.appendAudit(rawCaseId, "document_text_extracted", {
      document_id: document.id,
      pages: pages.length,
      status,
      low_confidence_pages: pages
        .filter((page) => page.confidence < PAGE_CONFIDENCE_FLOOR)
        .map((page) => page.pageNo),
    })

    revalidatePath(`/${locale}/guide/${rawCaseId}`)
    return { error: null, ok: true, pageCount: pages.length }
  } catch {
    await admin
      .from("source_documents")
      .update({ status: "FAILED" })
      .eq("id", document.id)
      .eq("owner_id", userId)
    return { error: "EXTRACTION_FAILED", ok: false, pageCount: 0 }
  }
}

/**
 * PDF text per page, falling back to OCR page by page only where the text layer
 * is empty. A scanned page has no embedded text, and guessing that such a page
 * says nothing would silently drop the part of the document that was a picture.
 */
async function extractPdfBytes(bytes: Uint8Array) {
  const embedded = await extractPdfPages(bytes)
  const scanned = embedded.filter((page) => page.needsOcr).map((page) => page.pageNo)
  if (scanned.length === 0) return embedded
  const ocr = await ocrScannedPdfPages(bytes, scanned)
  return embedded.map((page) => ocr.find((entry) => entry.pageNo === page.pageNo) ?? page)
}

/** A photo or screenshot is a single page with no text layer, so OCR is the path. */
async function extractImageBytes(bytes: Uint8Array) {
  const result = await new TesseractOcrProvider().recognize(bytes)
  const confidence = result.text ? result.confidence : 0
  return [{ pageNo: 1, text: result.text, confidence, needsOcr: confidence < PAGE_CONFIDENCE_FLOOR }]
}
