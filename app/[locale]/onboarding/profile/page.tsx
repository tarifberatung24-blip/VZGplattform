import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { ProfileStep } from "@/components/onboarding/steps"

export default async function OnboardingProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "profile")
  return <ProfileStep userId={userId} step="profile" previous={previous} />
}