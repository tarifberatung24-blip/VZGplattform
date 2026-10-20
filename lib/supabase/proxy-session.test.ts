import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("./config", () => ({
  getSupabaseConfig: () => ({ url: "https://project.supabase.co", key: "publishable-key" }),
  hasSupabaseConfig: () => true,
  missingConfigurationMessage: "",
}))

// getUser() rotates the session, as a token refresh does, before the proxy decides to redirect.
let currentUser: { id: string } | null = null
let currentAssurance = { currentLevel: "aal1", nextLevel: "aal1" }
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void } }) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([{ name: "sb-test-auth-token", value: "rotated", options: { path: "/" } }])
        return { data: { user: currentUser } }
      },
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: currentAssurance }) },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarding_step: "profile" }, error: null }) }) }) }),
  }),
}))

import { updateSession } from "./proxy"

describe("updateSession redirects keep a refreshed session", () => {
  it("on the redirect to the login page", async () => {
    currentUser = null
    const response = await updateSession(new NextRequest("https://horizon.test/de/dashboard?section=documents"))
    expect(response.headers.get("location")).toBe("https://horizon.test/de/auth/login?next=%2Fde%2Fdashboard%3Fsection%3Ddocuments")
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated")
  })

  it("keeps the locale and destination on the redirect to MFA", async () => {
    currentUser = { id: "user-1" }
    currentAssurance = { currentLevel: "aal1", nextLevel: "aal2" }
    const response = await updateSession(new NextRequest("https://horizon.test/bg/forum?topic=changes"))
    expect(response.headers.get("location")).toBe("https://horizon.test/bg/auth/mfa-verify?next=%2Fbg%2Fforum%3Ftopic%3Dchanges")
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated")
    currentAssurance = { currentLevel: "aal1", nextLevel: "aal1" }
  })

  it("on the redirect into onboarding", async () => {
    currentUser = { id: "user-1" }
    const response = await updateSession(new NextRequest("https://horizon.test/de/dashboard"))
    expect(response.headers.get("location")).toContain("/de/onboarding/profile")
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated")
  })
})
