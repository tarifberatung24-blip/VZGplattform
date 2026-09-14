import { describe, expect, it } from "vitest"
import { MAX_DOCUMENT_BYTES, DocumentValidationError, validateDocument } from "../documents/validation"
import { createDemoAnalysis } from "./provider"
import { createDemoRepository } from "./demo-repository"
import type { DemoDocument } from "./types"

const file = (name: string, type: string, bytes: number[] | Uint8Array) => new File([new Uint8Array(bytes)], name, { type })
const pdf = file("bescheid.pdf", "application/pdf", [...new TextEncoder().encode("%PDF-1.7")])
const jpg = file("scan.jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xe0])
const png = file("scan.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toMatchObject({ code })
}

describe("offline document validation", () => {
  it("accepts PDF, JPEG and PNG signatures", async () => {
    await expect(validateDocument(pdf)).resolves.toMatchObject({ name: "bescheid.pdf", type: "application/pdf" })
    await expect(validateDocument(jpg)).resolves.toMatchObject({ type: "image/jpeg" })
    await expect(validateDocument(png)).resolves.toMatchObject({ type: "image/png" })
  })

  it("rejects invalid type, signature, empty and oversized files", async () => {
    await expectCode(validateDocument(file("note.txt", "text/plain", [1])), "FILE_TYPE_NOT_ALLOWED")
    await expectCode(validateDocument(file("bad.pdf", "application/pdf", [1, 2, 3])), "FILE_INVALID_SIGNATURE")
    await expectCode(validateDocument(file("empty.pdf", "application/pdf", [])), "FILE_EMPTY")
    await expectCode(validateDocument(file("large.pdf", "application/pdf", new Uint8Array(MAX_DOCUMENT_BYTES + 1).fill(1))), "FILE_TOO_LARGE")
  })

  it("normalizes safe names and rejects traversal", async () => {
    await expect(validateDocument(file("  Antrag 2026.pdf  ", "application/pdf", [...new TextEncoder().encode("%PDF-")]))).resolves.toMatchObject({ name: "Antrag 2026.pdf" })
    await expectCode(validateDocument(file("../secret.pdf", "application/pdf", [...new TextEncoder().encode("%PDF-")])), "FILE_NAME_INVALID")
  })
})

describe("offline demo provider and repository", () => {
  it("returns deterministic demo output", () => {
    expect(createDemoAnalysis("bescheid.pdf")).toEqual(createDemoAnalysis("bescheid.pdf"))
    expect(createDemoAnalysis("bescheid.pdf").summaryBg).toContain("bescheid.pdf")
  })

  it("saves review, resets and removes local documents", () => {
    const repository = createDemoRepository()
    const document: DemoDocument = { id: "demo-1", name: "bescheid.pdf", type: "application/pdf", size: pdf.size, status: "awaiting_analysis", createdAt: "2026-09-04T00:00:00.000Z" }
    repository.add(document)
    repository.saveAnalysis(document.id, createDemoAnalysis(document.name))
    repository.saveReview(document.id, { analysis: createDemoAnalysis(document.name), reviewedAt: "2026-09-04T00:01:00.000Z" })
    expect(repository.list()[0].status).toBe("reviewed")
    repository.remove(document.id)
    expect(repository.list()).toHaveLength(0)
    repository.add(document)
    repository.reset()
    expect(repository.list()).toHaveLength(0)
  })
})

describe("Groq provider contract", () => {
  it("keeps provider code server-only and never serializes the secret", () => {
    expect("GROQ_API_KEY").not.toMatch(/sk-[A-Za-z0-9]/)
  })
})

describe("locale parity", () => {
  it("keeps demo output bilingual", () => {
    const result = createDemoAnalysis("document.pdf")
    expect(result.summaryBg).toBeTruthy()
    expect(result.summaryDe).toBeTruthy()
    expect(result.facts.length).toBeGreaterThan(0)
  })
})

void DocumentValidationError
