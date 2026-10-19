import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  displayName: "Test User",
  fetch: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { display_name: state.displayName } }),
      }
      return query
    },
  }),
}))

vi.stubGlobal("fetch", state.fetch)

import { POST } from "./route"

function request(body: unknown) {
  return new Request("http://localhost/api/generate-letter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validRequest = {
  description: "Моля за удължаване на срока.",
  recipient: "Finanzamt",
  userLanguage: "bg",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("CEREBRAS_API_KEY", "test-key")
  state.user = { id: crypto.randomUUID() }
  state.displayName = "Test User"
})

describe("POST /api/generate-letter", () => {
  it("rejects a signed-out visitor before contacting the provider", async () => {
    state.user = null
    const response = await POST(request(validRequest))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: "AUTHENTICATION_REQUIRED" })
    expect(state.fetch).not.toHaveBeenCalled()
  })

  it("reports missing provider configuration without contacting it", async () => {
    vi.stubEnv("CEREBRAS_API_KEY", "")
    const response = await POST(request(validRequest))
    expect(response.status).toBe(503)
    expect(state.fetch).not.toHaveBeenCalled()
  })

  it("rejects an invalid request before contacting the provider", async () => {
    const response = await POST(request({ description: "", recipient: "Unknown" }))
    expect(response.status).toBe(400)
    expect(state.fetch).not.toHaveBeenCalled()
  })

  it("returns a validated German letter and Bulgarian translation", async () => {
    state.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ german: "Sehr geehrte Damen und Herren", bulgarian: "Уважаеми госпожи и господа" }) } }],
    }), { status: 200 }))

    const response = await POST(request(validRequest))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expect.objectContaining({
      german: "Sehr geehrte Damen und Herren",
      bulgarian: "Уважаеми госпожи и господа",
      placeholders: expect.objectContaining({ name: "Test User" }),
    }))
    const providerRequest = JSON.parse(String(state.fetch.mock.calls[0][1]?.body))
    expect(providerRequest.response_format.json_schema.strict).toBe(true)
  })

  it("never returns malformed provider output as a letter", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    state.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200 }))

    const response = await POST(request(validRequest))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Letter generation failed. Please try again." })
    errorSpy.mockRestore()
  })
})
