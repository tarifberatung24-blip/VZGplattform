import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

/**
 * Route-level contract for starting a specialist run: authentication, strict
 * validation and status mapping. The composition behind it (`startSpecialistRun`)
 * is stubbed here and covered by its own suite, so this file only asserts what the
 * route itself owns.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  startResult: null as unknown,
  startCalls: [] as unknown[],
}))

vi.mock("@/lib/horizon/business-consultant/service", () => ({
  createBusinessConsultantServiceFromSession: async () => ({
    userId: state.signedIn ? "u1" : null,
    service: state.signedIn ? {} : null,
    schemaReady: true,
  }),
}))

vi.mock("@/lib/horizon/business-consultant/start-run", () => ({
  startSpecialistRun: async (input: unknown) => {
    state.startCalls.push(input)
    return state.startResult
  },
}))

import { POST } from "./route"

const request = (body: unknown) =>
  new Request("https://test.local/api/horizon/business-consultant/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  state.signedIn = true
  state.startCalls = []
  state.startResult = {
    data: { runId: "run-1", traceId: "trace-1", caseId: "case-1", duplicate: false },
    error: null,
    code: null,
  }
})

describe("POST /api/horizon/business-consultant/runs", () => {
  it("requires authentication", async () => {
    state.signedIn = false
    const response = await POST(request({ specialist: "document" }))
    expect(response.status).toBe(401)
    expect(state.startCalls).toHaveLength(0)
  })

  it("rejects an unknown specialist without starting anything", async () => {
    const response = await POST(request({ specialist: "nope" }))
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INVALID_RUN_REQUEST")
    expect(state.startCalls).toHaveLength(0)
  })

  it("rejects an unexpected payload key", async () => {
    const response = await POST(request({ specialist: "document", prompt: "leak" }))
    expect(response.status).toBe(400)
    expect(state.startCalls).toHaveLength(0)
  })

  it("starts a run and returns 201 with the run, trace and case", async () => {
    const response = await POST(request({ specialist: "finance-operations", locale: "de" }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.runId).toBe("run-1")
    expect(body.caseId).toBe("case-1")
    expect(response.headers.get("x-horizon-trace-id")).toBe("trace-1")
  })

  it("reports a repeated request as 200 rather than a new run", async () => {
    state.startResult = {
      data: { runId: "run-1", traceId: "trace-1", caseId: "case-1", duplicate: true },
      error: null,
      code: null,
    }
    const response = await POST(request({ specialist: "document" }))
    expect(response.status).toBe(200)
    expect((await response.json()).duplicate).toBe(true)
  })

  it("maps a missing profile to 409", async () => {
    state.startResult = { data: null, error: "PROFILE_REQUIRED", code: "PROFILE_REQUIRED" }
    expect((await POST(request({ specialist: "document" }))).status).toBe(409)
  })

  it("maps a missing engine schema to 503", async () => {
    state.startResult = { data: null, error: "AGENT_RUNS_SCHEMA_NOT_READY", code: "AGENT_RUNS_SCHEMA_NOT_READY" }
    expect((await POST(request({ specialist: "document" }))).status).toBe(503)
  })
})
