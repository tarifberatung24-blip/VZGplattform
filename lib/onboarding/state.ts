import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Ordered first-login onboarding steps. `completed` is terminal: the user has
 * finished onboarding and must never be routed back into it.
 */
export const onboardingSteps = ["language", "profile", "tour", "finish", "completed"] as const

export type OnboardingStep = (typeof onboardingSteps)[number]

export const firstOnboardingStep: OnboardingStep = "language"
export const completedOnboardingStep: OnboardingStep = "completed"

export const onboardingSegment = "onboarding"

const stepIndex = (step: OnboardingStep) => onboardingSteps.indexOf(step)

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (onboardingSteps as readonly string[]).includes(value)
}

/**
 * Maps whatever the database returns to a step the application can act on.
 * NULL, unknown legacy values and malformed input all resolve to the first step,
 * so a missing or unreadable value can never strand a user past onboarding.
 */
export function resolveOnboardingStep(value: unknown): OnboardingStep {
  return isOnboardingStep(value) ? value : firstOnboardingStep
}

export function isOnboardingCompleted(value: unknown): boolean {
  return resolveOnboardingStep(value) === completedOnboardingStep
}

export function requiresOnboarding(value: unknown): boolean {
  return !isOnboardingCompleted(value)
}

/** The step a user advances to after finishing `step`. */
export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  return onboardingSteps[Math.min(stepIndex(step) + 1, onboardingSteps.length - 1)]
}

/** The step to resume from, or null when `step` is the first step. */
export function previousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = stepIndex(step)
  return index > 0 ? onboardingSteps[index - 1] : null
}

/**
 * Guards against skipping ahead. A user may revisit an earlier step (resume) but
 * must not jump past the furthest step they have actually completed, otherwise
 * the persisted order would no longer describe the journey.
 */
export function canAccessOnboardingStep(current: unknown, target: OnboardingStep): boolean {
  return stepIndex(target) <= stepIndex(resolveOnboardingStep(current))
}

/** Route for a step, or null when onboarding is finished and no step route applies. */
export function onboardingPath(step: OnboardingStep, locale: Locale): string | null {
  return step === completedOnboardingStep
    ? null
    : `/${locale}/${onboardingSegment}/${step}`
}

/**
 * Where a user should be sent after logging in, on the basis of persisted state
 * alone. Completed users reach the dashboard; everyone else resumes onboarding.
 */
export function postLoginDestination(value: unknown, locale: Locale): string {
  const step = resolveOnboardingStep(value)
  return onboardingPath(step, locale) ?? `/${locale}/dashboard`
}

/**
 * Where a user belongs when they land on `target` while their persisted step is
 * `current`. Returns null when the target is reachable.
 */
export function onboardingRedirect(current: unknown, target: OnboardingStep, locale: Locale): string | null {
  const step = resolveOnboardingStep(current)
  if (step === completedOnboardingStep) return `/${locale}/dashboard`
  if (canAccessOnboardingStep(step, target)) return null
  return onboardingPath(step, locale)
}