export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export type SupportedDocument = "application/pdf" | "image/jpeg" | "image/png"

export type DocumentValidationCode =
  | "FILE_TYPE_NOT_ALLOWED"
  | "FILE_TOO_LARGE"
  | "FILE_EMPTY"
  | "FILE_INVALID_SIGNATURE"
  | "FILE_NAME_INVALID"

export class DocumentValidationError extends Error {
  code: DocumentValidationCode

  constructor(code: DocumentValidationCode) {
    super(code)
    this.name = "DocumentValidationError"
    this.code = code
  }
}

const signatures: Record<SupportedDocument, (bytes: Uint8Array) => boolean> = {
  "application/pdf": (bytes) => String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-",
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a,
}

export function normalizeDocumentName(name: string) {
  const normalizedInput = name.normalize("NFKC")
  if (/[\\/]/.test(normalizedInput) || normalizedInput.includes("..")) {
    throw new DocumentValidationError("FILE_NAME_INVALID")
  }
  const normalized = normalizedInput.replace(/[\u0000-\u001f]/g, "").trim()
  if (!normalized || normalized.length > 180 || normalized === "." || normalized === "..") {
    throw new DocumentValidationError("FILE_NAME_INVALID")
  }
  return normalized
}

export async function validateDocument(file: File) {
  if (file.size <= 0) throw new DocumentValidationError("FILE_EMPTY")
  if (file.size > MAX_DOCUMENT_BYTES) throw new DocumentValidationError("FILE_TOO_LARGE")
  const type = file.type as SupportedDocument
  if (!(type in signatures)) throw new DocumentValidationError("FILE_TYPE_NOT_ALLOWED")
  normalizeDocumentName(file.name)
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!signatures[type](bytes)) throw new DocumentValidationError("FILE_INVALID_SIGNATURE")
  return { name: normalizeDocumentName(file.name), type, size: file.size }
}

export function isCanonicalSupabase(url = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  return url?.replace(/\/$/, "") === "https://sophzmteuemggqlstebw.supabase.co"
}
