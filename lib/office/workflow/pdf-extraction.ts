import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const MAX_BYTES = 10 * 1024 * 1024

export type ExtractedPdfPage = {
  pageNo: number
  text: string
  confidence: number
  needsOcr: boolean
}

export async function extractPdfPages(input: Uint8Array | ArrayBuffer): Promise<ExtractedPdfPage[]> {
  const bytes = new Uint8Array(input instanceof Uint8Array ? input : new Uint8Array(input))
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_BYTES) throw new Error('PDF must be between 1 byte and 10 MB')

  const document = await getDocument({ data: bytes }).promise
  const pages: ExtractedPdfPage[] = []
  try {
    for (let pageNo = 1; pageNo <= document.numPages; pageNo += 1) {
      const page = await document.getPage(pageNo)
      const content = await page.getTextContent()
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim()
      const needsOcr = text.length === 0
      pages.push({ pageNo, text, confidence: needsOcr ? 0 : 1, needsOcr })
      page.cleanup()
    }
    return pages
  } finally {
    await document.cleanup()
  }
}
