import { PDFDocument } from "pdf-lib"

export type PdfInspection = {
  pageCount: number
  byteLength: number
}

function assertPdfBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new Error("PDF_EMPTY")
  const header = new TextDecoder().decode(bytes.slice(0, 5))
  if (header !== "%PDF-") throw new Error("PDF_INVALID_HEADER")
}

function assertPageNumber(pageNumber: number, pageCount: number): void {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
    throw new Error("PDF_PAGE_OUT_OF_RANGE")
  }
}

/** Reads basic metadata without changing the source bytes. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  assertPdfBytes(bytes)
  const document = await PDFDocument.load(bytes, { ignoreEncryption: false })
  return { pageCount: document.getPageCount(), byteLength: bytes.byteLength }
}

/** Extracts selected 1-based pages into a new PDF. */
export async function extractPdfPages(
  bytes: Uint8Array,
  pageNumbers: readonly number[],
): Promise<Uint8Array> {
  assertPdfBytes(bytes)
  if (pageNumbers.length === 0) throw new Error("PDF_NO_PAGES_SELECTED")

  const source = await PDFDocument.load(bytes, { ignoreEncryption: false })
  const pageCount = source.getPageCount()
  for (const pageNumber of pageNumbers) assertPageNumber(pageNumber, pageCount)

  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, pageNumbers.map((pageNumber) => pageNumber - 1))
  for (const page of pages) output.addPage(page)
  return output.save()
}

/** Splits a PDF into one new PDF per 1-based page. */
export async function splitPdfPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const { pageCount } = await inspectPdf(bytes)
  return Promise.all(
    Array.from({ length: pageCount }, (_, index) => extractPdfPages(bytes, [index + 1])),
  )
}

/** Merges PDFs in the supplied order into a new PDF. */
export async function mergePdfDocuments(documents: readonly Uint8Array[]): Promise<Uint8Array> {
  if (documents.length === 0) throw new Error("PDF_NO_DOCUMENTS")

  const output = await PDFDocument.create()
  for (const bytes of documents) {
    assertPdfBytes(bytes)
    const source = await PDFDocument.load(bytes, { ignoreEncryption: false })
    const pages = await output.copyPages(source, source.getPageIndices())
    for (const page of pages) output.addPage(page)
  }
  return output.save()
}
