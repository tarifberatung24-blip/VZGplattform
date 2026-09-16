import "server-only"

export async function extractDocumentForAnalysis(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer())
  if (file.type === "application/pdf") {
    const { default: pdfParse } = await import("pdf-parse")
    const parsed = await pdfParse(bytes)
    const text = parsed.text.replace(/\u0000/g, "").trim()
    if (text.length < 20) throw new Error("DOCUMENT_TEXT_NOT_EXTRACTED")
    return { kind: "text" as const, value: text.slice(0, 60_000) }
  }
  if (file.type === "image/jpeg" || file.type === "image/png") {
    return { kind: "image" as const, value: `data:${file.type};base64,${bytes.toString("base64")}` }
  }
  throw new Error("FILE_TYPE_NOT_ALLOWED")
}
