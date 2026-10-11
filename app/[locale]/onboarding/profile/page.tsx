import { cookies } from "next/headers"
import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { ProfileStep } from "@/components/onboarding/steps"
import { TermsGate } from "@/components/journey/terms-gate"
import { createClient } from "@/lib/supabase/server"
import { ensureTermsAccepted } from "@/lib/journey/terms"
import { TERMS_SIGNUP_COOKIE } from "@/lib/journey/keys"

export default async function OnboardingProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "profile")
  // Every new account passes this step, whichever way it signed up (e-mail, phone or Google, from
  // the sign-up or the login page). The sign-up checkbox is recorded here; an account that has not
  // accepted the current terms is asked before it continues.
  const { data: { user } } = await (await createClient()).auth.getUser()
  const accepted = await ensureTermsAccepted(userId, user?.user_metadata, (await cookies()).get(TERMS_SIGNUP_COOKIE)?.value)
  if (!accepted) return <TermsGate locale={locale === "de" ? "de" : "bg"} />
  return <ProfileStep userId={userId} step="profile" previous={previous} />
}
