import type { SupabaseClient } from "@supabase/supabase-js"
import { toCents } from "./commission"

/**
 * Evidenced household savings: what a confirmed switch saves the customer.
 *
 * A saving is recorded only from evidence (the partner's confirmation or the
 * new contract document) and only when the new monthly cost is really lower.
 * `secured` = new contract confirmed, `realized` = it has started,
 * `cancelled` = it did not happen. HORIZON never estimates a saving here.
 */

export const savingStatuses = ["secured", "realized", "cancelled"] as const
export type SavingStatus = (typeof savingStatuses)[number]

export const savingEvidenceSources = ["partner_confirmation", "new_contract_document"] as const
export type SavingEvidenceSource = (typeof savingEvidenceSources)[number]

export function isSavingStatus(value: unknown): value is SavingStatus {
  return typeof value === "string" && (savingStatuses as readonly string[]).includes(value)
}

export function isSavingEvidenceSource(value: unknown): value is SavingEvidenceSource {
  return typeof value === "string" && (savingEvidenceSources as readonly string[]).includes(value)
}

const allowedTransitions: Record<SavingStatus, readonly SavingStatus[]> = {
  secured: ["realized", "cancelled"],
  realized: [],
  cancelled: [],
}

export type SavingTransitionCheck =
  | { ok: true }
  | { ok: false; reason: "unknown_status" | "same_status" | "terminal" | "not_allowed" }

export function canTransitionSaving(from: string, to: string): SavingTransitionCheck {
  if (!isSavingStatus(from) || !isSavingStatus(to)) return { ok: false, reason: "unknown_status" }
  if (from === to) return { ok: false, reason: "same_status" }
  if (allowedTransitions[from].length === 0) return { ok: false, reason: "terminal" }
  return allowedTransitions[from].includes(to) ? { ok: true } : { ok: false, reason: "not_allowed" }
}

export type SavingComputation =
  | { ok: true; oldMonthlyCents: number; newMonthlyCents: number; annualSavingCents: number }
  | { ok: false; reason: "invalid_old_amount" | "invalid_new_amount" | "no_reduction" }

/** Annual saving from two evidenced monthly amounts in EUR, in integer cents. */
export function computeSaving(oldMonthlyEur: number | string, newMonthlyEur: number | string): SavingComputation {
  const oldMonthlyCents = toCents(oldMonthlyEur)
  if (oldMonthlyCents === null || oldMonthlyCents === 0) return { ok: false, reason: "invalid_old_amount" }
  const newMonthlyCents = toCents(newMonthlyEur)
  if (newMonthlyCents === null) return { ok: false, reason: "invalid_new_amount" }
  if (newMonthlyCents >= oldMonthlyCents) return { ok: false, reason: "no_reduction" }
  return { ok: true, oldMonthlyCents, newMonthlyCents, annualSavingCents: (oldMonthlyCents - newMonthlyCents) * 12 }
}

export type SavingOwner = {
  userId: string
  offerId: string
  optimizeSessionId: string | null
  clickEventId: string | null
}

/**
 * Resolve who a saving belongs to from the attributed click (preferred, it is
 * what the partner reports back as sub-ID) or from the Optimize session.
 * Returns null when no signed-in user can be identified: an unattributed
 * saving cannot be shown to anyone, so it is not stored.
 */
export async function resolveSavingOwner(
  client: SupabaseClient | null,
  ref: { clickId?: string | null; optimizeSessionId?: string | null },
): Promise<SavingOwner | null> {
  if (!client) return null
  try {
    if (ref.clickId) {
      const { data } = await client
        .from("affiliate_click_events")
        .select("id,offer_id,user_id,optimize_session_id")
        .eq("id", ref.clickId)
        .maybeSingle()
      if (!data?.user_id) return null
      return {
        userId: data.user_id,
        offerId: data.offer_id,
        optimizeSessionId: data.optimize_session_id ?? null,
        clickEventId: data.id,
      }
    }
    if (ref.optimizeSessionId) {
      const { data } = await client
        .from("optimize_sessions")
        .select("id,user_id,partner_id")
        .eq("id", ref.optimizeSessionId)
        .maybeSingle()
      if (!data?.user_id || !data.partner_id) return null
      return { userId: data.user_id, offerId: data.partner_id, optimizeSessionId: data.id, clickEventId: null }
    }
    return null
  } catch {
    return null
  }
}

export type SavingRecordInput = SavingOwner & {
  oldMonthlyCents: number
  newMonthlyCents: number
  status: SavingStatus
  evidenceSource: SavingEvidenceSource
  switchEffectiveDate: string | null
  evidenceNote: string | null
}

/** Insert one saving. "duplicate" when the Optimize session already has one. */
export async function createSavingRecord(
  client: SupabaseClient | null,
  input: SavingRecordInput,
): Promise<{ outcome: "created"; id: string; annualSavingCents: number } | { outcome: "duplicate" | "failed" }> {
  if (!client) return { outcome: "failed" }
  try {
    const { data, error } = await client
      .from("household_savings")
      .insert({
        user_id: input.userId,
        offer_id: input.offerId,
        optimize_session_id: input.optimizeSessionId,
        click_event_id: input.clickEventId,
        old_monthly_cents: input.oldMonthlyCents,
        new_monthly_cents: input.newMonthlyCents,
        status: input.status,
        evidence_source: input.evidenceSource,
        switch_effective_date: input.switchEffectiveDate,
        evidence_note: input.evidenceNote,
      })
      .select("id,annual_saving_cents")
      .single()
    if (error) return { outcome: error.code === "23505" ? "duplicate" : "failed" }
    return { outcome: "created", id: data.id, annualSavingCents: data.annual_saving_cents }
  } catch {
    return { outcome: "failed" }
  }
}

export async function findSavingStatus(client: SupabaseClient | null, savingId: string): Promise<string | null> {
  if (!client) return null
  try {
    const { data } = await client.from("household_savings").select("status").eq("id", savingId).maybeSingle()
    return data?.status ?? null
  } catch {
    return null
  }
}

/** Compare-and-set status update; false when the row moved meanwhile or the write failed. */
export async function updateSavingStatus(
  client: SupabaseClient | null,
  savingId: string,
  from: SavingStatus,
  to: SavingStatus,
): Promise<boolean> {
  if (!client) return false
  try {
    const { data, error } = await client
      .from("household_savings")
      .update({ status: to })
      .eq("id", savingId)
      .eq("status", from)
      .select("id")
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}
