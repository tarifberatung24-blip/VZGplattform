import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Route-level tests for the offer decision endpoint.
 *
 * This is the enforcement point for "no auto-acceptance", so the tests drive the
 * real handler and assert the refusals: a hash mismatch and a hard preference
 * violation must both be rejected server-side, against the stored offer content.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  offer: null as Record<string, unknown> | null,
  preferences: null as Record<string, unknown> | null,
  contract: null as Record<string, unknown> | null,
  session: null as Record<string, unknown> | null,
  events: [] as Array<Record<string, unknown>>,
  offerUpdate: null as Record<string, unknown> | null,
  sessionUpdate: null as Record<string, unknown> | null,
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "home-1" }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
    from: (table: string) => {
      const query: Record<string, unknown> = {}
      const self = () => query
      const rowFor = () => {
        if (table === "contracts") return state.contract
        if (table === "negotiation_sessions") return state.session
        if (table === "negotiation_offers") return state.offer
        if (table === "negotiation_preferences") return state.preferences
        return null
      }
      Object.assign(query, {
        select: self,
        eq: self,
        order: self,
        maybeSingle: async () => ({ data: rowFor(), error: null }),
        single: async () => ({ data: rowFor(), error: null }),
        insert: (rows: unknown) => {
          const list = Array.isArray(rows) ? rows : [rows]
          if (table === "negotiation_events") state.events.push(...(list as Array<Record<string, unknown>>))
          return query
        },
        update: (patch: Record<string, unknown>) => {
          if (table === "negotiation_offers") {
            state.offerUpdate = patch
            state.offer = { ...state.offer, ...patch }
          }
          if (table === "negotiation_sessions") state.sessionUpdate = patch
          return query
        },
      })
      return query
    },
  }),
}))

import { POST } from "./route"

function request(body: unknown) {
  return new Request("http://localhost/api/negotiation/session/session-1/offers/offer-1/decision", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ sessionId: "session-1", offerId: "offer-1" }) }

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test-only")
  vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "true")
  state.signedIn = true
  state.offer = {
    id: "offer-1",
    session_id: "session-1",
    origin: "provider",
    source: "user_paste",
    document_id: null,
    content: { text: "34,99 € monatlich" },
    content_hash: "hash-a",
    parsed_facts: { newMonthly: 34.99 },
    status: "received",
    supersedes_offer_id: null,
    approved_hash: null,
    approved_at: null,
    rejected_at: null,
    created_at: "2026-09-26T00:00:00.000Z",
  }
  state.preferences = null
  state.contract = {
    id: "contract-1",
    title: "DSL 100",
    category: "internet",
    provider: "Telekom",
    contract_number: null,
    monthly_amount: 49.99,
    start_date: null,
    end_date: null,
    cancellation_deadline: null,
    promotion_expiry: null,
    services: [],
    price_history: [],
    review_status: "confirmed",
    document_id: null,
  }
  state.session = {
    id: "session-1",
    owner_id: "user-1",
    household_id: "home-1",
    contract_id: "contract-1",
    category: "internet",
    state: "USER_REVIEW",
    decision_action: "NEGOTIATE",
    reason_codes: [],
    missing_information: [],
    opportunity_confidence: 1,
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
  state.events = []
  state.offerUpdate = null
  state.sessionUpdate = null
})

describe("offer decision — no auto-acceptance", () => {
  it("refuses ACCEPT when the approved hash does not match the stored content", async () => {
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-b" }), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: "NEGOTIATION_APPROVAL_HASH_MISMATCH" })
    expect(state.offerUpdate).toBeNull()
  })

  it("refuses ACCEPT when a hard preference is violated, even at a lower price", async () => {
    state.preferences = {
      must_keep: [],
      may_accept: [],
      must_never_accept: ["activation_fee"],
      max_contract_extension_months: null,
      allow_plan_change: false,
      allow_addons: false,
      allow_one_time_credit: false,
      allow_temporary_discount: false,
      min_monthly_saving: null,
      provenance: {},
    }
    state.offer = { ...state.offer, parsed_facts: { newMonthly: 34.99, activationFee: 39.99 } }
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: "NEGOTIATION_OFFER_VIOLATES_PREFERENCES" })
    expect(state.offerUpdate).toBeNull()
  })

  it("accepts when the hash matches and no hard preference is violated", async () => {
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.decision).toBe("ACCEPT")
    expect(body.offer_status).toBe("accepted")
    expect(state.offerUpdate?.approved_hash).toBe("hash-a")
  })

  it("records the acceptance as an offer_approved timeline event", async () => {
    await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(state.events.map((event) => event.event_type)).toContain("offer_approved")
  })

  it("does not require a hash for a counter-offer or a rejection", async () => {
    const counter = await POST(request({ decision: "COUNTER" }), context)
    expect(counter.status).toBe(200)
    expect(state.offerUpdate?.status).toBe("countered")
  })

  it("routes a switch comparison to the reject path and flags the fallback", async () => {
    const response = await POST(request({ decision: "COMPARE_SWITCH" }), context)
    expect(response.status).toBe(200)
    expect((await response.json()).switch_fallback).toBe(true)
    expect(state.offerUpdate?.status).toBe("rejected")
  })

  it("refuses a decision on an already-decided offer", async () => {
    state.offer = { ...state.offer, status: "accepted" }
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: "NEGOTIATION_OFFER_NOT_REVIEWABLE" })
  })

  it("returns 404 when the offer is not in the caller's session", async () => {
    state.offer = null
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(response.status).toBe(404)
  })

  it("returns 404 when the feature flag is off", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "false")
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    expect(response.status).toBe(404)
    expect(state.offerUpdate).toBeNull()
  })

  it("reports the deterministic saving without hiding the binding term", async () => {
    // 12 months remain, so a 24-month offer adds 12 months of binding time.
    state.contract = { ...state.contract, end_date: "2027-09-26" }
    state.offer = {
      ...state.offer,
      parsed_facts: { newMonthly: 34.99, newContractDurationMonths: 24 },
    }
    const response = await POST(request({ decision: "ACCEPT", approvedHash: "hash-a" }), context)
    const body = await response.json()
    expect(body.savings.monthly_recurring_saving).toBe(15)
    expect(body.savings.warnings).toContain("NEW_MINIMUM_TERM")
  })
})
