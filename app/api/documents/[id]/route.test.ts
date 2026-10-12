import { beforeEach, describe, expect, it, vi } from "vitest"

const ID = "6f1c1c5e-8d0b-4c53-9a53-0d4c2c1d9a11"
const PATH = `households/household-1/documents/${ID}/rechnung.pdf`

const state = vi.hoisted(() => ({
  signedIn: true,
  row: null as null | { id: string; storage_path: string | null; mime_type: string; size_bytes: number },
  removeError: null as null | { message: string },
  leftover: false,
  removed: [] as string[][],
  deletedRows: 0,
  audits: [] as unknown[],
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ eq: async () => { state.deletedRows += 1; return { error: null } } }) }),
    }),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => { state.removed.push(paths); return { error: state.removeError } },
        list: async () => ({ data: state.leftover ? [{ name: "rechnung.pdf" }] : [], error: null }),
      }),
    },
  }),
}))
vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "household-1" }))
vi.mock("@/lib/office/supabase/record-audit-event", () => ({
  recordAuditEvent: async (_client: unknown, event: unknown) => { state.audits.push(event) },
}))

import { DELETE } from "./route"

const call = (id = ID) => DELETE(new Request(`https://test.local/api/documents/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) })

beforeEach(() => {
  state.signedIn = true
  state.row = { id: ID, storage_path: PATH, mime_type: "application/pdf", size_bytes: 10 }
  state.removeError = null
  state.leftover = false
  state.removed = []
  state.deletedRows = 0
  state.audits = []
})

describe("DELETE /api/documents/[id]", () => {
  it("removes the file, then the row, and records it", async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deleted: true, id: ID })
    expect(state.removed).toEqual([[PATH]])
    expect(state.deletedRows).toBe(1)
    expect(state.audits).toHaveLength(1)
  })

  it("needs a signed-in user", async () => {
    state.signedIn = false
    expect((await call()).status).toBe(401)
    expect(state.deletedRows).toBe(0)
  })

  it("answers 404 for a malformed id and for a document that is not in the user's household", async () => {
    expect((await call("not-an-id")).status).toBe(404)
    state.row = null
    expect((await call()).status).toBe(404)
    expect(state.removed).toEqual([])
  })

  it("keeps the row when the file cannot be removed", async () => {
    state.removeError = { message: "denied" }
    expect((await call()).status).toBe(502)
    expect(state.deletedRows).toBe(0)
  })

  it("keeps the row when the file is still there after a silent no-op", async () => {
    state.leftover = true
    expect((await call()).status).toBe(502)
    expect(state.deletedRows).toBe(0)
  })

  it("still deletes a row that has no file", async () => {
    state.row = { id: ID, storage_path: null, mime_type: "application/pdf", size_bytes: 10 }
    expect((await call()).status).toBe(200)
    expect(state.removed).toEqual([])
    expect(state.deletedRows).toBe(1)
  })
})
