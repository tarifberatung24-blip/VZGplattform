import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { TourStep } from "@/components/onboarding/steps"

export default async function OnboardingTourPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "tour")
  return <TourStep userId={userId} step="tour" previous={previous} />
}