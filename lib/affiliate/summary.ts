import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Operator revenue summary: clicks, commissions and evidenced savings in one
 * read. The aggregation is a pure function so it is tested without a database.
 */

export type ClickRow = { offer_id: string; user_id: string | null }
export type CommissionRow = { offer_id: string; status: string; amount_cents: number }
export type SavingRow = { offer_id: string; status: string; annual_saving_cents: number; user_id: string }

export type OfferSummary = {
  clicks: number
  attributedClicks: number
  commissionCents: Record<string, number>
  securedSavingCents: number
  realizedSavingCents: number
}

export type RevenueSummary = {
  windowDays: number
  clicks: { total: number; attributed: number }
  commissionCents: Record<string, number>
  savings: { securedCents: number; realizedCents: number; usersWithSavings: number }
  byOffer: Record<string, OfferSummary>
  truncated: boolean
}

/** Upper bound per table read; the summary says when it was reached. */
export const SUMMARY_ROW_LIMIT = 10000

function offerEntry(byOffer: Record<string, OfferSummary>, offerId: string): OfferSummary {
  byOffer[offerId] ??= { clicks: 0, attributedClicks: 0, commissionCents: {}, securedSavingCents: 0, realizedSavingCents: 0 }
  return byOffer[offerId]
}

export function summarizeRevenue(
  windowDays: number,
  clicks: ClickRow[],
  commissions: CommissionRow[],
  savings: SavingRow[],
  truncated = false,
): RevenueSummary {
  const byOffer: Record<string, OfferSummary> = {}
  const commissionCents: Record<string, number> = {}
  let attributed = 0
  for (const click of clicks) {
    const entry = offerEntry(byOffer, click.offer_id)
    entry.clicks += 1
    if (click.user_id) {
      entry.attributedClicks += 1
      attributed += 1
    }
  }
  for (const row of commissions) {
    const entry = offerEntry(byOffer, row.offer_id)
    entry.commissionCents[row.status] = (entry.commissionCents[row.status] ?? 0) + row.amount_cents
    commissionCents[row.status] = (commissionCents[row.status] ?? 0) + row.amount_cents
  }
  let securedCents = 0
  let realizedCents = 0
  const users = new Set<string>()
  for (const row of savings) {
    // Cancelled switches saved nothing and are left out of every total.
    if (row.status === "cancelled") continue
    const entry = offerEntry(byOffer, row.offer_id)
    if (row.status === "realized") {
      entry.realizedSavingCents += row.annual_saving_cents
      realizedCents += row.annual_saving_cents
    } else {
      entry.securedSavingCents += row.annual_saving_cents
      securedCents += row.annual_saving_cents
    }
    users.add(row.user_id)
  }
  return {
    windowDays,
    clicks: { total: clicks.length, attributed },
    commissionCents,
    savings: { securedCents, realizedCents, usersWithSavings: users.size },
    byOffer,
    truncated,
  }
}

/** Load the rows created in the last `windowDays` days and summarize them. Null when unavailable. */
export async function loadRevenueSummary(client: SupabaseClient | null, windowDays: number): Promise<RevenueSummary | null> {
  if (!client) return null
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString()
  try {
    const [clicks, commissions, savings] = await Promise.all([
      client.from("affiliate_click_events").select("offer_id,user_id").gte("occurred_at", since).limit(SUMMARY_ROW_LIMIT),
      client.from("affiliate_commissions").select("offer_id,status,amount_cents").gte("created_at", since).limit(SUMMARY_ROW_LIMIT),
      client.from("household_savings").select("offer_id,status,annual_saving_cents,user_id").gte("created_at", since).limit(SUMMARY_ROW_LIMIT),
    ])
    if (commissions.error) return null
    // Before the attribution migration `user_id` and the savings table do not
    // exist yet: count unattributed clicks and report no savings.
    let clickRows = clicks.data as ClickRow[] | null
    if (clicks.error) {
      const fallback = await client.from("affiliate_click_events").select("offer_id").gte("occurred_at", since).limit(SUMMARY_ROW_LIMIT)
      if (fallback.error) return null
      clickRows = (fallback.data as { offer_id: string }[]).map((row) => ({ offer_id: row.offer_id, user_id: null }))
    }
    const savingRows = savings.error ? [] : (savings.data as SavingRow[])
    const commissionRows = commissions.data as CommissionRow[]
    const truncated = [clickRows ?? [], commissionRows, savingRows].some((rows) => rows.length >= SUMMARY_ROW_LIMIT)
    return summarizeRevenue(windowDays, clickRows ?? [], commissionRows, savingRows, truncated)
  } catch {
    return null
  }
}
