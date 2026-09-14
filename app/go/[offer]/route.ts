import { NextResponse } from "next/server"
import { getAffiliateOffer, isAffiliateOfferId } from "@/lib/affiliate-offers"

export function GET(_: Request, { params }: { params: Promise<{ offer: string }> }) {
  return params.then(({ offer }) => {
    if (!isAffiliateOfferId(offer)) return new NextResponse("Not found", { status: 404 })
    const partner = getAffiliateOffer(offer)
    if (!partner.url) return new NextResponse("Partner link is not configured", { status: 503 })

    // Do not append guessed tracking parameters: use the exact deeplink supplied
    // by the approved affiliate program so commission attribution is preserved.
    return NextResponse.redirect(partner.url, { status: 302 })
  })
}
