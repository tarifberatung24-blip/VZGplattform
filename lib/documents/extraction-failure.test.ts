import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ExtractionStageError,
  MAX_OCR_PAGES,
  TooManyScannedPagesError,
  classifyExtractionFailure,
  isRetryableExtractionFailure,
  type ExtractionFailureCode,
} from "./extraction-contract"
import { extractPdfPages } from "../office/workflow/pdf-extraction"
import { ocrScannedPdfPages } from "../office/workflow/pdf-ocr"

/**
 * P6 — explicit extraction failure states.
 *
 * Before this, every failure was "Auslesen fehlgeschlagen. Bitte erneut
 * versuchen.", including for files where retrying can never work. These tests
 * pin the reason each kind of failure gets, using the errors the real libraries
 * raise on real bytes rather than hand-made error objects where possible.
 */

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

async function errorFrom(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
  } catch (error) {
    return error
  }
  throw new Error("expected the call to throw")
}

describe("classifyExtractionFailure on real PDF bytes", () => {
  it("a corrupt PDF is reported as unreadable, not as a retryable failure", async () => {
    const corrupt = new TextEncoder().encode("%PDF-1.7 this is not a real pdf body")
    const error = await errorFrom(() => extractPdfPages(corrupt))
    expect(classifyExtractionFailure(new ExtractionStageError("parse", error))).toBe("DOCUMENT_UNREADABLE")
    expect(isRetryableExtractionFailure("DOCUMENT_UNREADABLE")).toBe(false)
  })

  it("a password-protected PDF is reported as such", async () => {
    const locked = readFileSync(join(root, "lib/documents/fixtures/password-protected.pdf"))
    const error = await errorFrom(() => extractPdfPages(locked))
    expect(classifyExtractionFailure(new ExtractionStageError("parse", error))).toBe(
      "DOCUMENT_PASSWORD_PROTECTED",
    )
    expect(isRetryableExtractionFailure("DOCUMENT_PASSWORD_PROTECTED")).toBe(false)
  })

  it("the file-level reason wins even when the OCR step hits it", async () => {
    const locked = readFileSync(join(root, "lib/documents/fixtures/password-protected.pdf"))
    const error = await errorFrom(() => extractPdfPages(locked))
    expect(classifyExtractionFailure(new ExtractionStageError("ocr", error))).toBe(
      "DOCUMENT_PASSWORD_PROTECTED",
    )
  })
})

describe("OCR page cap", () => {
  it("the OCR helper refuses more scanned pages than the shared cap with a typed error", async () => {
    const pages = Array.from({ length: MAX_OCR_PAGES + 1 }, (_, index) => index + 1)
    const error = await errorFrom(() => ocrScannedPdfPages(new Uint8Array([0x25]), pages))
    expect(error).toBeInstanceOf(TooManyScannedPagesError)
    expect(classifyExtractionFailure(error)).toBe("TOO_MANY_SCANNED_PAGES")
    expect(classifyExtractionFailure(new ExtractionStageError("ocr", error))).toBe(
      "TOO_MANY_SCANNED_PAGES",
    )
    expect(isRetryableExtractionFailure("TOO_MANY_SCANNED_PAGES")).toBe(false)
  })
})

describe("classification by pipeline step", () => {
  const generic = new Error("boom")

  it.each([
    ["read", "STORAGE_READ_FAILED"],
    ["parse", "DOCUMENT_UNREADABLE"],
    ["ocr", "OCR_FAILED"],
    ["persist", "PERSIST_FAILED"],
  ] as const)("a generic error in %s becomes %s", (stage, expected) => {
    expect(classifyExtractionFailure(new ExtractionStageError(stage, generic))).toBe(expected)
  })

  it("an error without a known step stays generic instead of being guessed", () => {
    expect(classifyExtractionFailure(generic)).toBe("EXTRACTION_FAILED")
    expect(classifyExtractionFailure("not even an error")).toBe("EXTRACTION_FAILED")
  })

  it("transient failures are retryable", () => {
    for (const code of ["STORAGE_READ_FAILED", "OCR_FAILED", "PERSIST_FAILED", "EXTRACTION_FAILED"] as const) {
      expect(isRetryableExtractionFailure(code)).toBe(true)
    }
  })
})

describe("wiring", () => {
  const allCodes: ExtractionFailureCode[] = [
    "STORAGE_READ_FAILED",
    "DOCUMENT_PASSWORD_PROTECTED",
    "DOCUMENT_UNREADABLE",
    "TOO_MANY_SCANNED_PAGES",
    "OCR_FAILED",
    "PERSIST_FAILED",
    "EXTRACTION_FAILED",
  ]

  it("the HORIZON extraction action classifies failures and audits the reason", () => {
    const action = read("lib/horizon/intake/extract-actions.ts")
    expect(action).toContain("classifyExtractionFailure(error)")
    expect(action).toContain('"document_text_extraction_failed"')
    // The old blanket catch that turned every failure into one generic code is gone.
    expect(action).not.toMatch(/catch\s*\{\s*await admin/)
  })

  it("the extract button has a message for every failure reason", () => {
    const button = read("components/guide/document-extract-button.tsx")
    for (const code of allCodes) {
      expect(button).toContain(`case "${code}":`)
    }
  })
})
