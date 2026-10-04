import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { extractPdfPages, inspectPdf, mergePdfDocuments, splitPdfPages } from "./operations"

async function fixture(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) document.addPage([595, 842])
  return document.save()
}

describe("HORIZON PDF operations", () => {
  it("inspects and splits a PDF without changing the source", async () => {
    const source = await fixture(3)
    expect(await inspectPdf(source)).toEqual({ pageCount: 3, byteLength: source.byteLength })
    const pages = await splitPdfPages(source)
    expect(pages).toHaveLength(3)
    await expect(inspectPdf(pages[0])).resolves.toMatchObject({ pageCount: 1 })
  })

  it("extracts selected pages and merges documents in order", async () => {
    const first = await fixture(2)
    const second = await fixture(1)
    const selected = await extractPdfPages(first, [2])
    expect(await inspectPdf(selected)).toMatchObject({ pageCount: 1 })
    const merged = await mergePdfDocuments([first, second])
    expect(await inspectPdf(merged)).toMatchObject({ pageCount: 3 })
  })

  it("rejects invalid input and page ranges", async () => {
    await expect(inspectPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow("PDF_INVALID_HEADER")
    const source = await fixture(1)
    await expect(extractPdfPages(source, [2])).rejects.toThrow("PDF_PAGE_OUT_OF_RANGE")
  })
})
