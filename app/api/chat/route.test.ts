import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  signedIn: true,
  databaseError: false,
  streamText: vi.fn(),
  rows: [
    { title: "Confirmed internet", household_id: "home-1", review_status: "confirmed" },
    { title: "Unconfirmed amount", household_id: "home-1", review_status: "needs_review" },
    { title: "Other household", household_id: "home-2", review_status: "confirmed" },
  ],
}))

vi.mock("ai", () => ({ streamText: state.streamText }))
vi.mock("@ai-sdk/groq", () => ({ groq: () => "test-model" }))
vi.mock("@/lib/supabase/household", () => ({ ensureHousehold: async () => "home-1" }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
    from: (table: string) => {
      let rows: Array<Record<string, string>> = table === "contracts" ? [...state.rows] : []
      const query = {
        select: () => query,
        eq: (key: string, value: string) => { rows = rows.filter((row) => row[key] === value); return query },
        order: () => query,
        limit: async () => ({ data: rows, error: state.databaseError ? { message: "Unavailable" } : null }),
      }
      return query
    },
  }),
}))

import { POST } from "./route"

const request = () => new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Какъв е договорът ми?" }] }) })

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
  state.signedIn = true
  state.databaseError = false
  state.streamText.mockReset().mockReturnValue({ toTextStreamResponse: () => new Response("test response") })
})

describe("chat context boundary", () => {
  it("sends only confirmed contracts belonging to the current household", async () => {
    expect((await POST(request())).status).toBe(200)
    const { system } = state.streamText.mock.calls[0][0]
    expect(system).toContain("Confirmed internet")
    expect(system).not.toContain("Unconfirmed amount")
    expect(system).not.toContain("Other household")
  })
  it("does not call the model when context queries fail", async () => {
    state.databaseError = true
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: "CHAT_CONTEXT_UNAVAILABLE" })
    expect(state.streamText).not.toHaveBeenCalled()
  })
  it("does not call the model for a signed-out user", async () => {
    state.signedIn = false
    expect((await POST(request())).status).toBe(401)
    expect(state.streamText).not.toHaveBeenCalled()
  })
})
