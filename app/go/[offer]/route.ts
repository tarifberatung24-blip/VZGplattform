import { NextResponse } from "next/server"
import { getAffiliateOffer, isAffiliateOfferId } from "../../../lib/affiliate-offers"
import { recordAffiliateClick } from "../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../lib/affiliate/analytics-client"
import { affiliateLocaleFromPath, affiliatePathFromRequest } from "../../../lib/affiliate/analytics-request"

export async function GET(request: Request, { params }: { params: Promise<{ offer: string }> }) {
  const { offer } = await params
  if (!isAffiliateOfferId(offer)) return new NextResponse("Not found", { status: 404 })
  const partner = getAffiliateOffer(offer)
  // An offer that is not approved (`inactive`) is treated exactly like an
  // unconfigured one, so an unapproved partner can never be handed out.
  if (!partner.isActive || !partner.url) return new NextResponse("Partner link is not configured", { status: 503 })

  // Record the click, but never let analytics block the customer's redirect:
  // the redirect is the revenue-critical path, the measurement is secondary.
  const path = affiliatePathFromRequest(request)
  await recordAffiliateClick(createAffiliateAnalyticsClient(), {
    offerId: offer,
    locale: affiliateLocaleFromPath(path),
    path,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  })

  // Do not append guessed tracking parameters: use the exact deeplink supplied
  // by the approved affiliate program so commission attribution is preserved.
  return NextResponse.redirect(partner.url, { status: 302 })
}
