import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

/**
 * The provisioning bridge must not become a second case engine. These tests stub
 * `createCaseEngine` (which has its own suite) and assert this module's own
 * contract: one canonical case per profile, idempotent under a retry and under a
 * unique-constraint race, and a clean refusal without a session.
 */

type CaseRow = { id: string; ownerId: string; status: string; serviceRequestId?: string | null }

const state = vi.hoisted(() => ({
  authenticated: true,
  cases: [] as CaseRow[],
  createResult: null as unknown,
  addFactsCalls: [] as unknown[],
  advanceCalls: [] as unknown[],
}))

function repository() {
  return {
    findCaseByServiceRequestId: async (requestId: string) => {
      const found = state.cases.find((row) => row.serviceRequestId === requestId)
      return { data: found ?? null, error: null, code: null }
    },
    createCase: async (input: { serviceRequestId?: string | null }) => {
      if (state.createResult) return state.createResult
      const row = { id: "case-1", ownerId: "u1", status: "draft", serviceRequestId: input.serviceRequestId }
      state.cases.push(row)
      return { data: row, error: null, code: null }
    },
    addFacts: async (_caseId: string, facts: unknown[]) => {
      state.addFactsCalls.push(facts)
      return { data: facts, error: null, code: null }
    },
    advanceTo: async (_caseId: string, to: string) => {
      state.advanceCalls.push(to)
      return { data: { id: "case-1", ownerId: "u1", status: to }, error: null, code: null }
    },
  }
}

vi.mock("@/lib/horizon/case", () => ({
  createCaseEngine: async () => ({
    repository: state.authenticated ? repository() : null,
    userId: state.authenticated ? "u1" : null,
    configured: true,
  }),
}))

import { ensureBusinessCase, businessCaseRequestId } from "./case-provisioning"

beforeEach(() => {
  state.authenticated = true
  state.cases = []
  state.createResult = null
  state.addFactsCalls = []
  state.advanceCalls = []
})

describe("ensureBusinessCase", () => {
  it("creates one case bound to the profile's request id", async () => {
    const result = await ensureBusinessCase({ profileId: "p1", businessName: "Betrieb Test", locale: "de" })
    expect(result.data?.caseId).toBe("case-1")
    expect(result.data?.reused).toBe(false)
    expect(state.cases[0].serviceRequestId).toBe(businessCaseRequestId("p1"))
    // The case is moved into collecting_data, never written directly.
    expect(state.advanceCalls).toEqual(["collecting_data"])
  })

  it("reuses the existing case on a second call and creates nothing new", async () => {
    await ensureBusinessCase({ profileId: "p1", businessName: "Betrieb Test", locale: "de" })
    const again = await ensureBusinessCase({ profileId: "p1", businessName: "Betrieb Test", locale: "de" })
    expect(again.data?.reused).toBe(true)
    expect(state.cases).toHaveLength(1)
  })

  it("recovers the winner when the unique index rejects the insert", async () => {
    state.createResult = { data: null, error: "duplicate key", code: "23505" }
    state.cases.push({ id: "case-winner", ownerId: "u1", status: "draft", serviceRequestId: businessCaseRequestId("p1") })
    const result = await ensureBusinessCase({ profileId: "p1", businessName: "Betrieb Test", locale: "de" })
    expect(result.data?.caseId).toBe("case-winner")
    expect(result.data?.reused).toBe(true)
  })

  it("refuses without a session and creates no case", async () => {
    state.authenticated = false
    const result = await ensureBusinessCase({ profileId: "p1", businessName: "B", locale: "de" })
    expect(result.code).toBe("AUTHENTICATION_REQUIRED")
    expect(state.cases).toHaveLength(0)
  })
})
