import { beforeEach, describe, expect, it, vi } from "vitest"
import { emptyCanonicalTaxReturn } from "@/lib/canonical-tax-model"

const auth = vi.hoisted(() => ({ user: { id: "user-1" } as { id: string } | null }))

vi.mock("@/lib/office/supabase/auth", () => ({
  getAuthenticatedUser: async () => ({ user: auth.user, supabase: auth.user ? {} : null }),
}))

import { POST } from "./route"

function request(canonicalTaxReturn = emptyCanonicalTaxReturn()) {
  return new Request("http://localhost/api/steuer/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canonicalTaxReturn }),
  })
}

describe("legacy tax PDF readiness route", () => {
  beforeEach(() => {
    auth.user = { id: "user-1" }
  })

  it("requires authentication", async () => {
    auth.user = null
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: "AUTHENTICATION_REQUIRED" })
  })

  it("returns truthful readiness and points generation to the canonical case route", async () => {
    const response = await POST(request())
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.status).toBe("READY_FOR_USER_USE")
    expect(json.generation).toEqual({
      mode: "CASE_BOUND",
      route: "/api/horizon/cases/{caseId}/tax-form",
    })
  })

  it("blocks an unmapped form with a deterministic reason", async () => {
    const canonical = emptyCanonicalTaxReturn()
    canonical.selectedForms = ["unknown-form"]
    const response = await POST(request(canonical))
    const json = await response.json()
    expect(response.status).toBe(409)
    expect(json.code).toBe("PDF_MAPPING_UNAVAILABLE")
  })
})
