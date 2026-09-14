import "server-only"

import { inflateRawSync } from "node:zlib"

export type ExtractionResult =
  | { status: "extracted"; text: string }
  | { status: "ocr_required"; text: "" }

function decodePdfString(value: string) {
  return value
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
}

function extractOperators(buffer: Buffer) {
  const source = buffer.toString("latin1")
  const text: string[] = []
  for (const match of source.matchAll(/\(([^()]*)\)\s*T[Jj]/g)) text.push(decodePdfString(match[1]))
  for (const match of source.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    for (const part of match[1].matchAll(/\(([^()]*)\)/g)) text.push(decodePdfString(part[1]))
  }
  return text.join(" ").replace(/\s+/g, " ").trim()
}

export function extractPdfText(bytes: Uint8Array): ExtractionResult {
  const source = Buffer.from(bytes)
  const candidates = [source]
  for (const match of source.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const raw = Buffer.from(match[1], "latin1")
    try {
      candidates.push(inflateRawSync(raw))
    } catch {
      candidates.push(raw)
    }
  }
  const text = candidates.map(extractOperators).filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
  return text ? { status: "extracted", text } : { status: "ocr_required", text: "" }
}

export async function extractDocumentText(file: Blob, mimeType: string): Promise<ExtractionResult> {
  if (mimeType !== "application/pdf") return { status: "ocr_required", text: "" }
  return extractPdfText(new Uint8Array(await file.arrayBuffer()))
}
