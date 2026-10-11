import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("./config", () => ({
  getSupabaseConfig: () => ({ url: "https://project.supabase.co", key: "publishable-key" }),
  hasSupabaseConfig: () => true,
  missingConfigurationMessage: "",
}))

// getUser() rotates the session, as a token refresh does, before the proxy decides to redirect.
let currentUser: { id: string } | null = null
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void } }) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([{ name: "sb-test-auth-token", value: "rotated", options: { path: "/" } }])
        return { data: { user: currentUser } }
      },
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" } }) },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarding_step: "profile" }, error: null }) }) }) }),
  }),
}))

import { updateSession } from "./proxy"

describe("updateSession redirects keep a refreshed session", () => {
  it("on the redirect to the login page", async () => {
    currentUser = null
    const response = await updateSession(new NextRequest("https://horizon.test/de/dashboard"))
    expect(response.headers.get("location")).toContain("/auth/login")
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated")
  })

  it("on the redirect into onboarding", async () => {
    currentUser = { id: "user-1" }
    const response = await updateSession(new NextRequest("https://horizon.test/de/dashboard"))
    expect(response.headers.get("location")).toContain("/de/onboarding/profile")
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated")
  })
})
