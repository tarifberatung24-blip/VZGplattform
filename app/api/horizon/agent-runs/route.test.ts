import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The API surface: authentication, validation and owner-scoped error mapping.
 *
 * `createAgentRunService` is mocked because it is the session boundary — it needs
 * cookies and a live Supabase client, which a unit test does not have. Everything
 * behind it (ownership validation, idempotency, the lifecycle) is covered against
 * the real modules in `service.test.ts` and `repository.test.ts`, so this file
 * only asserts the contract the routes themselves own.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  schemaReady: true,
  configured: true,
  service: {
    createRun: vi.fn(),
    getRunHistory: vi.fn(),
    recordEvent: vi.fn(),
    runs: {
      listRuns: vi.fn(),
      summarizeRuns: vi.fn(),
      getRun: vi.fn(),
      cancelRun: vi.fn(),
      retryRun: vi.fn(),
    },
  },
}))

vi.mock("@/lib/horizon/agent-runs", () => ({
  createAgentRunService: async () => ({
    service: state.signedIn ? state.service : null,
    userId: state.signedIn ? "owner-1" : null,
    configured: state.configured,
    schemaReady: state.signedIn ? state.schemaReady : false,
  }),
}))

import { GET as listRuns, POST as createRun } from "./route"
import { GET as getRun } from "./[id]/route"
import { POST as cancelRun } from "./[id]/cancel/route"
import { POST as retryRun } from "./[id]/retry/route"
import { POST as recordEvent } from "./events/route"

const RUN_ID = "11111111-1111-4111-8111-111111111111"
const CASE_ID = "22222222-2222-4222-8222-222222222222"
const DOC_ID = "33333333-3333-4333-8333-333333333333"

const run = {
  id: RUN_ID,
  ownerId: "owner-1",
  caseId: CASE_ID,
  traceId: "44444444-4444-4444-8444-444444444444",
  status: "awaiting_approval",
  objective: "подготви отговор",
}

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) })
const request = (body?: unknown, url = "http://localhost/api/horizon/agent-runs") =>
  new Request(url, body === undefined ? undefined : json(body))

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  state.signedIn = true
  state.schemaReady = true
  state.configured = true
  state.service.createRun.mockReset()
  state.service.getRunHistory.mockReset()
  state.service.recordEvent.mockReset()
  state.service.runs.listRuns.mockReset()
  state.service.runs.summarizeRuns.mockReset()
  state.service.runs.getRun.mockReset()
  state.service.runs.cancelRun.mockReset()
  state.service.runs.retryRun.mockReset()
})

describe("POST /api/horizon/agent-runs", () => {
  it("requires authentication", async () => {
    state.signedIn = false
    const response = await createRun(request({ objective: "x" }))
    expect(response.status).toBe(401)
    expect(state.service.createRun).not.toHaveBeenCalled()
  })

  it("reports a missing migration as 503 instead of failing", async () => {
    state.schemaReady = false
    const response = await createRun(request({ objective: "x" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: "ENGINE_MIGRATION_NOT_APPLIED" })
  })

  it("rejects a malformed body", async () => {
    for (const body of [{}, { objective: "" }, { objective: "x", extra: 1 }, { objective: "x".repeat(2001) }]) {
      const response = await createRun(request(body))
      expect(response.status).toBe(400)
    }
    expect(state.service.createRun).not.toHaveBeenCalled()
  })

  it("rejects a non-uuid case id", async () => {
    const response = await createRun(request({ objective: "x", caseId: "not-a-uuid" }))
    expect(response.status).toBe(400)
  })

  it("returns 201 for a new run with the trace id exposed", async () => {
    state.service.createRun.mockResolvedValue({ data: { run, duplicate: false }, error: null, code: null })
    const response = await createRun(request({ objective: "подготви отговор", caseId: CASE_ID }))
    expect(response.status).toBe(201)
    expect(response.headers.get("x-horizon-trace-id")).toBe(run.traceId)
    expect((await response.json()).duplicate).toBe(false)
  })

  it("returns 200 for a duplicate request", async () => {
    state.service.createRun.mockResolvedValue({ data: { run, duplicate: true }, error: null, code: null })
    const response = await createRun(request({ objective: "подготви отговор" }))
    expect(response.status).toBe(200)
    expect((await response.json()).duplicate).toBe(true)
  })

  it("maps a foreign case or document to 404, not 403", async () => {
    // A foreign id must be indistinguishable from a missing one, so the endpoint
    // cannot be used to probe another user's cases.
    for (const code of ["CASE_NOT_FOUND", "DOCUMENT_NOT_FOUND"]) {
      state.service.createRun.mockResolvedValue({ data: null, error: "nope", code })
      const response = await createRun(request({ objective: "x", caseId: CASE_ID }))
      expect(response.status).toBe(404)
      expect((await response.json()).code).toBe(code)
    }
  })

  it("never echoes the service error text", async () => {
    state.service.createRun.mockResolvedValue({
      data: null,
      error: "relation public.agent_runs does not exist",
      code: null,
    })
    const response = await createRun(request({ objective: "x" }))
    expect(JSON.stringify(await response.json())).not.toContain("relation public.agent_runs")
  })
})

describe("GET /api/horizon/agent-runs", () => {
  it("requires authentication", async () => {
    state.signedIn = false
    expect((await listRuns(request())).status).toBe(401)
  })

  it("returns runs and a summary", async () => {
    state.service.runs.listRuns.mockResolvedValue({ data: [run], error: null })
    state.service.runs.summarizeRuns.mockResolvedValue({ data: { total: 1 }, error: null })
    const response = await listRuns(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ runs: [run], summary: { total: 1 } })
  })

  it("rejects an unknown status filter", async () => {
    const response = await listRuns(request(undefined, "http://localhost/api/horizon/agent-runs?status=weird"))
    expect(response.status).toBe(400)
  })
})

describe("GET /api/horizon/agent-runs/[id]", () => {
  it("requires authentication", async () => {
    state.signedIn = false
    expect((await getRun(request(), params(RUN_ID))).status).toBe(401)
  })

  it("returns the run, its steps and its events", async () => {
    state.service.getRunHistory.mockResolvedValue({
      data: { run, steps: [{ id: "s1" }], events: [{ id: "e1" }] },
      error: null,
    })
    const response = await getRun(request(), params(RUN_ID))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ run, steps: [{ id: "s1" }], events: [{ id: "e1" }] })
  })

  it("reports a foreign or missing run as 404", async () => {
    state.service.getRunHistory.mockResolvedValue({ data: null, error: "Run not found" })
    expect((await getRun(request(), params(RUN_ID))).status).toBe(404)
  })

  it("rejects a non-uuid id without querying", async () => {
    const response = await getRun(request(), params("not-a-uuid"))
    expect(response.status).toBe(404)
    expect(state.service.getRunHistory).not.toHaveBeenCalled()
  })
})

describe("POST /api/horizon/agent-runs/[id]/cancel", () => {
  it("cancels a run the caller owns", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: run, error: null })
    state.service.runs.cancelRun.mockResolvedValue({ data: { ...run, status: "cancelled" }, error: null })
    const response = await cancelRun(request(), params(RUN_ID))
    expect(response.status).toBe(200)
    expect((await response.json()).run.status).toBe("cancelled")
  })

  it("reports a foreign run as 404", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: null, error: "Run not found" })
    expect((await cancelRun(request(), params(RUN_ID))).status).toBe(404)
    expect(state.service.runs.cancelRun).not.toHaveBeenCalled()
  })

  it("refuses to cancel an already-terminal run", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: run, error: null })
    state.service.runs.cancelRun.mockResolvedValue({ data: null, error: "Illegal transition" })
    expect((await cancelRun(request(), params(RUN_ID))).status).toBe(409)
  })
})

describe("POST /api/horizon/agent-runs/[id]/retry", () => {
  it("re-queues a failed run", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: run, error: null })
    state.service.runs.retryRun.mockResolvedValue({ data: { ...run, status: "queued" }, error: null })
    const response = await retryRun(request(), params(RUN_ID))
    expect(response.status).toBe(200)
    expect((await response.json()).run.status).toBe("queued")
  })

  it("refuses to retry a completed run", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: run, error: null })
    state.service.runs.retryRun.mockResolvedValue({ data: null, error: "RUN_NOT_RETRYABLE", code: "RUN_NOT_RETRYABLE" })
    expect((await retryRun(request(), params(RUN_ID))).status).toBe(409)
  })
})

describe("POST /api/horizon/agent-runs/events", () => {
  it("requires authentication", async () => {
    state.signedIn = false
    expect((await recordEvent(request({ eventType: "CASE_UPDATED" }))).status).toBe(401)
  })

  it("rejects an unknown event type", async () => {
    const response = await recordEvent(request({ eventType: "MADE_UP_EVENT" }))
    expect(response.status).toBe(400)
    expect(state.service.recordEvent).not.toHaveBeenCalled()
  })

  it("rejects a payload key that would turn the envelope into a content store", async () => {
    for (const key of ["content", "text", "prompt", "body", "document_text", "ocr"]) {
      const response = await recordEvent(
        request({ eventType: "DOCUMENT_READY", subjectId: DOC_ID, payload: { [key]: "leaked" } }),
      )
      expect(response.status).toBe(400)
    }
    expect(state.service.recordEvent).not.toHaveBeenCalled()
  })

  it("rejects a non-flat payload", async () => {
    const response = await recordEvent(
      request({ eventType: "DOCUMENT_READY", payload: { nested: { deep: true } } }),
    )
    expect(response.status).toBe(400)
  })

  it("rejects a run id the caller does not own", async () => {
    state.service.runs.getRun.mockResolvedValue({ data: null, error: "Run not found" })
    const response = await recordEvent(request({ eventType: "CASE_UPDATED", runId: RUN_ID }))
    expect(response.status).toBe(404)
    expect(state.service.recordEvent).not.toHaveBeenCalled()
  })

  it("accepts a valid event with 202", async () => {
    state.service.recordEvent.mockResolvedValue({ data: { event: { id: "e1" }, duplicate: false }, error: null })
    const response = await recordEvent(request({ eventType: "DOCUMENT_READY", subjectId: DOC_ID }))
    expect(response.status).toBe(202)
  })

  it("reports a duplicate delivery as 200 rather than an error", async () => {
    state.service.recordEvent.mockResolvedValue({ data: { event: { id: "e1" }, duplicate: true }, error: null })
    const response = await recordEvent(request({ eventType: "DOCUMENT_READY", subjectId: DOC_ID }))
    expect(response.status).toBe(200)
    expect((await response.json()).duplicate).toBe(true)
  })
})
