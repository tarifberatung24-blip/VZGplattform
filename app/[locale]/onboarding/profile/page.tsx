import { cookies } from "next/headers"
import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { ProfileStep } from "@/components/onboarding/steps"
import { createClient } from "@/lib/supabase/server"
import { applySignupConsent } from "@/lib/journey/consent"
import { JOURNEY_SIGNUP_COOKIE } from "@/lib/journey/keys"

export default async function OnboardingProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "profile")
  // The sign-up checkbox is applied here because every new account passes this step, whichever
  // way it signed up (e-mail, phone or Google). It never overrides an existing decision.
  const { data: { user } } = await (await createClient()).auth.getUser()
  await applySignupConsent(userId, user?.user_metadata, (await cookies()).get(JOURNEY_SIGNUP_COOKIE)?.value)
  return <ProfileStep userId={userId} step="profile" previous={previous} />
}
