import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

/**
 * The launcher is the missing producer between the Business Consultant and the
 * Agent Runs Engine. These tests stub the two collaborators it composes (the
 * provisioning bridge and the engine bridge, each covered by its own suite) and
 * assert the launcher's own contract: a profile is required, the case is
 * provisioned *before* the run, and the run id is passed through unchanged.
 */

const state = vi.hoisted(() => ({
  profile: null as { id: string; business_name: string } | null,
  profileError: null as string | null,
  provisionResult: null as unknown,
  provisionCalls: [] as unknown[],
  launchResult: null as unknown,
  launchCalls: [] as unknown[],
}))

vi.mock("./case-provisioning", () => ({
  ensureBusinessCase: async (input: unknown) => {
    state.provisionCalls.push(input)
    return state.provisionResult
  },
}))

vi.mock("./runs", () => ({
  launchSpecialistRun: async (input: unknown) => {
    state.launchCalls.push(input)
    return state.launchResult
  },
}))

import { startSpecialistRun } from "./start-run"

const service = {
  getProfile: async () =>
    state.profileError
      ? { data: null, error: state.profileError, code: state.profileError }
      : { data: state.profile, error: null, code: null },
} as never

beforeEach(() => {
  state.profile = { id: "p1", business_name: "Betrieb Test" }
  state.profileError = null
  state.provisionCalls = []
  state.launchCalls = []
  state.provisionResult = { data: { caseId: "case-1", reused: false }, error: null, code: null }
  state.launchResult = { data: { runId: "run-1", traceId: "trace-1", duplicate: false }, error: null, code: null }
})

describe("startSpecialistRun", () => {
  it("provisions the case before launching, and returns the run with its case", async () => {
    const result = await startSpecialistRun({ service, specialist: "finance-operations" })
    expect(result.data).toEqual({ runId: "run-1", traceId: "trace-1", duplicate: false, caseId: "case-1" })
    expect(state.provisionCalls).toHaveLength(1)
    expect(state.launchCalls).toHaveLength(1)
    // The run is created against the provisioned case, not a caller-supplied one.
    expect((state.launchCalls[0] as { caseId: string }).caseId).toBe("case-1")
  })

  it("refuses without a profile and never provisions or launches", async () => {
    state.profile = null
    const result = await startSpecialistRun({ service, specialist: "document" })
    expect(result.code).toBe("PROFILE_REQUIRED")
    expect(state.provisionCalls).toHaveLength(0)
    expect(state.launchCalls).toHaveLength(0)
  })

  it("surfaces a provisioning failure instead of launching a case-less run", async () => {
    state.provisionResult = { data: null, error: "CASE_CREATE_FAILED", code: "CASE_CREATE_FAILED" }
    const result = await startSpecialistRun({ service, specialist: "document" })
    expect(result.code).toBe("CASE_CREATE_FAILED")
    expect(state.launchCalls).toHaveLength(0)
  })

  it("maps an engine refusal faithfully", async () => {
    state.launchResult = { data: null, error: "AGENT_RUNS_SCHEMA_NOT_READY", code: "AGENT_RUNS_SCHEMA_NOT_READY" }
    const result = await startSpecialistRun({ service, specialist: "document" })
    expect(result.code).toBe("AGENT_RUNS_SCHEMA_NOT_READY")
  })
})
