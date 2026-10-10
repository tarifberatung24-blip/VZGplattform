import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `/api/steuer/pdf` is a tax-data surface, so it must require a session and must
 * never hand out bytes: official-form generation is the HORIZON path
 * (`/api/horizon/cases/{id}/tax-form`), not this legacy endpoint. These tests pin
 * that contract against the real readiness pipeline rather than a stubbed one.
 */
const state = vi.hoisted(() => ({ signedIn: true }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }) },
  }),
}))

import { POST } from "./route"

const post = (body: unknown) =>
  POST(
    new Request("https://test.local/api/steuer/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

describe("POST /api/steuer/pdf", () => {
  beforeEach(() => {
    state.signedIn = true
  })

  it("refuses an unauthenticated caller before reading any body", async () => {
    state.signedIn = false
    const response = await post({})
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe("AUTHENTICATION_REQUIRED")
  })

  it("answers with readiness, never with a PDF artifact", async () => {
    const response = await post({})
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(response.headers.get("content-type")).not.toContain("application/pdf")
    const json = await response.json()
    expect(json.ok).toBe(false)
    // The official 2025 PDF is not confirmed fillable, so readiness is blocked
    // and generation stays unconfigured; the caller must use the HORIZON path.
    expect([409, 501]).toContain(response.status)
    expect(json.code).toBeTruthy()
  })

  it("survives a missing or malformed body without a 500", async () => {
    const response = await POST(
      new Request("https://test.local/api/steuer/pdf", { method: "POST", body: "not-json" }),
    )
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  })
})
