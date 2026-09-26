import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Route tests for the MODE B assisted handoff.
 *
 * The handoff is the only place in this feature where something leaves the
 * platform, so the tests pin the three rules that matter: no granted
 * authorization means no handoff, a credential-shaped field never reaches the
 * queue, and the operator queue state is not the negotiation lifecycle.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  session: null as Record<string, unknown> | null,
  authorization: null as Record<string, unknown> | null,
  events: [] as Array<Record<string, unknown>>,
  sessionUpdate: null as Record<string, unknown> | null,
  audit: [] as Array<Record<string, unknown>>,
  fetchCalls: [] as Array<{ url: string; body: string; headers: Record<string, string> }>,
  fetchOk: true,
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "home-1" }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
    from: (table: string) => {
      const query: Record<string, unknown> = {}
      const self = () => query
      Object.assign(query, {
        select: self,
        eq: self,
        order: self,
        limit: self,
        maybeSingle: async () => {
          if (table === "negotiation_sessions") return { data: state.session, error: null }
          if (table === "negotiation_authorizations") return { data: state.authorization, error: null }
          return { data: null, error: null }
        },
        single: async () => ({ data: null, error: null }),
        insert: (rows: unknown) => {
          const list = Array.isArray(rows) ? rows : [rows]
          if (table === "negotiation_events") state.events.push(...(list as Array<Record<string, unknown>>))
          if (table === "platform_audit_events") state.audit.push(...(list as Array<Record<string, unknown>>))
          return query
        },
        update: (patch: Record<string, unknown>) => {
          if (table === "negotiation_sessions") state.sessionUpdate = patch
          return query
        },
        then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      })
      return query
    },
  }),
}))

import { POST as assistedPost, PATCH as assistedPatch } from "./assisted/route"

const context = { params: Promise.resolve({ sessionId: "session-1" }) }

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    owner_id: "user-1",
    household_id: "home-1",
    contract_id: "contract-1",
    category: "internet",
    state: "AUTHORIZATION",
    decision_action: "NEGOTIATE",
    reason_codes: ["COMPETITOR_OFFER_BELOW_CURRENT"],
    missing_information: [],
    opportunity_confidence: 0.8,
    next_review_date: null,
    analysis: { dossier: { plan: { primaryAsk: "Ask for 29.99" } } },
    execution_mode: "ASSISTED",
    mode_b_request_id: null,
    mode_b_status: null,
    mode_b_queued_at: null,
    mode_b_updated_at: null,
    authorization_status: "granted",
    current_monthly_cost: 49.99,
    target_monthly_cost: 29.99,
    potential_monthly_saving: 20,
    potential_annual_saving: 240,
    promotion_expiry: null,
    verification_due_at: null,
    verified_at: null,
    closed_at: null,
    created_at: "2026-09-26T00:00:00.000Z",
    updated_at: "2026-09-26T00:00:00.000Z",
    ...overrides,
  }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  // `createNegotiationEngine` refuses when the public Supabase config is absent,
  // so the tests provide it. The client itself is mocked above; only the config
  // check reads the real environment.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test-only")
  vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "1")
  vi.stubEnv("HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL", "https://automation.example.invalid/webhook/assisted")
  vi.stubEnv("HORIZON_AUTOMATION_WEBHOOK_SECRET", "test-secret")
  state.signedIn = true
  state.session = sessionRow()
  state.authorization = { id: "auth-1", scope: "representation", status: "granted" }
  state.events = []
  state.sessionUpdate = null
  state.audit = []
  state.fetchCalls = []
  state.fetchOk = true
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string; headers?: Record<string, string> }) => {
    state.fetchCalls.push({ url: String(url), body: init?.body ?? "", headers: init?.headers ?? {} })
    return { ok: state.fetchOk } as Response
  })
})

describe("assisted handoff — authorization is mandatory", () => {
  it("refuses when no authorization was granted", async () => {
    state.session = sessionRow({ authorization_status: "pending" })
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_AUTHORIZATION_REQUIRED")
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("refuses a revoked authorization", async () => {
    state.session = sessionRow({ authorization_status: "revoked" })
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(409)
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("refuses when the feature flag is off", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "0")
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(404)
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("refuses an unauthenticated caller", async () => {
    state.signedIn = false
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(401)
    expect(state.fetchCalls).toHaveLength(0)
  })
})

describe("assisted handoff — queue transport", () => {
  it("queues the handoff and records the queue state separately from the lifecycle", async () => {
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ locale: "de" }) }),
      context,
    )
    expect(response.status).toBe(202)
    const payload = await response.json()
    expect(payload.status).toBe("QUEUED")
    expect(payload.requestId).toMatch(/^hzn_/)

    expect(state.fetchCalls).toHaveLength(1)
    expect(state.sessionUpdate).toMatchObject({ mode_b_status: "QUEUED", execution_mode: "ASSISTED" })
    expect(state.audit.some((row) => row.event_type === "negotiation.assisted_handoff_queued")).toBe(true)
  })

  it("reports a queue failure and does not mark the request queued", async () => {
    state.fetchOk = false
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(502)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_QUEUE_FAILED")
    expect(state.sessionUpdate).toBeNull()
  })

  it("refuses when the queue is not configured", async () => {
    vi.stubEnv("HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL", "")
    vi.stubEnv("N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL", "")
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_QUEUE_NOT_CONFIGURED")
  })

  it("still works through the legacy N8N_* names when the neutral ones are unset", async () => {
    // Backwards compatibility: an existing n8n deployment keeps working after the
    // rename, so switching transports is not a flag day.
    vi.stubEnv("HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL", "")
    vi.stubEnv("HORIZON_AUTOMATION_WEBHOOK_SECRET", "")
    vi.stubEnv("N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL", "https://legacy.example.invalid/webhook/assisted")
    vi.stubEnv("N8N_WEBHOOK_SECRET", "legacy-secret")
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect(state.fetchCalls).toHaveLength(1)
  })

  it("sends the provider-neutral secret header and a correlation id", async () => {
    // The receiver maps the header to its own secret check; nothing about the
    // receiving orchestrator appears in the request.
    await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(state.fetchCalls).toHaveLength(1)
    const headers = state.fetchCalls[0].headers
    expect(headers["X-Horizon-Automation-Secret"]).toBe("test-secret")
    expect(headers["X-Horizon-Request-Id"]).toMatch(/^hzn_/)
    expect(JSON.stringify(headers).toLowerCase()).not.toContain("n8n")
  })

  it("reuses the in-flight request id instead of queuing a second one", async () => {
    // A double-submit must not create a second queue entry for one negotiation.
    state.session = sessionRow({ mode_b_request_id: "hzn_existing", mode_b_status: "IN_PROGRESS" })
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect((await response.json()).requestId).toBe("hzn_existing")
    expect(JSON.parse(state.fetchCalls[0].body).requestId).toBe("hzn_existing")
  })

  it("mints a new request id once the previous request is terminal", async () => {
    state.session = sessionRow({ mode_b_request_id: "hzn_done", mode_b_status: "COMPLETED" })
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    const requestId = (await response.json()).requestId
    expect(requestId).toMatch(/^hzn_/)
    expect(requestId).not.toBe("hzn_done")
  })

  it("sends no credential-shaped field to the operator queue", async () => {
    state.session = sessionRow({
      analysis: {
        dossier: { plan: { primaryAsk: "Ask for 29.99" } },
        providerPassword: "must-not-leave",
      },
    })
    await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    const body = state.fetchCalls[0].body
    expect(body).not.toContain("must-not-leave")
    expect(body.toLowerCase()).not.toContain("password")
  })
})

describe("assisted handoff — cancellation", () => {
  it("lets the customer cancel a queued request", async () => {
    state.session = sessionRow({ mode_b_status: "QUEUED", mode_b_request_id: "hzn_1" })
    const response = await assistedPatch(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
      context,
    )
    expect(response.status).toBe(200)
    expect(state.sessionUpdate).toMatchObject({ mode_b_status: "CANCELLED" })
  })

  it("does not let a completed request be cancelled", async () => {
    state.session = sessionRow({ mode_b_status: "COMPLETED", mode_b_request_id: "hzn_1" })
    const response = await assistedPatch(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
      context,
    )
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_INVALID_TRANSITION")
    expect(state.sessionUpdate).toBeNull()
  })

  it("does not let a customer set any status other than CANCELLED", async () => {
    state.session = sessionRow({ mode_b_status: "QUEUED", mode_b_request_id: "hzn_1" })
    const response = await assistedPatch(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) }),
      context,
    )
    expect(response.status).toBe(400)
    expect(state.sessionUpdate).toBeNull()
  })

  it("refuses every operator status a customer might try to set", async () => {
    // The customer PATCH owns exactly one move. Everything else belongs to the
    // operator callback, which authenticates differently.
    for (const status of ["IN_PROGRESS", "AWAITING_PROVIDER", "AWAITING_CUSTOMER", "COMPLETED", "QUEUED"]) {
      state.session = sessionRow({ mode_b_status: "QUEUED", mode_b_request_id: "hzn_1" })
      state.sessionUpdate = null
      const response = await assistedPatch(
        new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status }) }),
        context,
      )
      expect(response.status).toBe(400)
      expect(state.sessionUpdate).toBeNull()
    }
  })

  it("refuses to cancel a session with no queued request", async () => {
    state.session = sessionRow({ mode_b_status: null })
    const response = await assistedPatch(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
      context,
    )
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_NOT_QUEUED")
  })
})
