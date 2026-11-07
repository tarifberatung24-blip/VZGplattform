import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

/**
 * The bridge must not become a second engine. These tests stub the Agent Runs
 * Engine itself (which has its own suite) and assert the bridge's own contract:
 * it refuses an unknown specialist *before* any run exists, it maps the engine's
 * refusals faithfully, and it never invents an idempotency key or a run id.
 */

const state = vi.hoisted(() => ({
  configured: true,
  userId: "u1" as string | null,
  schemaReady: true,
  createRunResult: null as unknown,
  createRunCalls: [] as unknown[],
}))

vi.mock("@/lib/horizon/agent-runs/service", () => ({
  createAgentRunService: async () => ({
    configured: state.configured,
    userId: state.userId,
    schemaReady: state.schemaReady,
    service:
      state.userId === null
        ? null
        : {
            createRun: async (request: unknown) => {
              state.createRunCalls.push(request)
              return state.createRunResult
            },
          },
  }),
}))

import { launchSpecialistRun } from "./runs"

beforeEach(() => {
  state.configured = true
  state.userId = "u1"
  state.schemaReady = true
  state.createRunCalls = []
  state.createRunResult = {
    data: { run: { id: "run-1", traceId: "trace-1" }, duplicate: false },
    error: null,
    code: null,
  }
})

describe("launchSpecialistRun", () => {
  it("refuses an unknown specialist without creating a run", async () => {
    const result = await launchSpecialistRun({ specialist: "nope" as never, businessName: "B" })
    expect(result.code).toBe("UNKNOWN_SPECIALIST")
    expect(state.createRunCalls).toHaveLength(0)
  })

  it("creates a run through the engine for a known specialist", async () => {
    const result = await launchSpecialistRun({ specialist: "finance-operations", businessName: "Betrieb Test" })
    expect(result.data).toEqual({ runId: "run-1", traceId: "trace-1", duplicate: false })
    expect(state.createRunCalls).toHaveLength(1)
    const request = state.createRunCalls[0] as { objective: string; caseId: string | null }
    expect(request.objective).toContain("finance-operations")
    expect(request.caseId).toBeNull()
  })

  it("passes the caller's idempotency key through so a repeat returns the same run", async () => {
    state.createRunResult = {
      data: { run: { id: "run-1", traceId: "trace-1" }, duplicate: true },
      error: null,
      code: null,
    }
    const result = await launchSpecialistRun({
      specialist: "document",
      businessName: "B",
      idempotencyKey: "key-1",
    })
    expect((state.createRunCalls[0] as { idempotencyKey: string }).idempotencyKey).toBe("key-1")
    expect(result.data?.duplicate).toBe(true)
  })

  it("maps the engine's case refusal faithfully", async () => {
    state.createRunResult = { data: null, error: "CASE_NOT_FOUND", code: "CASE_NOT_FOUND" }
    const result = await launchSpecialistRun({
      specialist: "document",
      businessName: "B",
      caseId: "00000000-0000-4000-8000-000000000001",
    })
    expect(result.code).toBe("CASE_NOT_FOUND")
  })

  it("refuses to run without a session", async () => {
    state.userId = null
    const result = await launchSpecialistRun({ specialist: "document", businessName: "B" })
    expect(result.code).toBe("AUTHENTICATION_REQUIRED")
  })

  it("reports the engine as unconfigured rather than fabricating a run", async () => {
    state.configured = false
    const result = await launchSpecialistRun({ specialist: "document", businessName: "B" })
    expect(result.code).toBe("ENGINE_NOT_CONFIGURED")
  })

  it("reports a missing agent-runs schema instead of failing obscurely", async () => {
    state.schemaReady = false
    const result = await launchSpecialistRun({ specialist: "document", businessName: "B" })
    expect(result.code).toBe("AGENT_RUNS_SCHEMA_NOT_READY")
    expect(state.createRunCalls).toHaveLength(0)
  })
})
