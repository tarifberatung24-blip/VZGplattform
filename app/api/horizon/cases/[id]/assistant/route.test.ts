import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  signedIn: true,
  owned: true,
  contextError: false,
  loadCaseContext: vi.fn(),
  streamText: vi.fn(() => ({ toTextStreamResponse: () => new Response("ok") })),
}))

vi.mock("ai", () => ({ streamText: state.streamText }))
vi.mock("@ai-sdk/groq", () => ({ groq: () => "test-model" }))
vi.mock("@/lib/horizon/ai/prompt", () => ({ buildCaseAssistantSystemPrompt: () => "test-system-prompt" }))
vi.mock("@/lib/horizon/ai/registry", () => ({
  HORIZON_AI_MODEL: "test-model",
  provenance: () => ({ promptVersion: "test-prompt-v1" }),
}))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true, retryAfter: 0 }) }))
vi.mock("@/lib/horizon/case", () => ({
  createCaseEngine: async () => ({
    userId: state.signedIn ? "user-1" : null,
    configured: true,
    repository: state.signedIn
      ? {
          loadCaseContext: async (caseId: string) => {
            state.loadCaseContext(caseId)
            if (state.contextError) return { error: "db down", data: null }
            return state.owned ? { error: null, data: { id: caseId } } : { error: null, data: null }
          },
        }
      : null,
  }),
}))

import { POST } from "./route"

const CASE = "11111111-1111-1111-1111-111111111111"

const post = (caseId: string, body: unknown) =>
  POST(
    new Request("http://localhost/api/horizon/cases/" + caseId + "/assistant", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: caseId }) },
  )

beforeEach(() => {
  state.signedIn = true
  state.owned = true
  state.contextError = false
  state.loadCaseContext.mockClear()
  state.streamText.mockClear()
  vi.unstubAllEnvs()
})

describe("P7 case assistant route rails", () => {
  it("refuses an unauthenticated request before anything else", async () => {
    state.signedIn = false
    vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
    const res = await post(CASE, { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ code: "AUTHENTICATION_REQUIRED" })
  })

  it("rejects a malformed body without touching provider or case state", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
    const res = await post(CASE, { messages: [] })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ code: "INVALID_CHAT_REQUEST" })
    expect(state.loadCaseContext).not.toHaveBeenCalled()
    expect(state.streamText).not.toHaveBeenCalled()
  })

  it("rejects a non-uuid path id before provider or case work", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
    const res = await post("not-a-uuid", { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(404)
    expect(state.loadCaseContext).not.toHaveBeenCalled()
  })

  /*
   * The ordering that matters: a case the caller does not own must be
   * indistinguishable from one that does not exist, and that must hold even when
   * no provider is configured. If the provider-config gate ran first, an
   * unconfigured deployment would answer 503 for every case id, which both hides
   * the ownership rail and leaks that the id was otherwise well-formed.
   */
  it("reports a foreign case as not found, not as an unconfigured provider", async () => {
    state.owned = false
    vi.stubEnv("GROQ_API_KEY", "")
    const res = await post(CASE, { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: "CASE_NOT_FOUND" })
  })

  it("refuses cleanly when the provider key is absent, after ownership passes", async () => {
    vi.stubEnv("GROQ_API_KEY", "")
    const res = await post(CASE, { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ code: "AI_PROVIDER_NOT_CONFIGURED" })
    expect(state.loadCaseContext).toHaveBeenCalledWith(CASE)
    expect(state.streamText).not.toHaveBeenCalled()
  })

  it("streams for an owned case when the provider is configured", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
    const res = await post(CASE, { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(200)
    expect(state.streamText).toHaveBeenCalledTimes(1)
  })

  it("does not surface a database error as a provider problem", async () => {
    state.contextError = true
    vi.stubEnv("GROQ_API_KEY", "test-only-no-provider-request")
    const res = await post(CASE, { messages: [{ role: "user", content: "hi" }] })
    expect(res.status).toBe(404)
  })
})
