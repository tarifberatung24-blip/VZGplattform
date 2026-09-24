import { redirect } from "next/navigation"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"

export default async function OnboardingLanguagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "bg"
  redirect(`/${locale}/onboarding/profile`)
}
