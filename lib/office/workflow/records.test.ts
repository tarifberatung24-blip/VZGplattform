import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  signedIn: true,
  draft: { id: "d1", owner_id: "u1", content_hash: "a".repeat(64) } as Record<string, unknown> | null,
  insertResult: { data: null as unknown, error: null as { message: string; code?: string } | null },
  insertCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock("server-only", () => ({}))

vi.mock("../supabase/auth", () => ({
  getAuthenticatedUser: async () => ({ user: state.signedIn ? { id: "u1" } : null }),
}))

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query: Record<string, unknown> = {}
      const chain = () => query
      query.select = chain
      query.eq = chain
      query.maybeSingle = async () =>
        table === "approvals"
          ? { data: { id: "a1", draft_id: "d1", approved_hash: "a".repeat(64) }, error: null }
          : { data: state.draft, error: null }
      query.insert = (row: Record<string, unknown>) => {
        state.insertCalls.push(row)
        query.select = chain
        query.single = async () => state.insertResult
        return query
      }
      return query
    },
  }),
}))

import { approveDraft } from "./records"

beforeEach(() => {
  state.signedIn = true
  state.draft = { id: "d1", owner_id: "u1", content_hash: "a".repeat(64) }
  state.insertResult = { data: { id: "a1" }, error: null }
  state.insertCalls = []
})

describe("approveDraft", () => {
  it("refuses an unauthenticated caller", async () => {
    state.signedIn = false
    expect(await approveDraft("d1", "a".repeat(64))).toEqual({ error: "Unauthorized" })
  })

  it("refuses a hash that does not match the stored content", async () => {
    const result = await approveDraft("d1", "b".repeat(64))
    expect(result).toEqual({ error: "Draft content changed; approval rejected" })
    expect(state.insertCalls).toHaveLength(0)
  })

  it("approves a matching unchanged draft", async () => {
    const result = await approveDraft("d1", "a".repeat(64))
    expect(result).toEqual({ approval: { id: "a1" } })
  })

  /*
   * The `approvals` table has a deliberate unique(draft_id, approved_hash): an
   * approval is identified by the exact draft and the exact bytes approved. When
   * the same unchanged draft is approved twice, the second insert violates that
   * constraint, and the raw Postgres message
   * ("duplicate key value violates unique constraint ...") was being returned to
   * the caller. Re-approving the same bytes is the intended idempotent case, so
   * it must resolve to the existing approval, not to a database error string.
   */
  it("treats re-approval of the same unchanged draft as idempotent", async () => {
    state.insertResult = {
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "approvals_draft_id_approved_hash_key"',
        code: "23505",
      },
    }
    const result = await approveDraft("d1", "a".repeat(64))
    expect(result).not.toHaveProperty("error")
    expect(JSON.stringify(result)).not.toContain("duplicate key")
    expect((result as { approval?: { draft_id?: string } }).approval?.draft_id).toBe("d1")
  })

  it("does not leak a raw database message for other insert failures", async () => {
    state.insertResult = { data: null, error: { message: "permission denied for table approvals" } }
    const result = await approveDraft("d1", "a".repeat(64))
    expect(result).toHaveProperty("error")
    expect(JSON.stringify(result)).not.toContain("permission denied for table")
  })
})
