import "server-only"

import { extractPdfPages } from "@/lib/office/workflow/pdf-extraction"

export type ExtractionResult =
  | { status: "extracted"; text: string }
  | { status: "ocr_required"; text: "" }

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractionResult> {
  const pages = await extractPdfPages(bytes)
  const text = pages.map((page) => page.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
  return text ? { status: "extracted", text } : { status: "ocr_required", text: "" }
}

export async function extractDocumentText(file: Blob, mimeType: string): Promise<ExtractionResult> {
  if (mimeType !== "application/pdf") return { status: "ocr_required", text: "" }
  return extractPdfText(new Uint8Array(await file.arrayBuffer()))
}
