import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Durability for the affiliate revenue loop.
 *
 * The public routes must never lose a customer request just because the
 * automation webhook was unavailable, and they must never fail the customer
 * response because analytics could not be written. Every helper here therefore
 * swallows its own errors and returns `null`/`false` instead of throwing: a
 * persistence failure must not turn a delivered request into a 500.
 */

/** Minimal shape the request route already builds. Kept structural on purpose. */
export type PersistableServiceRequest = {
  requestId: string
  kind: string
  locale: string
  source?: string | null
  landingUrl?: string | null
  referrer?: string | null
  userAgent?: string | null
  customer: { name: string; email: string; phone?: string | null }
  answers: Record<string, string>
  consent: boolean
  slaMinutes: number
  promisedResponseBy: string | null
}

function isMissingTable(error: { code?: string } | null | undefined) {
  // 42P01 = undefined_table. Until the migration is applied the write is simply
  // skipped; the request is still forwarded, so behaviour degrades to the old one.
  return error?.code === "42P01"
}

/**
 * Insert the request before contacting the orchestrator. Returns the persisted
 * row id, or null when no admin client is configured / the insert failed.
 */
export async function persistServiceRequest(
  client: SupabaseClient | null,
  input: PersistableServiceRequest,
): Promise<string | null> {
  if (!client) return null
  try {
    const { data, error } = await client
      .from("affiliate_requests")
      .insert({
        request_id: input.requestId,
        kind: input.kind,
        locale: input.locale,
        source: input.source ?? null,
        landing_url: input.landingUrl ?? null,
        referrer: input.referrer ?? null,
        user_agent: input.userAgent ?? null,
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone ?? null,
        answers: input.answers,
        consent: input.consent,
        sla_minutes: input.slaMinutes,
        promised_response_by: input.promisedResponseBy,
        forward_status: "pending",
      })
      .select("id")
      .single()
    if (error) return null
    return (data as { id: string }).id
  } catch {
    return null
  }
}

/** Record the outcome of the outbound webhook attempt. Best-effort. */
export async function markServiceRequestForward(
  client: SupabaseClient | null,
  requestId: string,
  outcome: "forwarded" | "failed" | "not_configured",
  errorDetail?: string | null,
): Promise<void> {
  if (!client) return
  try {
    await client
      .from("affiliate_requests")
      .update({ forward_status: outcome, forward_error: errorDetail ?? null })
      .eq("request_id", requestId)
  } catch {
    // best-effort
  }
}

export type AffiliateClickInput = {
  offerId: string
  locale?: string | null
  path?: string | null
  referrer?: string | null
  userAgent?: string | null
  ipHash?: string | null
}

/**
 * Record one outbound affiliate click. Returns true when the row was written.
 * The redirect must succeed even when this returns false.
 */
export async function recordAffiliateClick(
  client: SupabaseClient | null,
  input: AffiliateClickInput,
): Promise<boolean> {
  if (!client) return false
  try {
    const { error } = await client.from("affiliate_click_events").insert({
      offer_id: input.offerId,
      locale: input.locale ?? null,
      path: input.path ?? null,
      referrer: input.referrer ?? null,
      user_agent: input.userAgent ?? null,
      ip_hash: input.ipHash ?? null,
    })
    return !error
  } catch {
    return false
  }
}

export { isMissingTable }
