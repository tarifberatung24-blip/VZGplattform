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
  /** Order of external side effects, so a test can prove reserve precedes send. */
  order: [] as string[],
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  finalizeCalls: [] as Array<Record<string, unknown>>,
  auditFails: false,
  /** When set, the reservation RPC returns this instead of the derived result. */
  reserveOverride: null as Array<Record<string, unknown>> | null,
  reserveError: null as string | null,
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "home-1" }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args })
      state.order.push(`rpc:${fn}`)
      if (fn === "reserve_negotiation_handoff") {
        if (state.reserveError) return { data: null, error: { message: state.reserveError } }
        if (state.reserveOverride) return { data: state.reserveOverride, error: null }
        const current = state.session as { mode_b_status?: string | null; mode_b_request_id?: string | null } | null
        const status = current?.mode_b_status ?? null
        const active = status !== null && !["COMPLETED", "CANCELLED"].includes(status)
        if (active) {
          return {
            data: [
              {
                request_id: current?.mode_b_request_id,
                deliver: false,
                status,
                reason: "active",
              },
            ],
            error: null,
          }
        }
        return {
          data: [{ request_id: args.p_request_id, deliver: true, status: "QUEUED", reason: "reserved" }],
          error: null,
        }
      }
      if (fn === "finalize_negotiation_handoff_delivery") {
        state.finalizeCalls.push(args)
        return { data: true, error: null }
      }
      return { data: null, error: null }
    },
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
        then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
          Promise.resolve({
            data: [],
            error:
              state.auditFails && table === "platform_audit_events"
                ? { message: "audit down" }
                : null,
          }).then(resolve),
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
  state.order = []
  state.rpcCalls = []
  state.finalizeCalls = []
  state.auditFails = false
  state.reserveOverride = null
  state.reserveError = null
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string; headers?: Record<string, string> }) => {
    state.fetchCalls.push({ url: String(url), body: init?.body ?? "", headers: init?.headers ?? {} })
    state.order.push("fetch")
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
  it("reserves the handoff before it sends, and records the queue state separately from the lifecycle", async () => {
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ locale: "de" }) }),
      context,
    )
    expect(response.status).toBe(202)
    const payload = await response.json()
    expect(payload.status).toBe("QUEUED")
    expect(payload.requestId).toMatch(/^hzn_/)

    // The reservation must precede the send, or a fast callback could name a key
    // that does not exist yet.
    expect(state.order[0]).toBe("rpc:reserve_negotiation_handoff")
    expect(state.order).toContain("fetch")
    expect(state.order.indexOf("rpc:reserve_negotiation_handoff")).toBeLessThan(state.order.indexOf("fetch"))

    expect(state.fetchCalls).toHaveLength(1)
    // The queue columns are written atomically by the reservation RPC, never by a
    // separate session update, so the handoff cannot be half-recorded.
    expect(state.rpcCalls[0].fn).toBe("reserve_negotiation_handoff")
    expect(state.sessionUpdate).toBeNull()
    expect(state.audit.some((row) => row.event_type === "negotiation.assisted_handoff_queued")).toBe(true)
  })

  it("does not mint a second request id or send for a concurrent double-submit", async () => {
    // Two submits race; the database hands the loser `deliver: false`. The loser
    // must reuse the winner's id and must not create a second external job.
    state.reserveOverride = [
      { request_id: "hzn_winner", deliver: false, status: "QUEUED", reason: "in_flight" },
    ]
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect((await response.json()).requestId).toBe("hzn_winner")
    expect(state.fetchCalls).toHaveLength(0)
    expect(state.finalizeCalls).toHaveLength(0)
  })

  it("retries a previously failed delivery with the same id rather than a new one", async () => {
    state.reserveOverride = [
      { request_id: "hzn_failed", deliver: true, status: "QUEUED", reason: "retry" },
    ]
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect((await response.json()).requestId).toBe("hzn_failed")
    expect(JSON.parse(state.fetchCalls[0].body).requestId).toBe("hzn_failed")
  })

  it("does not re-send a handoff the receiver already has", async () => {
    state.session = sessionRow({ mode_b_request_id: "hzn_existing", mode_b_status: "IN_PROGRESS" })
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect((await response.json()).requestId).toBe("hzn_existing")
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("reports a queue failure and does not advance the lifecycle", async () => {
    state.fetchOk = false
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(502)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_QUEUE_FAILED")
    // The failed attempt is recorded so a retry may reuse the same id...
    expect(state.finalizeCalls).toHaveLength(1)
    expect(state.finalizeCalls[0]).toMatchObject({ p_delivered: false })
    // ...and the lifecycle did not move on a failed send.
    expect(state.sessionUpdate).toBeNull()
  })

  it("records a successful delivery so it is not re-sent", async () => {
    await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(state.finalizeCalls).toHaveLength(1)
    expect(state.finalizeCalls[0]).toMatchObject({ p_delivered: true })
  })

  it("surfaces a failed reservation as an upstream error and sends nothing", async () => {
    state.reserveError = "deadlock detected"
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(502)
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("reports an audit failure on the response instead of swallowing it", async () => {
    state.auditFails = true
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(202)
    expect((await response.json()).auditError).toBe(true)
    // The handoff still happened; only the platform audit line is missing.
    expect(state.fetchCalls).toHaveLength(1)
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

  it("refuses a neutral url with no neutral secret rather than borrowing the legacy one", async () => {
    // Half-migrated configuration must disable the handoff, not blend families.
    vi.stubEnv("HORIZON_AUTOMATION_WEBHOOK_SECRET", "")
    vi.stubEnv("N8N_WEBHOOK_SECRET", "legacy-secret")
    const response = await assistedPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      context,
    )
    expect(response.status).toBe(503)
    expect(state.fetchCalls).toHaveLength(0)
  })

  it("still works through the complete legacy N8N_* pair", async () => {
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
    // The legacy header is sent only in this family.
    expect(state.fetchCalls[0].headers["X-FinanzBG-Webhook-Secret"]).toBe("legacy-secret")
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
    // A neutral receiver is not told the legacy header name exists.
    expect(headers["X-FinanzBG-Webhook-Secret"]).toBeUndefined()
    expect(JSON.stringify(headers).toLowerCase()).not.toContain("n8n")
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
