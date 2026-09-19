import { describe, expect, it } from "vitest"
import {
  canAccessOnboardingStep,
  completedOnboardingStep,
  firstOnboardingStep,
  isOnboardingCompleted,
  isOnboardingStep,
  nextOnboardingStep,
  onboardingPath,
  onboardingRedirect,
  onboardingSteps,
  postLoginDestination,
  previousOnboardingStep,
  requiresOnboarding,
  resolveOnboardingStep,
} from "./state"

describe("onboarding state resolution", () => {
  it("keeps every known step", () => {
    for (const step of onboardingSteps) expect(resolveOnboardingStep(step)).toBe(step)
  })

  it("falls back to the first step for missing or unknown values", () => {
    for (const value of [null, undefined, "", "  ", "LANGUAGE", "Language", "onboarded", "done", 0, 1, {}, []]) {
      expect(resolveOnboardingStep(value)).toBe(firstOnboardingStep)
    }
  })

  it("never reports a user past onboarding on the basis of unreadable state", () => {
    expect(isOnboardingCompleted(null)).toBe(false)
    expect(isOnboardingCompleted(undefined)).toBe(false)
    expect(isOnboardingCompleted("completed")).toBe(true)
    expect(requiresOnboarding(null)).toBe(true)
    expect(requiresOnboarding("completed")).toBe(false)
  })

  it("recognizes only exact step names", () => {
    expect(isOnboardingStep("profile")).toBe(true)
    expect(isOnboardingStep("Profile")).toBe(false)
    expect(isOnboardingStep("tour ")).toBe(false)
    expect(isOnboardingStep(null)).toBe(false)
  })
})

describe("onboarding transitions", () => {
  it("advances through the ordered steps and stops at completed", () => {
    expect(nextOnboardingStep("language")).toBe("profile")
    expect(nextOnboardingStep("profile")).toBe("tour")
    expect(nextOnboardingStep("tour")).toBe("finish")
    expect(nextOnboardingStep("finish")).toBe(completedOnboardingStep)
    expect(nextOnboardingStep(completedOnboardingStep)).toBe(completedOnboardingStep)
  })

  it("reports the resume step and stops at the first step", () => {
    expect(previousOnboardingStep("language")).toBeNull()
    expect(previousOnboardingStep("profile")).toBe("language")
    expect(previousOnboardingStep("finish")).toBe("tour")
    expect(previousOnboardingStep(completedOnboardingStep)).toBe("finish")
  })

  it("allows revisiting earlier steps but not skipping ahead", () => {
    expect(canAccessOnboardingStep("tour", "language")).toBe(true)
    expect(canAccessOnboardingStep("tour", "tour")).toBe(true)
    expect(canAccessOnboardingStep("tour", "finish")).toBe(false)
    expect(canAccessOnboardingStep("language", "profile")).toBe(false)
    expect(canAccessOnboardingStep("finish", completedOnboardingStep)).toBe(false)
    expect(canAccessOnboardingStep(completedOnboardingStep, completedOnboardingStep)).toBe(true)
  })
})

describe("onboarding destinations", () => {
  it("sends completed users to the dashboard", () => {
    expect(postLoginDestination("completed", "bg")).toBe("/bg/dashboard")
    expect(postLoginDestination("completed", "de")).toBe("/de/dashboard")
  })

  it("resumes incomplete onboarding from the persisted step", () => {
    expect(postLoginDestination("language", "bg")).toBe("/bg/onboarding/language")
    expect(postLoginDestination("profile", "de")).toBe("/de/onboarding/profile")
    expect(postLoginDestination("tour", "bg")).toBe("/bg/onboarding/tour")
    expect(postLoginDestination("finish", "de")).toBe("/de/onboarding/finish")
  })

  it("treats missing state as a new user and does not reach the dashboard", () => {
    expect(postLoginDestination(null, "bg")).toBe("/bg/onboarding/language")
    expect(postLoginDestination(undefined, "de")).toBe("/de/onboarding/language")
    expect(postLoginDestination("garbage", "bg")).not.toContain("/dashboard")
  })

  it("renders a path per step and none once completed", () => {
    expect(onboardingPath("language", "bg")).toBe("/bg/onboarding/language")
    expect(onboardingPath("finish", "de")).toBe("/de/onboarding/finish")
    expect(onboardingPath(completedOnboardingStep, "bg")).toBeNull()
  })
})

describe("onboarding route guard", () => {
  it("redirects completed users away from onboarding", () => {
    expect(onboardingRedirect("completed", "language", "bg")).toBe("/bg/dashboard")
    expect(onboardingRedirect("completed", "tour", "de")).toBe("/de/dashboard")
  })

  it("redirects a user forward into their own current step when skipping ahead", () => {
    expect(onboardingRedirect("profile", "tour", "bg")).toBe("/bg/onboarding/profile")
    expect(onboardingRedirect("language", "finish", "de")).toBe("/de/onboarding/language")
  })

  it("allows the current step and any earlier step", () => {
    expect(onboardingRedirect("tour", "tour", "bg")).toBeNull()
    expect(onboardingRedirect("finish", "profile", "bg")).toBeNull()
  })

  it("treats unreadable state as the first step", () => {
    expect(onboardingRedirect(null, "language", "bg")).toBeNull()
    expect(onboardingRedirect(null, "profile", "de")).toBe("/de/onboarding/language")
  })
})