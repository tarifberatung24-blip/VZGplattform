import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CASE_DOCUMENT_KINDS,
  CASE_DOCUMENT_MAX_BYTES,
  CASE_DOCUMENT_MIME_TYPES,
  caseDocumentStoragePath,
  documentDisplayName,
  classifyCaseDocumentKind,
  isCaseDocumentKind,
  isCaseDocumentMime,
  validateCaseDocumentFile,
} from "./document"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

const baseline = read("supabase/migrations/20260909112037_kintex_assistant_baseline.sql")
const horizonEngine = read("supabase/migrations/20260919150000_horizon_case_engine.sql")

/** Builds a File whose declared type and real bytes can disagree on purpose. */
function makeFile(name: string, type: string, bytes: number[]) {
  return new File([new Uint8Array(bytes)], name, { type })
}

const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]

describe("P6 file intake MIME contract", () => {
  /**
   * The admitted set is not a free choice: it is the intersection of what the
   * database CHECK will store and what the bucket allowlist will hold. If this
   * module ever drifts wider, uploads fail at the database after the object is
   * already in the bucket; if it drifts narrower, a supported type is refused in
   * the UI for no reason. Asserting against the SQL keeps the three in step.
   */
  it("accepts exactly the MIME types the source_documents CHECK admits", () => {
    expect([...CASE_DOCUMENT_MIME_TYPES]).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ])
    for (const mime of CASE_DOCUMENT_MIME_TYPES) {
      expect(baseline).toContain(`'${mime}'`)
    }
  })

  it("does not admit any type that the CHECK would reject", () => {
    expect(baseline).toContain(
      "check(mime in ('application/pdf','image/jpeg','image/png'))",
    )
    expect(isCaseDocumentMime("text/plain")).toBe(false)
    expect(isCaseDocumentMime("image/gif")).toBe(false)
    expect(isCaseDocumentMime("application/pdf")).toBe(true)
  })

  it("accepts exactly the three file input types of the five P6 input types", () => {
    expect([...CASE_DOCUMENT_KINDS]).toEqual(["pdf", "photo", "screenshot"])
  })
})

describe("validateCaseDocumentFile", () => {
  it("accepts a real PDF, photo and screenshot", async () => {
    const pdf = await validateCaseDocumentFile(makeFile("a.pdf", "application/pdf", PDF_BYTES))
    expect(pdf.ok).toBe(true)
    if (pdf.ok) expect(pdf.value.mime).toBe("application/pdf")

    const photo = await validateCaseDocumentFile(makeFile("b.jpg", "image/jpeg", JPEG_BYTES))
    expect(photo.ok).toBe(true)
    if (photo.ok) expect(photo.value.mime).toBe("image/jpeg")

    const shot = await validateCaseDocumentFile(makeFile("c.png", "image/png", PNG_BYTES))
    expect(shot.ok).toBe(true)
    if (shot.ok) expect(shot.value.mime).toBe("image/png")
  })

  /**
   * The central safety property: the client declares the MIME type, so a file
   * that claims to be a PDF but is not must be refused. Without the magic-byte
   * check the stored `mime` column would record a claim rather than a fact, and
   * every downstream reader — extraction, OCR, the assistant — would trust it.
   */
  it("refuses a file whose bytes do not match its declared type", async () => {
    const spoofed = await validateCaseDocumentFile(
      makeFile("invoice.pdf", "application/pdf", [0x50, 0x4b, 0x03, 0x04]),
    )
    expect(spoofed.ok).toBe(false)
    if (!spoofed.ok) expect(spoofed.code).toBe("FILE_INVALID_SIGNATURE")
  })

  it("refuses an image that claims to be a PNG but is JPEG", async () => {
    const spoofed = await validateCaseDocumentFile(makeFile("x.png", "image/png", JPEG_BYTES))
    expect(spoofed.ok).toBe(false)
    if (!spoofed.ok) expect(spoofed.code).toBe("FILE_INVALID_SIGNATURE")
  })

  it("refuses unsupported declared types before reading content", async () => {
    const result = await validateCaseDocumentFile(
      makeFile("notes.txt", "text/plain", [0x68, 0x69]),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("FILE_TYPE_NOT_ALLOWED")
  })

  it("refuses an empty file", async () => {
    const result = await validateCaseDocumentFile(makeFile("empty.pdf", "application/pdf", []))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("FILE_EMPTY")
  })

  it("refuses a path traversal attempt in the file name", async () => {
    const result = await validateCaseDocumentFile(
      makeFile("../escape.pdf", "application/pdf", PDF_BYTES),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("FILE_NAME_INVALID")
  })
})

describe("caseDocumentStoragePath", () => {
  /**
   * The path is the authorization boundary, not a naming convention: the
   * `source_documents` CHECK requires the first two segments to be the owner id
   * and the case id, and the bucket read policy requires the same. A path built
   * from anything else is rejected by the database.
   */
  it("places owner and case as the first two folders, as the CHECK requires", () => {
    const path = caseDocumentStoragePath({
      ownerId: "22222222-2222-2222-2222-222222222222",
      caseId: "11111111-1111-1111-1111-111111111111",
      documentId: "33333333-3333-3333-3333-333333333333",
      fileName: "brief.pdf",
    })
    const segments = path.split("/")
    expect(segments[0]).toBe("22222222-2222-2222-2222-222222222222")
    expect(segments[1]).toBe("11111111-1111-1111-1111-111111111111")
    expect(path).toContain("33333333-3333-3333-3333-333333333333")
  })

  it("neutralizes separators and traversal sequences in the file name", () => {
    const path = caseDocumentStoragePath({
      ownerId: "o",
      caseId: "c",
      documentId: "d",
      fileName: "../../etc/passwd",
    })
    expect(path.startsWith("o/c/d-")).toBe(true)
    const name = path.slice("o/c/d-".length)
    expect(name).not.toContain("/")
    expect(name.split("").filter((char, i) => name.slice(i, i + 2) === "..")).toHaveLength(0)
  })

  it("falls back to a safe name when the name reduces to nothing", () => {
    const path = caseDocumentStoragePath({
      ownerId: "o",
      caseId: "c",
      documentId: "d",
      fileName: "   ",
    })
    expect(path).toBe("o/c/d-document")
  })
})

describe("classifyCaseDocumentKind", () => {
  it("keeps the user's stated kind so a screenshot is labelled as one", () => {
    expect(classifyCaseDocumentKind("screenshot", "image/png")).toBe("screenshot")
    expect(classifyCaseDocumentKind("photo", "image/jpeg")).toBe("photo")
  })

  it("never widens the admitted kind set from a forged form value", () => {
    expect(isCaseDocumentKind("executable")).toBe(false)
    expect(classifyCaseDocumentKind("executable", "image/png")).toBe("photo")
  })

  it("falls back from the MIME type when no kind is supplied", () => {
    expect(classifyCaseDocumentKind(undefined, "application/pdf")).toBe("pdf")
    expect(classifyCaseDocumentKind(undefined, "image/jpeg")).toBe("photo")
  })
})

describe("documentDisplayName", () => {
  /**
   * The documents panel used to render the raw storage path, which contains the
   * owner's user id and the internal case id. Those are not identifiers the user
   * needs on screen, so the panel shows only the file name.
   */
  it("shows only the file name, not the owner or case identifiers", () => {
    const label = documentDisplayName(
      "22222222-2222-2222-2222-222222222222/11111111-1111-1111-1111-111111111111/33333333-3333-3333-3333-333333333333-arbeitgeberbrief.pdf",
    )
    expect(label).toBe("arbeitgeberbrief.pdf")
    expect(label).not.toContain("22222222")
    expect(label).not.toContain("11111111")
  })

  it("leaves a name without a document-id prefix intact", () => {
    expect(documentDisplayName("owner/case/brief.pdf")).toBe("brief.pdf")
  })
})

describe("P6 file intake stays non-destructive", () => {
  it("never drops the MIME CHECK or widens the bucket allowlist", () => {
    const horizonMigrations = [horizonEngine]
    for (const migration of horizonMigrations) {
      expect(migration).not.toMatch(/drop\s+constraint/i)
    }
    expect(read("lib/horizon/intake/document.ts")).not.toMatch(/drop\s+constraint/i)
  })

  it("does not add a storage INSERT policy that would bypass server validation", () => {
    // The bucket is deliberately read-only for authenticated users so that the
    // magic-byte check cannot be skipped by uploading straight from a browser.
    const action = read("lib/horizon/intake/document-actions.ts")
    expect(action).not.toMatch(/create\s+policy/i)
    expect(baseline).toContain("create policy kintex_documents_read_own on storage.objects for select")
  })
})

describe("P6 upload transport accepts what the intake advertises", () => {
  it("raises the server-action body limit to the document size the intake accepts", () => {
    // A scanned official letter is routinely several MB. The intake admits files up
    // to CASE_DOCUMENT_MAX_BYTES, but a server action body defaults to 1 MB, so a
    // larger file was rejected by the framework before validation and surfaced as a
    // raw 413/500 instead of a localized message. Observed live: a 3.87 MB scan
    // failed until the limit was raised. The two must not drift apart again.
    const config = read("next.config.mjs")
    expect(config).toMatch(/serverActions:\s*\{\s*bodySizeLimit:\s*"10mb"\s*\}/)
    expect(CASE_DOCUMENT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })
})
