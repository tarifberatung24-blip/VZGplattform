import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { TesseractOcrProvider } from './ocr-provider'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_OCR_PAGES = 10

export async function ocrScannedPdfPages(input: Uint8Array | ArrayBuffer, pageNumbers: number[]) {
  const bytes = new Uint8Array(input instanceof Uint8Array ? input : new Uint8Array(input))
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_BYTES) throw new Error('PDF must be between 1 byte and 10 MB')
  if (pageNumbers.length > MAX_OCR_PAGES) throw new Error('OCR is limited to 10 pages per PDF')
  const document = await getDocument({ data: bytes }).promise
  const provider = new TesseractOcrProvider()
  try {
    return await Promise.all(pageNumbers.map(async (pageNo) => {
      if (pageNo < 1 || pageNo > document.numPages) throw new Error(`Invalid PDF page ${pageNo}`)
      const page = await document.getPage(pageNo)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const canvasContext = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext, viewport }).promise
      const result = await provider.recognize(canvas.toBuffer('image/png'))
      page.cleanup()
      return { pageNo, text: result.text, confidence: result.text ? result.confidence : 0, needsOcr: !result.text || result.confidence < 0.75 }
    }))
  } finally {
    await document.cleanup()
  }
}
