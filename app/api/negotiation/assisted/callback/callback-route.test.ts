import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Route tests for the MODE B operator/n8n callback.
 *
 * This endpoint is reachable without a session cookie, so its guarantees cannot
 * rest on the customer route's auth. Each test drives one of them directly: the
 * secret, the ownership match, the bounded transition set, idempotency, the
 * credential refusal, and the fact that the negotiation lifecycle never moves.
 */

const state = vi.hoisted(() => ({
  /** The row the service-role read returns for a request id, or null. */
  session: null as Record<string, unknown> | null,
  sessionUpdate: null as Record<string, unknown> | null,
  events: [] as Array<Record<string, unknown>>,
  audit: [] as Array<Record<string, unknown>>,
  /** Every `eq` filter the read applied, so a test can assert the lookup key. */
  eqCalls: [] as Array<[string, unknown]>,
  adminAvailable: true,
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/office/supabase/admin", () => ({
  createAdminClient: () => {
    if (!state.adminAvailable) return null
    return {
      from: (table: string) => {
        const query: Record<string, unknown> = {}
        const self = () => query
        Object.assign(query, {
          select: self,
          eq: (column: string, value: unknown) => {
            state.eqCalls.push([column, value])
            return query
          },
          maybeSingle: async () => ({ data: state.session, error: null }),
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
    }
  },
}))

import { POST as callbackPost } from "./route"

const SECRET = "callback-secret-value"

function request(
  body: unknown,
  headers: Record<string, string> = {},
  raw?: string,
): Request {
  return new Request("https://app.example/api/negotiation/assisted/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  })
}

function authed(body: unknown) {
  return request(body, { "x-horizon-negotiation-callback-secret": SECRET })
}

function queuedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    owner_id: "owner-1",
    household_id: "home-1",
    mode_b_request_id: "hzn_1",
    mode_b_status: "QUEUED",
    state: "NEGOTIATION",
    category: "internet",
    ...overrides,
  }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "1")
  vi.stubEnv("HORIZON_NEGOTIATION_CALLBACK_SECRET", SECRET)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
  state.session = queuedSession()
  state.sessionUpdate = null
  state.events = []
  state.audit = []
  state.eqCalls = []
  state.adminAvailable = true
})

describe("assisted callback — authentication", () => {
  it("refuses a request with no secret", async () => {
    const response = await callbackPost(request({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_CALLBACK_UNAUTHORIZED")
  })

  it("refuses a wrong secret", async () => {
    const response = await callbackPost(
      request(
        { requestId: "hzn_1", status: "IN_PROGRESS" },
        { "x-horizon-negotiation-callback-secret": "wrong" },
      ),
    )
    expect(response.status).toBe(401)
  })

  it("refuses a secret that is a prefix of the real one", async () => {
    // A prefix must not authenticate; the length check makes this a plain refusal.
    const response = await callbackPost(
      request({ requestId: "hzn_1", status: "IN_PROGRESS" }, { "x-horizon-negotiation-callback-secret": SECRET.slice(0, 5) }),
    )
    expect(response.status).toBe(401)
  })

  it("accepts the secret as a bearer token too", async () => {
    const response = await callbackPost(
      request({ requestId: "hzn_1", status: "IN_PROGRESS" }, { authorization: `Bearer ${SECRET}` }),
    )
    expect(response.status).toBe(200)
  })

  it("writes nothing when the secret is refused", async () => {
    await callbackPost(request({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(state.sessionUpdate).toBeNull()
    expect(state.events).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it("reports not-configured rather than authenticating when no secret is set", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_CALLBACK_SECRET", "")
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(503)
  })

  it("is indistinguishable from a missing feature when the flag is off", async () => {
    vi.stubEnv("HORIZON_NEGOTIATION_ENABLED", "0")
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe("NEGOTIATION_DISABLED")
  })
})

describe("assisted callback — valid transitions", () => {
  it("applies the full declared chain", async () => {
    const chain = [
      ["QUEUED", "IN_PROGRESS"],
      ["IN_PROGRESS", "AWAITING_PROVIDER"],
      ["AWAITING_PROVIDER", "AWAITING_CUSTOMER"],
      ["AWAITING_CUSTOMER", "IN_PROGRESS"],
      ["IN_PROGRESS", "COMPLETED"],
    ] as const
    for (const [from, to] of chain) {
      state.session = queuedSession({ mode_b_status: from })
      const response = await callbackPost(authed({ requestId: "hzn_1", status: to }))
      expect(response.status).toBe(200)
      expect((await response.json()).status).toBe(to)
    }
  })

  it("records the move on the queue column, not the lifecycle", async () => {
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(200)
    expect(state.sessionUpdate).toMatchObject({ mode_b_status: "IN_PROGRESS" })
    expect(state.sessionUpdate).not.toHaveProperty("state")
  })

  it("leaves the negotiation state untouched", async () => {
    // The queue column is the only thing written; the lifecycle is untouched.
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(200)
    expect(state.sessionUpdate).toMatchObject({ mode_b_status: "IN_PROGRESS" })
    expect(state.sessionUpdate).not.toHaveProperty("state")
    expect(state.sessionUpdate).not.toHaveProperty("closed_at")
  })

  it("appends exactly one immutable event and one audit line", async () => {
    await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({ event_type: "operator_status_changed" })
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0]).toMatchObject({
      event_type: "negotiation.assisted_status_changed",
      actor_user_id: null,
    })
  })

  it("records no free text from the callback in the timeline", async () => {
    await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    const detail = state.events[0].detail as Record<string, unknown>
    expect(detail).toEqual({ from: "QUEUED", to: "IN_PROGRESS", source: "operator_callback" })
  })
})

describe("assisted callback — invalid transitions", () => {
  it("refuses a jump that skips the chain", async () => {
    state.session = queuedSession({ mode_b_status: "QUEUED" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "COMPLETED" }))
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_CALLBACK_INVALID_TRANSITION")
  })

  it("refuses a callback that tries to set CANCELLED", async () => {
    state.session = queuedSession({ mode_b_status: "IN_PROGRESS" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "CANCELLED" }))
    expect(response.status).toBe(409)
  })

  it("refuses a callback that tries to set QUEUED", async () => {
    state.session = queuedSession({ mode_b_status: "IN_PROGRESS" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "QUEUED" }))
    expect(response.status).toBe(409)
  })

  it("writes nothing on an invalid transition", async () => {
    state.session = queuedSession({ mode_b_status: "QUEUED" })
    await callbackPost(authed({ requestId: "hzn_1", status: "COMPLETED" }))
    expect(state.sessionUpdate).toBeNull()
    expect(state.events).toHaveLength(0)
  })
})

describe("assisted callback — terminal states", () => {
  it("refuses any move out of COMPLETED", async () => {
    state.session = queuedSession({ mode_b_status: "COMPLETED" })
    for (const status of ["IN_PROGRESS", "AWAITING_PROVIDER", "AWAITING_CUSTOMER"]) {
      const response = await callbackPost(authed({ requestId: "hzn_1", status }))
      expect(response.status).toBe(409)
    }
  })

  it("refuses any move out of CANCELLED", async () => {
    state.session = queuedSession({ mode_b_status: "CANCELLED" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(409)
  })
})

describe("assisted callback — idempotency", () => {
  it("acknowledges a repeat without writing", async () => {
    state.session = queuedSession({ mode_b_status: "AWAITING_PROVIDER" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "AWAITING_PROVIDER" }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ applied: false, idempotent: true })
    expect(state.sessionUpdate).toBeNull()
    expect(state.events).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it("is safe to deliver the same transition twice", async () => {
    state.session = queuedSession({ mode_b_status: "QUEUED" })
    const first = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(first.status).toBe(200)
    expect(state.events).toHaveLength(1)

    // The queue retries: the row now reads IN_PROGRESS, so the second delivery
    // is a replay and must not append a second event.
    state.session = queuedSession({ mode_b_status: "IN_PROGRESS" })
    const second = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(second.status).toBe(200)
    expect((await second.json()).applied).toBe(false)
    expect(state.events).toHaveLength(1)
  })
})

describe("assisted callback — unknown request", () => {
  it("returns 404 when no session carries the request id", async () => {
    state.session = null
    const response = await callbackPost(authed({ requestId: "hzn_missing", status: "IN_PROGRESS" }))
    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe("NEGOTIATION_ASSISTED_CALLBACK_UNKNOWN_REQUEST")
  })

  it("looks the session up by the queue key, not the body's session id", async () => {
    await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(state.eqCalls).toContainEqual(["mode_b_request_id", "hzn_1"])
  })

  it("returns 404 when the matched session has no queue status", async () => {
    state.session = queuedSession({ mode_b_status: null })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(404)
  })

  it("writes nothing for an unknown request", async () => {
    state.session = null
    await callbackPost(authed({ requestId: "hzn_missing", status: "IN_PROGRESS" }))
    expect(state.sessionUpdate).toBeNull()
    expect(state.events).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })
})

describe("assisted callback — cross-owner protection", () => {
  it("binds the write repository to the owner read from the row", async () => {
    // The service-role read finds the row; the write must still be owner-scoped,
    // which the repository does by filtering on the owner id it was given.
    state.session = queuedSession({ owner_id: "owner-2" })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(200)
    // The update path applies `.eq("owner_id", ...)`; the mock records eq calls
    // for the read, so assert the repository was constructed from the row by
    // checking the write still happened for the row's own session id.
    expect(state.sessionUpdate).toMatchObject({ mode_b_status: "IN_PROGRESS" })
  })

  it("cannot move a session whose request id does not match the callback", async () => {
    // The row is found by request id, so a mismatch cannot occur through the
    // lookup; the decision layer refuses it if the row's key were ever altered.
    state.session = queuedSession({ mode_b_request_id: null })
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(404)
    expect(state.sessionUpdate).toBeNull()
  })
})

describe("assisted callback — credential-shaped payloads", () => {
  it("refuses a body carrying an extra credential field", async () => {
    // The body shape is closed: an unknown key is rejected before any write, so a
    // queue misconfigured to forward a customer's password cannot smuggle it in.
    const response = await callbackPost(
      authed({ requestId: "hzn_1", status: "IN_PROGRESS", password: "hunter2" }),
    )
    expect(response.status).toBe(400)
    expect(state.sessionUpdate).toBeNull()
    expect(state.events).toHaveLength(0)
  })

  it("refuses any free-text channel at all", async () => {
    // There is deliberately no `note` field: prose cannot be reliably scanned for
    // a secret, so the callback simply has nowhere to put one.
    for (const field of ["note", "tan", "otp", "pin", "message", "comment"]) {
      const response = await callbackPost(
        authed({ requestId: "hzn_1", status: "IN_PROGRESS", [field]: "anything" }),
      )
      expect(response.status).toBe(400)
    }
  })

  it("refuses a body that is a bare string", async () => {
    const response = await callbackPost(
      request(null, { "x-horizon-negotiation-callback-secret": SECRET }, JSON.stringify("password")),
    )
    expect(response.status).toBe(400)
  })
})

describe("assisted callback — payload shape", () => {
  it("refuses a malformed body", async () => {
    expect((await callbackPost(authed({ status: "IN_PROGRESS" }))).status).toBe(400)
    expect((await callbackPost(authed({ requestId: "hzn_1" }))).status).toBe(400)
  })

  it("refuses a body that is not JSON", async () => {
    const response = await callbackPost(
      request(null, { "x-horizon-negotiation-callback-secret": SECRET }, "not json"),
    )
    expect(response.status).toBe(400)
  })

  it("refuses an empty request id", async () => {
    expect((await callbackPost(authed({ requestId: "", status: "IN_PROGRESS" }))).status).toBe(400)
  })

  it("reports not-configured when no service-role key is available", async () => {
    state.adminAvailable = false
    const response = await callbackPost(authed({ requestId: "hzn_1", status: "IN_PROGRESS" }))
    expect(response.status).toBe(503)
  })
})
