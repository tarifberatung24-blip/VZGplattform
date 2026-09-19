import { FunctionsPage } from "@/components/marketing/public-layer-page"
import type { Locale } from "@/lib/i18n/dictionaries"

export default async function LocalizedFunctionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FunctionsPage locale={locale as Locale} />
}
