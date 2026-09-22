import { localizedPath, stripLocale } from "../i18n/routing"
import type { Locale } from "../i18n/dictionaries"

const protectedPrefixes = [
  "/dashboard",
  "/assistant",
  "/protected",
  "/profil",
  "/finanzamt",
  "/steuer",
  "/vertraege",
  "/documents",
  "/finanzbildung",
  "/guide",
  "/auth/update-password",
  "/onboarding",
]

export function sanitizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback
}

export function isProtectedAppPath(pathname: string) {
  const path = stripLocale(pathname)
  if (path === "/protected") return false
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function requiresMfa(currentLevel: string | null | undefined, nextLevel: string | null | undefined) {
  return currentLevel === "aal1" && nextLevel === "aal2"
}

/**
 * First-login state, expressed for the proxy without importing server-only code.
 * `onboarding_step` NULL or unknown is treated as not completed, so the proxy
 * routes the user into onboarding rather than the dashboard.
 */
const onboardingSteps = ["language", "profile", "tour", "finish", "completed"] as const

export function isKnownOnboardingStep(value: unknown): value is (typeof onboardingSteps)[number] {
  return typeof value === "string" && (onboardingSteps as readonly string[]).includes(value)
}

export function isOnboardingComplete(step: string | null | undefined) {
  return step === "completed"
}

export function isOnboardingPath(pathname: string) {
  const path = stripLocale(pathname)
  return path === "/onboarding" || path.startsWith("/onboarding/")
}

/**
 * Auth-flow routes are excluded from the onboarding gate. They include account
 * recovery and MFA, which must stay reachable for a signed-in user who has not
 * finished onboarding; gating them would trap the user or bypass MFA.
 */
export function isAuthFlowPath(pathname: string) {
  const path = stripLocale(pathname)
  return path === "/auth" || path.startsWith("/auth/")
}

/** The locale prefix of a pathname, defaulting to the app default. */
export function pathLocale(pathname: string) {
  const segment = pathname.split("/")[1]
  return segment === "de" ? "de" : "bg"
}

export function authenticatedHomePath(locale: Locale) {
  return localizedPath("/dashboard", locale)
}
