import "server-only"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { resolveOnboardingStep, type OnboardingStep } from "./state"

/**
 * Reads the persisted onboarding step for the authenticated user.
 *
 * Any state that cannot be read resolves to the first step rather than the
 * dashboard, so a failed read re-runs onboarding instead of silently skipping it.
 */
export async function readOnboardingStep(): Promise<{ user: User | null; step: OnboardingStep }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, step: resolveOnboardingStep(null) }

  const { data } = await supabase
    .from("profiles")
    .select("onboarding_step")
    .eq("id", user.id)
    .maybeSingle()

  return { user, step: resolveOnboardingStep(data?.onboarding_step) }
}