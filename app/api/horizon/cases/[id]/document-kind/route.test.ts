import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  result: { error: null as "invalid_kind" | null, ok: true },
  save: vi.fn(),
}))

vi.mock("@/lib/horizon/unterlagen/document-kind-service", () => ({
  saveDocumentKind: async (input: unknown) => {
    state.save(input)
    return state.result
  },
}))

import { POST } from "./route"

const CASE = "11111111-1111-1111-1111-111111111111"

describe("POST /api/horizon/cases/[id]/document-kind", () => {
  beforeEach(() => {
    state.result = { error: null, ok: true }
    state.save.mockClear()
  })

  it("uses the path case id as the only case identifier", async () => {
    const response = await POST(
      new Request(`http://localhost/api/horizon/cases/${CASE}/document-kind`, {
        method: "POST",
        body: JSON.stringify({ caseId: "other-case", kind: "rechnung" }),
      }),
      { params: Promise.resolve({ id: CASE }) },
    )
    expect(response.status).toBe(200)
    expect(state.save).toHaveBeenCalledWith({ caseId: CASE, kind: "rechnung" })
  })

  it("returns a typed validation failure for an invalid kind", async () => {
    state.result = { error: "invalid_kind", ok: false }
    const response = await POST(
      new Request(`http://localhost/api/horizon/cases/${CASE}/document-kind`, {
        method: "POST",
        body: JSON.stringify({ kind: "made-up" }),
      }),
      { params: Promise.resolve({ id: CASE }) },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "invalid_kind", ok: false })
  })
})
