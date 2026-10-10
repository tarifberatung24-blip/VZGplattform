import { NextResponse } from "next/server"
import { createAffiliateAnalyticsClient } from "../../../../lib/affiliate/analytics-client"
import { authorizeOperator } from "../../../../lib/affiliate/operator-auth"
import { loadRevenueSummary } from "../../../../lib/affiliate/summary"

/**
 * Operator revenue view: clicks (and how many are attributed to a user),
 * commissions by status and evidenced savings for the last `days` days
 * (default 30, max 365). Read-only; same operator secret as the other routes.
 */
export async function GET(request: Request) {
  const auth = authorizeOperator(request)
  if (!auth.ok) return NextResponse.json({ code: auth.code }, { status: auth.status })

  const raw = new URL(request.url).searchParams.get("days")
  const days = raw === null ? 30 : Number(raw)
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ code: "INVALID_WINDOW", allowed: "1-365" }, { status: 400 })
  }

  const summary = await loadRevenueSummary(createAffiliateAnalyticsClient(), days)
  if (!summary) return NextResponse.json({ code: "SUMMARY_UNAVAILABLE" }, { status: 503 })
  return NextResponse.json(summary, { status: 200, headers: { "Cache-Control": "no-store" } })
}
