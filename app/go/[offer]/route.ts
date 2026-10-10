import { NextResponse } from "next/server"
import { getAffiliateOffer, isAffiliateOfferId } from "../../../lib/affiliate-offers"
import { recordAffiliateClick } from "../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../lib/affiliate/analytics-client"
import { affiliateLocaleFromPath, affiliatePathFromRequest } from "../../../lib/affiliate/analytics-request"
import { buildPartnerUrl, optimizeSessionFromRequest } from "../../../lib/affiliate/attribution"
import { resolveClickOwner } from "../../../lib/affiliate/click-owner"

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
  const owner = await resolveClickOwner(optimizeSessionFromRequest(request))
  const clickId = crypto.randomUUID()
  const recorded = await recordAffiliateClick(createAffiliateAnalyticsClient(), {
    id: clickId,
    offerId: offer,
    locale: affiliateLocaleFromPath(path),
    path,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    userId: owner.userId,
    optimizeSessionId: owner.optimizeSessionId,
  })

  // Never guess tracking parameters. The click id is appended only when the
  // partner program documents a sub-ID parameter (`<OFFER>_SUBID_PARAM`) and the
  // click was stored, so every sub-ID a partner reports back resolves to a row.
  return NextResponse.redirect(buildPartnerUrl(partner.url, partner.subIdParam, recorded ? clickId : null), { status: 302 })
}
