import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { FinishStep } from "@/components/onboarding/steps"

export default async function OnboardingFinishPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "finish")
  return <FinishStep userId={userId} step="finish" previous={previous} />
}