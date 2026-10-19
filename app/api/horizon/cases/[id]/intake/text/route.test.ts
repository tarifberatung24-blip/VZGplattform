import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  result: { error: null as "save_failed" | null, ok: true },
  save: vi.fn(),
}))

vi.mock("@/lib/horizon/intake/text-service", () => ({
  saveTextIntake: async (input: unknown) => {
    state.save(input)
    return state.result
  },
}))

import { POST } from "./route"

const CASE = "11111111-1111-1111-1111-111111111111"

function post(body: unknown) {
  return POST(
    new Request(`http://localhost/api/horizon/cases/${CASE}/intake/text`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: CASE }) },
  )
}

describe("POST /api/horizon/cases/[id]/intake/text", () => {
  beforeEach(() => {
    state.result = { error: null, ok: true }
    state.save.mockClear()
  })

  it("saves through a stable API route rather than a Server Action", async () => {
    const response = await post({ locale: "bg", kind: "pasted_text", text: "test" })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ error: null, ok: true })
    expect(state.save).toHaveBeenCalledWith({ caseId: CASE, locale: "bg", kind: "pasted_text", text: "test" })
  })

  it("rejects a malformed JSON body before it reaches case storage", async () => {
    const response = await POST(
      new Request(`http://localhost/api/horizon/cases/${CASE}/intake/text`, { method: "POST", body: "{" }),
      { params: Promise.resolve({ id: CASE }) },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "empty", ok: false })
    expect(state.save).not.toHaveBeenCalled()
  })

  it("does not expose a storage failure as a successful save", async () => {
    state.result = { error: "save_failed", ok: false }
    const response = await post({ locale: "bg", kind: "pasted_text", text: "test" })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "save_failed", ok: false })
  })
})
