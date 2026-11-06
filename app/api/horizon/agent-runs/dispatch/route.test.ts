import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The dispatcher worker's authentication contract.
 *
 * The worker is the only place a run is executed, so its guard is tested directly:
 * "disabled when unset, never open when unset", and a wrong or absent secret is
 * refused. The engine itself is covered by `repository.test.ts`; the Supabase
 * client is stubbed here because these assertions are about the HTTP boundary.
 */

const state = vi.hoisted(() => ({
  schemaReady: true,
  clientCreated: 0,
}))

// The dispatcher pulls in server-only modules. The guard exists to keep them out of
// a client bundle, which is not a concern in this test process.
vi.mock("server-only", () => ({}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    state.clientCreated += 1
    // A minimal thenable query builder, matching the shape the route uses.
    const builder: Record<string, unknown> = {}
    for (const method of ["select", "eq", "in", "lte", "limit"]) {
      builder[method] = () => builder
    }
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null })
    return { from: () => builder }
  },
}))

vi.mock("@/lib/horizon/agent-runs/repository", () => ({
  AgentRunRepository: class {
    constructor(
      private readonly client: unknown,
      readonly ownerId: string,
    ) {}
    async isSchemaReady() {
      return state.schemaReady
    }
    async recoverStaleEvents() {
      return { data: 0, error: null }
    }
    async claimEvents() {
      return { data: [], error: null }
    }
    async listRuns() {
      return { data: [], error: null }
    }
  },
}))

vi.mock("@/lib/horizon/case/repository", () => ({
  CaseEngineRepository: class {
    constructor(
      private readonly client: unknown,
      readonly ownerId: string,
    ) {}
  },
}))

import { GET, POST } from "./route"

const SECRET = "a".repeat(32)

const post = (headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/horizon/agent-runs/dispatch", { method: "POST", headers }))

const get = (headers: Record<string, string> = {}) =>
  GET(new Request("http://localhost/api/horizon/agent-runs/dispatch", { headers }))

beforeEach(() => {
  state.schemaReady = true
  state.clientCreated = 0
  delete process.env.AGENT_RUNS_WORKER_SECRET
  delete process.env.NOTIFICATIONS_CRON_SECRET
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SECRET_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

afterEach(() => {
  delete process.env.AGENT_RUNS_WORKER_SECRET
  delete process.env.NOTIFICATIONS_CRON_SECRET
})

describe("dispatcher worker: authentication", () => {
  it("is disabled, not open, when no secret is configured", async () => {
    const response = await post()
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("WORKER_NOT_CONFIGURED")
  })

  it("refuses a wrong secret", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    const response = await post({ "x-horizon-worker-secret": "b".repeat(32) })
    expect(response.status).toBe(401)
  })

  it("refuses a missing secret header", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    expect((await post()).status).toBe(401)
  })

  it("ignores a secret shorter than the minimum length, treating it as unset", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = "short"
    const response = await post({ "x-horizon-worker-secret": "short" })
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("WORKER_NOT_CONFIGURED")
  })

  it("accepts the operator secret as well, for a manual run", async () => {
    process.env.NOTIFICATIONS_CRON_SECRET = SECRET
    const response = await post({ "x-horizon-operator-secret": SECRET })
    // Accepted, but there is no Supabase config in this environment.
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("WORKER_NOT_CONFIGURED")
  })

  it("reports a configured-but-unreachable worker as 503, never as success", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SECRET_KEY = "service-key"
    const response = await post({ "x-horizon-worker-secret": SECRET })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.owners).toBe(0)
    expect(body.runsExecuted).toBe(0)
  })
})

describe("dispatcher worker: health probe", () => {
  it("does not disclose queue contents without a secret", async () => {
    const response = await get()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toMatchObject({ code: "UNAUTHORIZED", configured: false })
    expect(body).not.toHaveProperty("owners")
  })

  it("reports 503 when the worker has no database configuration", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    const response = await get({ "x-horizon-worker-secret": SECRET })
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("WORKER_NOT_CONFIGURED")
  })

  it("reports unhealthy when the migration is not applied", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SECRET_KEY = "service-key"
    state.schemaReady = false
    const response = await get({ "x-horizon-worker-secret": SECRET })
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("ENGINE_MIGRATION_NOT_APPLIED")
  })

  it("reports healthy with the engine version", async () => {
    process.env.AGENT_RUNS_WORKER_SECRET = SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SECRET_KEY = "service-key"
    const response = await get({ "x-horizon-worker-secret": SECRET })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ healthy: true, version: "agent-runs-v1" })
  })
})
