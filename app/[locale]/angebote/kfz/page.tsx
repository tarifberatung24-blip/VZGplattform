import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { KfzLanding } from "@/components/affiliate/kfz-landing"
import { insuranceProductContent } from "@/components/affiliate/insurance-content"
import { getAffiliateOffer } from "@/lib/affiliate-offers"
import { legalProfile } from "@/lib/legal-profile"
import { isLocale, type Locale } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Kfz-Versicherung",
  description:
    "Автозастраховка на български: подготви данните за автомобила и сравни покритието при партньора. HORIZON by VZG.",
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
