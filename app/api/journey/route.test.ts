import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

let currentUser: { id: string } | null = null
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}))

const isJourneyRecordingEnabled = vi.fn()
vi.mock("@/lib/journey/recording", () => ({ isJourneyRecordingEnabled: (...args: unknown[]) => isJourneyRecordingEnabled(...args) }))

const insert = vi.fn()
vi.mock("@/lib/journey/db", () => ({ createJourneyDb: () => ({ from: () => ({ insert: (...args: unknown[]) => insert(...args) }) }) }))

import { GET, POST } from "./route"

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(new Request("https://horizon.test/api/journey", {
    method: "POST",
    headers: { "content-type": "application/json", host: "horizon.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }))
}

const view = { event: "page_view", path: "/de/steuer/review", sessionId: "session-1234" }

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: "user-1" }
  isJourneyRecordingEnabled.mockResolvedValue(true)
  insert.mockResolvedValue({ error: null })
})

describe("POST /api/journey", () => {
  it("stores a normalized event for a signed-in user", async () => {
    const response = await post(view)
    expect(response.status).toBe(204)
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1", event: "page_view", module: "steuer", step: "review", code: null, session_id: "session-1234", locale: "de",
    })
  })

  it("stores nothing once the user has switched recording off", async () => {
    isJourneyRecordingEnabled.mockResolvedValue(false)
    expect((await post(view)).status).toBe(204)
    expect(insert).not.toHaveBeenCalled()
  })

  it("stores nothing for a signed-out visitor", async () => {
    currentUser = null
    expect((await post(view)).status).toBe(204)
    expect(isJourneyRecordingEnabled).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it("keeps an error code only on client_error events", async () => {
    await post({ ...view, code: "TypeError" })
    expect(insert.mock.calls[0][0].code).toBeNull()
    await post({ event: "client_error", path: "/de/steuer", code: "TypeError" })
    expect(insert.mock.calls[1][0]).toMatchObject({ event: "client_error", code: "TypeError", module: "steuer", step: null })
  })

  it("drops id-like path segments", async () => {
    await post({ event: "page_view", path: "/de/vertraege/3f2b8c1e-aaaa-4bbb-8ccc-123456789abc" })
    expect(insert.mock.calls[0][0]).toMatchObject({ module: "vertraege", step: null })
  })

  it("rejects malformed, oversized, unknown and free-text payloads", async () => {
    expect((await post("not json")).status).toBe(400)
    expect((await post({ event: "click", path: "/de" })).status).toBe(400)
    expect((await post({ ...view, message: "typed text" })).status).toBe(400)
    expect((await post("x".repeat(3000))).status).toBe(413)
    expect(insert).not.toHaveBeenCalled()
  })

  it("rejects a request from another origin", async () => {
    expect((await post(view, { origin: "https://evil.example" })).status).toBe(403)
    expect(insert).not.toHaveBeenCalled()
  })

  it("rate-limits one user", async () => {
    currentUser = { id: "user-rate" }
    let last = 204
    for (let index = 0; index < 62; index += 1) last = (await post(view)).status
    expect(last).toBe(429)
  })
})

describe("GET /api/journey", () => {
  it("reports whether recording is on for the signed-in user", async () => {
    expect(await (await GET()).json()).toEqual({ enabled: true })
    isJourneyRecordingEnabled.mockResolvedValue(false)
    expect(await (await GET()).json()).toEqual({ enabled: false })
  })

  it("reports false for a signed-out visitor", async () => {
    currentUser = null
    expect(await (await GET()).json()).toEqual({ enabled: false })
  })
})
