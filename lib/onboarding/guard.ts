import "server-only"
import { redirect } from "next/navigation"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"
import {
  onboardingPath,
  onboardingRedirect,
  previousOnboardingStep,
  type OnboardingStep,
} from "./state"
import { readOnboardingStep } from "./profile"

/**
 * Server-side guard shared by every onboarding step route.
 *
 * Unauthenticated visitors are sent to login with a return path. Authenticated
 * visitors whose persisted state does not allow the requested step are sent to
 * the step they actually belong on, so URLs cannot be used to skip onboarding.
 */
export async function guardOnboardingStep(rawLocale: string, step: OnboardingStep) {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "bg"
  const { user, step: current } = await readOnboardingStep()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`${locale}/onboarding/${step}`)}`)

  const destination = onboardingRedirect(current, step, locale)
  if (destination) redirect(destination)

  return { userId: user.id, previous: previousOnboardingStep(step) }
}

/**
 * The route a user belongs on given only their persisted state, used by the
 * localized catch-all for /{locale}/onboarding and unknown onboarding steps.
 * Unauthenticated visitors are sent to login; completed users to the dashboard.
 */
export async function onboardingStepDestination(rawLocale: string): Promise<string> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "bg"
  const { user, step } = await readOnboardingStep()
  if (!user) return `/auth/login?next=${encodeURIComponent(`${locale}/onboarding`)}`
  return onboardingPath(step, locale) ?? `/${locale}/dashboard`
}