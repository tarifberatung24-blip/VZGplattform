import { describe, expect, it } from "vitest"
import {
  authenticatedHomePath,
  isAuthFlowPath,
  isKnownOnboardingStep,
  isOnboardingComplete,
  isOnboardingPath,
  normalizeOnboardingStep,
  isProtectedAppPath,
  pathLocale,
  requiresMfa,
  sanitizeNextPath,
} from "./auth-routing"

describe("auth routing", () => {
  it("keeps authenticated home navigation localized to the dashboard", () => {
    expect(authenticatedHomePath("bg")).toBe("/bg/dashboard")
    expect(authenticatedHomePath("de")).toBe("/de/dashboard")
  })

  it("accepts local destinations and rejects external redirects", () => {
    expect(sanitizeNextPath("/protected/home-office")).toBe("/protected/home-office")
    expect(sanitizeNextPath("//evil.example")).toBe("/dashboard")
    expect(sanitizeNextPath("/\\evil.example")).toBe("/dashboard")
    expect(sanitizeNextPath("https://evil.example")).toBe("/dashboard")
  })

  it("recognizes protected localized and unlocalized routes", () => {
    expect(isProtectedAppPath("/security")).toBe(false)
    expect(isProtectedAppPath("/bg/security")).toBe(false)
    expect(isProtectedAppPath("/de/security")).toBe(false)
    expect(isProtectedAppPath("/protected")).toBe(false)
    expect(isProtectedAppPath("/protected/security")).toBe(true)
    expect(isProtectedAppPath("/dashboard")).toBe(true)
    expect(isProtectedAppPath("/bg/dashboard")).toBe(true)
    expect(isProtectedAppPath("/bg/protected/security")).toBe(true)
    expect(isProtectedAppPath("/de/profil")).toBe(true)
    expect(isProtectedAppPath("/bg/auth/login")).toBe(false)
  })

  it("requires a challenge only when an enrolled factor can raise AAL1 to AAL2", () => {
    expect(requiresMfa("aal1", "aal2")).toBe(true)
    expect(requiresMfa("aal1", "aal1")).toBe(false)
    expect(requiresMfa("aal2", "aal2")).toBe(false)
  })

  it("keeps onboarding protected without exposing it as public", () => {
    expect(isProtectedAppPath("/bg/onboarding/language")).toBe(true)
    expect(isProtectedAppPath("/onboarding/profile")).toBe(true)
    expect(isProtectedAppPath("/bg/security")).toBe(false)
  })
})

describe("first-login onboarding routing", () => {
  it("accepts current steps and the legacy language value", () => {
    for (const step of ["language", "profile", "tour", "finish", "completed"]) {
      expect(isKnownOnboardingStep(step)).toBe(true)
    }
    expect(normalizeOnboardingStep("language")).toBe("profile")
    expect(normalizeOnboardingStep("profile")).toBe("profile")
    expect(normalizeOnboardingStep("../../evil")).toBeNull()
  })

  it("rejects values that must never be interpolated into a redirect", () => {
    for (const value of [null, undefined, "", "Language", "completed ", "../../evil", "next", 1, {}]) {
      expect(isKnownOnboardingStep(value)).toBe(false)
    }
  })

  it("treats only completed as finished", () => {
    expect(isOnboardingComplete("completed")).toBe(true)
    expect(isOnboardingComplete("finish")).toBe(false)
    expect(isOnboardingComplete(null)).toBe(false)
    expect(isOnboardingComplete(undefined)).toBe(false)
  })

  it("recognizes onboarding routes with and without a locale", () => {
    expect(isOnboardingPath("/onboarding")).toBe(true)
    expect(isOnboardingPath("/bg/onboarding/tour")).toBe(true)
    expect(isOnboardingPath("/de/onboarding/finish")).toBe(true)
    expect(isOnboardingPath("/dashboard")).toBe(false)
    expect(isOnboardingPath("/onboarding-extra")).toBe(false)
  })

  it("excludes account recovery and MFA from the gate", () => {
    expect(isAuthFlowPath("/bg/auth/update-password")).toBe(true)
    expect(isAuthFlowPath("/auth/mfa-verify")).toBe(true)
    expect(isAuthFlowPath("/bg/dashboard")).toBe(false)
    expect(isAuthFlowPath("/protected/security")).toBe(false)
  })

  it("extracts the locale prefix and defaults to bg", () => {
    expect(pathLocale("/de/onboarding/tour")).toBe("de")
    expect(pathLocale("/bg/dashboard")).toBe("bg")
    expect(pathLocale("/dashboard")).toBe("bg")
    expect(pathLocale("/ru/dashboard")).toBe("bg")
  })
})
