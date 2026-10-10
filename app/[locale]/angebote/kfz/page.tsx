import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { KfzLanding } from "@/components/affiliate/kfz-landing"
import { insuranceProductContent, kfzLandingCopy } from "@/components/affiliate/insurance-content"
import { getAffiliateOffer } from "@/lib/affiliate-offers"
import { legalProfile } from "@/lib/legal-profile"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/dictionaries"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const meta = kfzLandingCopy[isLocale(locale) ? locale : defaultLocale].meta
  return { title: meta.title, description: meta.description }
}

export default async function KfzOfferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  if (!isLocale(rawLocale)) notFound()
  const locale: Locale = rawLocale
  const offer = getAffiliateOffer("kfz")

  return (
    <main className="min-h-screen bg-background text-foreground">
      <KfzLanding
        locale={locale}
        product={insuranceProductContent.kfz[locale]}
        isOffered={offer.isOffered}
        phone={legalProfile.phone}
      />
    </main>
  )
}
