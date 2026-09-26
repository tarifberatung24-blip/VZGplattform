import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Route-level tests for bill verification and the preferences guard.
 *
 * Verification is the step that separates an OFFERED saving from a VERIFIED one,
 * so the tests assert that a mismatch never promotes the state and never exposes
 * a verified saving for Capital. The preferences test asserts the credential
 * refusal on a real request path.
 */

const state = vi.hoisted(() => ({
  signedIn: true,
  session: null as Record<string, unknown> | null,
  offers: [] as Array<Record<string, unknown>>,
  verifications: [] as Array<Record<string, unknown>>,
  events: [] as Array<Record<string, unknown>>,
  verificationUpdate: null as Record<string, unknown> | null,
  sessionUpdate: null as Record<string, unknown> | null,
  preferencesUpsert: null as Record<string, unknown> | null,
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
        if (table === "negotiation_sessions") return state.session
        if (table === "negotiation_verifications") return state.verifications[0] ?? null
        return null
      }
      const listFor = () => {
        if (table === "negotiation_offers") return state.offers
        if (table === "negotiation_verifications") return state.verifications
        if (table === "negotiation_events") return state.events
        return []
      }
      Object.assign(query, {
        select: self,
        eq: self,
        order: self,
        upsert: (row: Record<string, unknown>) => {
          if (table === "negotiation_preferences") state.preferencesUpsert = row
          return query
        },
        maybeSingle: async () => ({ data: rowFor(), error: null }),
        single: async () => {
          if (table === "negotiation_verifications") {
            const created = { id: "verification-1", session_id: "session-1", result: "pending" }
            state.verifications = [created, ...state.verifications]
            return { data: created, error: null }
          }
          return { data: rowFor(), error: null }
        },
        insert: (rows: unknown) => {
          const list = Array.isArray(rows) ? rows : [rows]
          if (table === "negotiation_events") state.events.push(...(list as Array<Record<string, unknown>>))
          return query
        },
        update: (patch: Record<string, unknown>) => {
          if (table === "negotiation_verifications") {
            state.verificationUpdate = patch
            state.verifications = state.verifications.map((row) => ({ ...row, ...patch }))
          }
          if (table === "negotiation_sessions") state.sessionUpdate = patch
          return query
        },
        // The repository awaits the builder for its list queries, so the mock must
        // be thenable and resolve to the table's rows.
        then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: listFor(), error: null }).then(resolve),
      })
      return query
    },
  }),
}))

import { POST as verifyPost } from "./verification/route"
import { POST as preferencesPost } from "./preferences/route"

const context = { params: Promise.resolve({ sessionId: "session-1" }) }

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test-only")
  vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "true")
  state.signedIn = true
  state.session = {
    id: "session-1",
    owner_id: "user-1",
    household_id: "home-1",
    contract_id: "contract-1",
    category: "internet",
    state: "CONFIRMED",
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
    target_monthly_cost: 34.99,
    potential_monthly_saving: 15,
    potential_annual_saving: 180,
    promotion_expiry: null,
    verification_due_at: null,
    verified_at: null,
    closed_at: null,
    created_at: "2026-09-26T00:00:00.000Z",
    updated_at: "2026-09-26T00:00:00.000Z",
  }
  state.offers = [
    {
      id: "offer-1",
      session_id: "session-1",
      origin: "provider",
      source: "user_paste",
      document_id: null,
      content: {},
      content_hash: "hash-a",
      parsed_facts: { newMonthly: 34.99, oneTimeCredit: 10, activationFee: 0, effectiveDate: "2026-10-01" },
      status: "accepted",
      supersedes_offer_id: null,
      approved_hash: "hash-a",
      approved_at: "2026-09-26T00:00:00.000Z",
      rejected_at: null,
      created_at: "2026-09-26T00:00:00.000Z",
    },
  ]
  state.verifications = []
  state.events = []
  state.verificationUpdate = null
  state.sessionUpdate = null
  state.preferencesUpsert = null
})

describe("bill verification route", () => {
  it("marks the saving VERIFIED only when the bill matches", async () => {
    state.offers = [{ ...state.offers[0], parsed_facts: { newMonthly: 34.99, activationFee: 0 } }]
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", { monthlyCost: 34.99 }),
      context,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result).toBe("VERIFIED")
    expect(body.state).toBe("VERIFIED_SAVING")
    expect(body.verified_saving).toEqual({ verifiedMonthlySaving: 15, verifiedAnnualSaving: 180 })
  })

  it("reports a mismatch, keeps the state out of VERIFIED_SAVING and exposes no verified saving", async () => {
    state.offers = [{ ...state.offers[0], parsed_facts: { newMonthly: 34.99, activationFee: 0 } }]
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", { monthlyCost: 49.99 }),
      context,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result).toBe("MISMATCH")
    expect(body.state).toBe("NEGOTIATION")
    expect(body.verified_saving).toEqual({ verifiedMonthlySaving: null, verifiedAnnualSaving: null })
    expect(body.discrepancies).toContainEqual({ field: "monthly_cost", expected: 34.99, actual: 49.99 })
  })

  it("reports NOT_YET_EFFECTIVE for a bill that predates the negotiated terms", async () => {
    state.offers = [
      {
        ...state.offers[0],
        parsed_facts: { newMonthly: 34.99, effectiveDate: "2026-11-01" },
      },
    ]
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", {
        monthlyCost: 49.99,
        billingPeriodEnd: "2026-10-31",
      }),
      context,
    )
    const body = await response.json()
    expect(body.result).toBe("NOT_YET_EFFECTIVE")
    expect(body.state).toBe("NEGOTIATION")
    expect(body.verified_saving.verifiedMonthlySaving).toBeNull()
  })

  it("refuses to verify when there is no accepted offer", async () => {
    state.offers = []
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", { monthlyCost: 34.99 }),
      context,
    )
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("NEGOTIATION_NO_ACCEPTED_OFFER")
  })

  it("returns 404 when the feature flag is off", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "false")
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", { monthlyCost: 34.99 }),
      context,
    )
    expect(response.status).toBe(404)
  })

  it("rejects a malformed bill payload", async () => {
    const response = await verifyPost(
      request("/api/negotiation/session/session-1/verification", { monthlyCost: -5 }),
      context,
    )
    expect(response.status).toBe(400)
  })
})

describe("preferences route — credential refusal", () => {
  it("refuses a payload carrying a credential-shaped field", async () => {
    const response = await preferencesPost(
      request("/api/negotiation/session/session-1/preferences", { mustKeep: [], password: "hunter2" }),
      context,
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("NEGOTIATION_CREDENTIAL_FIELD_REFUSED")
    expect(body.fields).toContain("password")
    expect(state.preferencesUpsert).toBeNull()
  })

  it("refuses a nested TAN field", async () => {
    const response = await preferencesPost(
      request("/api/negotiation/session/session-1/preferences", {
        mustKeep: [],
        meta: { tan: "123456" },
      }),
      context,
    )
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("NEGOTIATION_CREDENTIAL_FIELD_REFUSED")
  })

  it("returns 404 when the flag is off", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "false")
    const response = await preferencesPost(
      request("/api/negotiation/session/session-1/preferences", { mustKeep: [] }),
      context,
    )
    expect(response.status).toBe(404)
  })
})
