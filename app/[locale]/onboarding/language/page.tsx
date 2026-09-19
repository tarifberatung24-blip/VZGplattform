import { guardOnboardingStep } from "@/lib/onboarding/guard"
import { LanguageStep } from "@/components/onboarding/steps"

export default async function OnboardingLanguagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId, previous } = await guardOnboardingStep(locale, "language")
  return <LanguageStep userId={userId} step="language" previous={previous} />
}