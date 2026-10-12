import type { SupabaseClient } from "@supabase/supabase-js"
import { isUuid } from "./attribution"
import type { AwinStatus, AwinTransaction } from "./awin"

/**
 * Daily reconciliation of network transactions with HORIZON clicks and savings.
 *
 * - Every reported transaction is stored (or updated) once per network id.
 * - The clickRef is linked to `affiliate_click_events` only when it is a
 *   HORIZON click id that really exists; anything else stays unlinked.
 * - A declined transaction cancels the customer's `secured` saving for that
 *   click, so "Спестено с HORIZON" never shows a switch the provider rejected.
 *   Approved transactions change nothing on the saving: the saving itself is
 *   recorded only from evidence (see `savings.ts`).
 */

export type SavingAction = "cancel" | "none"

export function savingActionFor(status: AwinStatus): SavingAction {
  return status === "declined" ? "cancel" : "none"
}

export type ReconcileTotals = {
  received: number
  stored: number
  linkedToClick: number
  cancelledSavings: number
  failures: number
}

export function emptyTotals(): ReconcileTotals {
  return { received: 0, stored: 0, linkedToClick: 0, cancelledSavings: 0, failures: 0 }
}

/** Drop repeated ids; the later row wins, as it carries the newer status. */
export function dedupeTransactions(transactions: AwinTransaction[]): AwinTransaction[] {
  const byId = new Map<string, AwinTransaction>()
  for (const tx of transactions) byId.set(tx.id, tx)
  return [...byId.values()]
}

async function existingClickIds(client: SupabaseClient, candidates: string[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()
  const { data, error } = await client.from("affiliate_click_events").select("id").in("id", candidates)
  if (error) throw new Error("click_lookup_failed")
  return new Set((data ?? []).map((row: { id: string }) => row.id))
}

export async function reconcileAwinTransactions(
  client: SupabaseClient,
  transactions: AwinTransaction[],
): Promise<ReconcileTotals> {
  const totals = emptyTotals()
  const unique = dedupeTransactions(transactions)
  totals.received = unique.length
  if (unique.length === 0) return totals

  const candidates = [...new Set(unique.map((tx) => tx.clickRef).filter(isUuid))]
  let known: Set<string>
  try {
    known = await existingClickIds(client, candidates)
  } catch {
    totals.failures += 1
    return totals
  }

  const rows = unique.map((tx) => {
    const clickEventId = isUuid(tx.clickRef) && known.has(tx.clickRef) ? tx.clickRef : null
    if (clickEventId) totals.linkedToClick += 1
    return {
      network: "awin",
      network_transaction_id: tx.id,
      click_event_id: clickEventId,
      advertiser_id: tx.advertiserId,
      status: tx.status,
      transaction_type: tx.type,
      commission_cents: tx.commissionCents,
      sale_cents: tx.saleCents,
      currency: tx.currency,
      transaction_date: tx.transactionDate,
      validation_date: tx.validationDate,
    }
  })

  const { error: upsertError } = await client
    .from("affiliate_network_transactions")
    .upsert(rows, { onConflict: "network,network_transaction_id" })
  if (upsertError) {
    totals.failures += 1
    return totals
  }
  totals.stored = rows.length

  const declinedClicks = [...new Set(rows
    .filter((row) => row.click_event_id && savingActionFor(row.status) === "cancel")
    .map((row) => row.click_event_id as string))]
  if (declinedClicks.length > 0) {
    const { data, error } = await client
      .from("household_savings")
      .update({ status: "cancelled" })
      .in("click_event_id", declinedClicks)
      .eq("status", "secured")
      .select("id")
    if (error) totals.failures += 1
    else totals.cancelledSavings = (data ?? []).length
  }

  return totals
}
