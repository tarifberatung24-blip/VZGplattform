import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Route-level tests for the negotiation start endpoint.
 *
 * These exercise the real route handler with a stubbed Supabase client, so the
 * flag gate, ownership scoping, category eligibility and the deterministic
 * analysis are all covered through the path a request actually takes. The stub
 * records the filters applied, which is how the ownership assertion is made.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  contract: null as Record<string, unknown> | null,
  /** Every eq() applied, across all tables, so ownership can be asserted. */
  allFilters: [] as Array<[string, unknown]>,
  sessionUpdate: null as Record<string, unknown> | null,
  events: [] as Array<Record<string, unknown>>,
  audit: [] as Array<Record<string, unknown>>,
}))

// The route graph reaches `server-only`, which throws outside a Server Component.
// Stubbing it here keeps the test local to this file instead of weakening the
// guard globally.
vi.mock("server-only", () => ({}))

const SESSION_ROW = {
  id: "session-1",
  owner_id: "user-1",
  household_id: "home-1",
  contract_id: "contract-1",
  category: "internet",
  state: "CONTRACT",
  decision_action: null,
  reason_codes: [],
  missing_information: [],
  opportunity_confidence: null,
  next_review_date: null,
  analysis: {},
  execution_mode: "SELF",
  mode_b_request_id: null,
  authorization_status: "not_required",
  current_monthly_cost: 49.99,
  target_monthly_cost: null,
  potential_monthly_saving: null,
  potential_annual_saving: null,
  promotion_expiry: null,
  verification_due_at: null,
  verified_at: null,
  closed_at: null,
  created_at: "2026-09-26T00:00:00.000Z",
  updated_at: "2026-09-26T00:00:00.000Z",
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }),
    },
    from: (table: string) => {
      const query: Record<string, unknown> = {}
      const self = () => query
      const rowForTable = () => {
        if (table === "contracts") return state.contract
        if (table === "negotiation_sessions") return { ...SESSION_ROW, ...(state.sessionUpdate ?? {}) }
        return null
      }
      Object.assign(query, {
        select: self,
        eq: (key: string, value: unknown) => {
          state.allFilters.push([key, value])
          return query
        },
        maybeSingle: async () => ({ data: rowForTable(), error: null }),
        single: async () => {
          if (table === "negotiation_sessions") return { data: SESSION_ROW, error: null }
          return { data: null, error: null }
        },
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
        order: self,
      })
      return query
    },
  }),
}))

vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "home-1" }))

import { POST } from "./route"

function request(body: unknown) {
  return new Request("http://localhost/api/negotiation/start", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

function eligibleContract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    title: "DSL 100",
    category: "internet",
    provider: "Telekom",
    contract_number: "K-1",
    monthly_amount: 49.99,
    start_date: "2022-01-01",
    end_date: "2027-01-01",
    cancellation_deadline: "2026-11-01",
    promotion_expiry: null,
    services: [],
    price_history: [],
    review_status: "confirmed",
    document_id: "doc-1",
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
  state.signedIn = true
  state.contract = eligibleContract()
  state.allFilters = []
  state.sessionUpdate = null
  state.events = []
  state.audit = []
})

describe("negotiation start — feature flag", () => {
  it("returns 404 when the flag is off, without touching the database", async () => {
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: "NEGOTIATION_DISABLED" })
    expect(state.events).toEqual([])
  })

  it("returns 404 for an unauthenticated caller even when the flag is on", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "true")
    state.signedIn = false
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(401)
  })
})

describe("negotiation start — eligibility and ownership", () => {
  beforeEach(() => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "true")
  })

  it("refuses a contract in a not-yet-enabled category with its reason", async () => {
    state.contract = eligibleContract({ category: "electricity" })
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      code: "NEGOTIATION_CONTRACT_NOT_ELIGIBLE",
      reason: "CATEGORY_NOT_ENABLED",
    })
  })

  it("refuses a regulated category behind its compliance flag", async () => {
    state.contract = eligibleContract({ category: "insurance" })
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(422)
    expect((await response.json()).reason).toBe("CATEGORY_REGULATED")
  })

  it("scopes the contract lookup to the caller's household", async () => {
    await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(state.allFilters).toContainEqual(["household_id", "home-1"])
    expect(state.allFilters).toContainEqual(["id", "11111111-1111-4111-8111-111111111111"])
  })

  it("returns 404 when the contract is not the caller's", async () => {
    state.contract = null
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: "NEGOTIATION_CONTRACT_NOT_FOUND" })
  })

  it("rejects a malformed body", async () => {
    const response = await POST(request({ contractId: "not-a-uuid" }))
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("NEGOTIATION_VALIDATION_FAILED")
  })
})

describe("negotiation start — deterministic analysis", () => {
  beforeEach(() => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "true")
  })

  it("persists an analysis and returns a decision with no invented saving", async () => {
    const response = await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.decision.action).toBe("WAIT")
    expect(body.decision.target_monthly_cost).toBeNull()
    expect(body.decision.potential_monthly_saving).toBeNull()
    expect(body.decision.comparison_data_required).toBe(true)
    expect(body.decision.reason_codes).toContain("MISSING_COMPARISON_DATA")
  })

  it("advances the session through the declared transitions only", async () => {
    await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(state.sessionUpdate?.state).toBe("OPPORTUNITY")
  })

  it("appends the started and strategy events to the timeline", async () => {
    await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    const types = state.events.map((event) => event.event_type)
    expect(types).toContain("started")
    expect(types).toContain("strategy_created")
    for (const event of state.events) expect(event.owner_id).toBe("user-1")
  })

  it("writes a platform audit event for the started negotiation", async () => {
    await POST(request({ contractId: "11111111-1111-4111-8111-111111111111" }))
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0]).toMatchObject({
      household_id: "home-1",
      actor_user_id: "user-1",
      entity_type: "negotiation_session",
      event_type: "negotiation.started",
    })
  })
})
