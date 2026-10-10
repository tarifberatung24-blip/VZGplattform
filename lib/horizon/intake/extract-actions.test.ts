import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * P6 — the extraction action reports *why* a document could not be read.
 *
 * The real pdf.js parser runs on real bytes; only the case engine, the database
 * and storage are mocked. Each failure must (1) return its specific reason,
 * (2) leave the document row `FAILED`, and (3) write that reason to the audit
 * trail. All fixtures are synthetic.
 */

const state = vi.hoisted(() => ({
  downloadError: null as null | { message: string },
  bytes: new Uint8Array() as Uint8Array,
  mime: "application/pdf",
  statusUpdates: [] as string[],
  audits: [] as { action: string; metadata: Record<string, unknown> }[],
}))

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))

vi.mock("@/lib/horizon/case", () => ({
  createCaseEngine: async () => ({
    userId: "user-1",
    repository: {
      getMine: async () => ({ data: { id: "case-1" }, error: null }),
      appendAudit: async (_caseId: string, action: string, metadata: Record<string, unknown>) => {
        state.audits.push({ action, metadata })
        return { data: null, error: null }
      },
    },
  }),
}))

vi.mock("@/lib/office/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "doc-1",
                  owner_id: "user-1",
                  case_id: "case-1",
                  path: "user-1/case-1/doc-1-test.pdf",
                  mime: state.mime,
                  size_bytes: state.bytes.byteLength,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
      update: (patch: { status: string }) => {
        if (table === "source_documents") state.statusUpdates.push(patch.status)
        return { eq: () => ({ eq: async () => ({ error: null }) }) }
      },
      upsert: async () => ({ error: null }),
    }),
    storage: {
      from: () => ({
        download: async () =>
          state.downloadError
            ? { data: null, error: state.downloadError }
            : { data: new Blob([new Uint8Array(state.bytes)]), error: null },
      }),
    },
  }),
}))

import { extractCaseDocument } from "./extract-actions"

const run = () => {
  const form = new FormData()
  form.set("caseId", "case-1")
  form.set("documentId", "doc-1")
  form.set("locale", "de")
  return extractCaseDocument({ error: null, ok: false, pageCount: 0 }, form)
}

const lastAudit = () => state.audits[state.audits.length - 1]

describe("extractCaseDocument failure reasons", () => {
  beforeEach(() => {
    state.downloadError = null
    state.bytes = new Uint8Array()
    state.mime = "application/pdf"
    state.statusUpdates = []
    state.audits = []
  })

  it("a storage read failure is STORAGE_READ_FAILED and the row ends FAILED", async () => {
    state.downloadError = { message: "Object not found" }
    const result = await run()
    expect(result).toEqual({ error: "STORAGE_READ_FAILED", ok: false, pageCount: 0 })
    expect(state.statusUpdates).toEqual(["EXTRACTING", "FAILED"])
    expect(lastAudit()).toEqual({
      action: "document_text_extraction_failed",
      metadata: { document_id: "doc-1", reason: "STORAGE_READ_FAILED" },
    })
  })

  it("a corrupt PDF is DOCUMENT_UNREADABLE", async () => {
    state.bytes = new TextEncoder().encode("%PDF-1.7 not a real pdf body")
    const result = await run()
    expect(result.error).toBe("DOCUMENT_UNREADABLE")
    expect(state.statusUpdates.at(-1)).toBe("FAILED")
    expect(lastAudit().metadata.reason).toBe("DOCUMENT_UNREADABLE")
  })

  it("a password-protected PDF is DOCUMENT_PASSWORD_PROTECTED", async () => {
    state.bytes = new Uint8Array(readFileSync(join(process.cwd(), "lib/documents/fixtures/password-protected.pdf")))
    const result = await run()
    expect(result.error).toBe("DOCUMENT_PASSWORD_PROTECTED")
    expect(state.statusUpdates.at(-1)).toBe("FAILED")
    expect(lastAudit().metadata.reason).toBe("DOCUMENT_PASSWORD_PROTECTED")
  })

  it("a readable PDF still succeeds and is not audited as a failure", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib")
    const doc = await PDFDocument.create()
    const page = doc.addPage([300, 120])
    page.drawText("Synthetic test letter", { x: 10, y: 60, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) })
    state.bytes = await doc.save()
    const result = await run()
    expect(result).toEqual({ error: null, ok: true, pageCount: 1 })
    expect(state.statusUpdates).toEqual(["EXTRACTING", "READY"])
    expect(state.audits.map((audit) => audit.action)).toEqual(["document_text_extracted"])
  })
})
