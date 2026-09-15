import { createWorker } from 'tesseract.js'

export type OcrResult = {
  text: string
  confidence: number
}

export interface OcrProvider {
  recognize(input: Uint8Array): Promise<OcrResult>
}

export class TesseractOcrProvider implements OcrProvider {
  async recognize(input: Uint8Array): Promise<OcrResult> {
    const worker = await createWorker('deu+eng')
    try {
      const result = await worker.recognize(Buffer.from(input))
      return {
        text: result.data.text.replace(/\s+/g, ' ').trim(),
        confidence: Math.max(0, Math.min(1, result.data.confidence / 100)),
      }
    } finally {
      await worker.terminate()
    }
  }
}
