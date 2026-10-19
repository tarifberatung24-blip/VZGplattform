import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  result: { error: null as "missing_file" | null, ok: true },
  save: vi.fn(),
}))

vi.mock("@/lib/horizon/intake/document-service", () => ({
  saveDocumentIntake: async (input: unknown) => {
    state.save(input)
    return state.result
  },
}))

import { POST } from "./route"

const CASE = "11111111-1111-1111-1111-111111111111"

function post(file?: File) {
  const form = new FormData()
  form.set("kind", "pdf")
  if (file) form.set("file", file)
  return POST(
    new Request(`http://localhost/api/horizon/cases/${CASE}/documents`, { method: "POST", body: form }),
    { params: Promise.resolve({ id: CASE }) },
  )
}

describe("POST /api/horizon/cases/[id]/documents", () => {
  beforeEach(() => {
    state.result = { error: null, ok: true }
    state.save.mockClear()
  })

  it("passes a form upload to the stable case route", async () => {
    const file = new File(["%PDF-1.7"], "test.pdf", { type: "application/pdf" })
    const response = await post(file)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ error: null, ok: true })
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ caseId: CASE, kind: "pdf" }))
    const uploaded = state.save.mock.calls[0][0] as { file: File }
    expect(uploaded.file).toBeInstanceOf(File)
    expect(uploaded.file.name).toBe("test.pdf")
    expect(uploaded.file.type).toBe("application/pdf")
  })

  it("returns a typed validation failure without a selected file", async () => {
    state.result = { error: "missing_file", ok: false }
    const response = await post()
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "missing_file", ok: false })
  })
})
