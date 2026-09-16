import { describe, expect, it } from "vitest"
import { isProtectedAppPath, requiresMfa, sanitizeNextPath } from "./auth-routing"

describe("auth routing", () => {
  it("accepts local destinations and rejects external redirects", () => {
    expect(sanitizeNextPath("/protected/home-office")).toBe("/protected/home-office")
    expect(sanitizeNextPath("//evil.example")).toBe("/protected")
    expect(sanitizeNextPath("/\\evil.example")).toBe("/protected")
    expect(sanitizeNextPath("https://evil.example")).toBe("/protected")
  })

  it("recognizes protected localized and unlocalized routes", () => {
    expect(isProtectedAppPath("/protected/security")).toBe(true)
    expect(isProtectedAppPath("/bg/protected/security")).toBe(true)
    expect(isProtectedAppPath("/de/profil")).toBe(true)
    expect(isProtectedAppPath("/bg/auth/login")).toBe(false)
  })

  it("requires a challenge only when an enrolled factor can raise AAL1 to AAL2", () => {
    expect(requiresMfa("aal1", "aal2")).toBe(true)
    expect(requiresMfa("aal1", "aal1")).toBe(false)
    expect(requiresMfa("aal2", "aal2")).toBe(false)
  })
})
