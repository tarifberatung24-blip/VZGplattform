import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AffiliateOfferLanding } from "@/components/marketing/affiliate-offer-landing"
import { KfzCalculator } from "@/components/affiliate/kfz-calculator"
import { getAffiliateOffer } from "@/lib/affiliate-offers"
import { affiliateDisclosureFor } from "@/lib/affiliate-disclosure"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Kfz-Versicherung",
  description: "Kfz-Versicherung vorbereiten und beim Partner vergleichen — HORIZON by VZG.",
}

export default async function KfzOfferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  if (!isLocale(rawLocale)) notFound()
  const locale: Locale = rawLocale
  const offer = getAffiliateOffer("kfz")

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AffiliateOfferLanding offer="kfz" isConfigured={offer.isConfigured} />
      <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <KfzCalculator locale={locale} isConfigured={offer.isConfigured} />
        <p className="mt-6 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-7 text-foreground">
          {affiliateDisclosureFor(locale)}
        </p>
      </div>
    </main>
  )
}
