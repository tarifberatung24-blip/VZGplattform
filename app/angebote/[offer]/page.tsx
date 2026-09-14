import { notFound } from "next/navigation"
import { AffiliateOfferLanding } from "@/components/marketing/affiliate-offer-landing"
import { getAffiliateOffer, isAffiliateOfferId } from "@/lib/affiliate-offers"

export default async function OfferPage({ params }: { params: Promise<{ offer: string }> }) {
  const { offer } = await params
  if (!isAffiliateOfferId(offer)) notFound()
  return <AffiliateOfferLanding offer={offer} isConfigured={getAffiliateOffer(offer).isConfigured} />
}
