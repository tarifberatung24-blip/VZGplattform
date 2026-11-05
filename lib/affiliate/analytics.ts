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
  userId?: string | null
  caseId?: string | null
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
    const base = {
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
    }
    const { data, error } = await client
      .from("affiliate_requests")
      .insert({ ...base, user_id: input.userId ?? null, case_id: input.caseId ?? null })
      .select("id")
      .single()
    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      const fallback = await client.from("affiliate_requests").insert(base).select("id").single()
      if (fallback.error) return null
      return (fallback.data as { id: string }).id
    }
    if (error) return null
    return (data as { id: string }).id
  } catch {
    return null
  }
}

export type ClaimableServiceRequest = {
  requestId: string
  kind: string
  locale: "bg" | "de"
  customerName: string
  customerEmail: string
  answers: Record<string, string>
  caseId: string | null
}

export async function getClaimableServiceRequest(
  client: SupabaseClient | null,
  input: { requestId: string; email: string },
): Promise<{ data: ClaimableServiceRequest | null; error: string | null }> {
  if (!client) return { data: null, error: "ANALYTICS_NOT_CONFIGURED" }
  try {
    const { data, error } = await client
      .from("affiliate_requests")
      .select("request_id,kind,locale,customer_name,customer_email,answers,case_id")
      .eq("request_id", input.requestId)
      .is("user_id", null)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    if (!data || String(data.customer_email).toLowerCase() !== input.email.toLowerCase()) {
      return { data: null, error: "SERVICE_REQUEST_NOT_FOUND" }
    }
    return {
      data: {
        requestId: data.request_id,
        kind: data.kind,
        locale: data.locale,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        answers: (data.answers ?? {}) as Record<string, string>,
        caseId: data.case_id,
      },
      error: null,
    }
  } catch {
    return { data: null, error: "SERVICE_REQUEST_CLAIM_FAILED" }
  }
}

/** Claim a guest request after authentication without exposing the service-role table. */
export async function claimServiceRequest(
  client: SupabaseClient | null,
  input: { requestId: string; userId: string; email: string; caseId: string },
): Promise<{ data: ClaimableServiceRequest | null; error: string | null }> {
  if (!client) return { data: null, error: "ANALYTICS_NOT_CONFIGURED" }
  try {
    const candidate = await getClaimableServiceRequest(client, { requestId: input.requestId, email: input.email })
    if (candidate.error || !candidate.data) return candidate
    const updated = await client
      .from("affiliate_requests")
      .update({ user_id: input.userId, case_id: input.caseId })
      .eq("request_id", input.requestId)
      .is("user_id", null)
      .select("request_id,kind,locale,customer_name,customer_email,answers,case_id")
      .maybeSingle()
    if (updated.error || !updated.data) return { data: null, error: updated.error?.message ?? "CLAIM_RACE" }
    return {
      data: {
        requestId: updated.data.request_id,
        kind: updated.data.kind,
        locale: updated.data.locale,
        customerName: candidate.data.customerName,
        customerEmail: candidate.data.customerEmail,
        answers: candidate.data.answers,
        caseId: updated.data.case_id,
      },
      error: null,
    }
  } catch {
    return { data: null, error: "SERVICE_REQUEST_CLAIM_FAILED" }
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

/**
 * Link a stored request row to the case and owner it was provisioned for.
 *
 * The row is inserted before the case exists, so the request stays durable even
 * when case provisioning is slow or fails; this backfills `case_id` and
 * `user_id` once it succeeds. Without it the row keeps the null values from
 * insert and the case has no traceable request, which breaks reconciliation.
 *
 * Best-effort like the other column updates: a missing attribution migration
 * (`42703`/`PGRST204`) or an unavailable client leaves the request row intact.
 * Returns true only when a row was actually updated.
 */
export async function linkServiceRequestCase(
  client: SupabaseClient | null,
  input: { requestId: string; caseId: string; userId: string | null },
): Promise<boolean> {
  if (!client) return false
  try {
    const { data, error } = await client
      .from("affiliate_requests")
      .update({ case_id: input.caseId, user_id: input.userId })
      .eq("request_id", input.requestId)
      .select("id")
      .maybeSingle()
    if (error && isMissingColumn(error)) {
      // The case-link migration is not applied yet; keep the request, skip the link.
      return false
    }
    return !error && Boolean(data)
  } catch {
    return false
  }
}

export type AffiliateClickInput = {
  offerId: string
  locale?: string | null
  path?: string | null
  referrer?: string | null
  userAgent?: string | null
  ipHash?: string | null
  /** Caller-generated row id, so the same value can be passed to the partner as sub-ID. */
  id?: string | null
  userId?: string | null
  optimizeSessionId?: string | null
}

/** Column missing because the attribution migration is not applied yet. */
function isMissingColumn(error: { code?: string } | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204"
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
  const base = {
    ...(input.id ? { id: input.id } : {}),
    offer_id: input.offerId,
    locale: input.locale ?? null,
    path: input.path ?? null,
    referrer: input.referrer ?? null,
    user_agent: input.userAgent ?? null,
    ip_hash: input.ipHash ?? null,
  }
  const attribution = {
    ...(input.userId ? { user_id: input.userId } : {}),
    ...(input.optimizeSessionId ? { optimize_session_id: input.optimizeSessionId } : {}),
  }
  try {
    const { error } = await client.from("affiliate_click_events").insert({ ...base, ...attribution })
    if (!error) return true
    // Before the attribution migration is applied, still count the click.
    if (isMissingColumn(error) && Object.keys(attribution).length > 0) {
      const retry = await client.from("affiliate_click_events").insert(base)
      return !retry.error
    }
    return false
  } catch {
    return false
  }
}

export type AffiliateStatusEventInput = {
  requestId: string
  status: string
  note?: string | null
  source?: string | null
}

/** Read the current customer-facing status, or null when the row/table is absent. */
export async function findServiceRequestStatus(
  client: SupabaseClient | null,
  requestId: string,
): Promise<string | null> {
  if (!client) return null
  try {
    const { data, error } = await client
      .from("affiliate_requests")
      .select("status")
      .eq("request_id", requestId)
      .maybeSingle()
    if (error || !data) return null
    return (data as { status: string }).status
  } catch {
    return null
  }
}

/**
 * Advance the customer-facing status. Returns true only when a row was actually
 * updated, so the endpoint can distinguish "advanced" from "request not found".
 */
export async function markServiceRequestStatus(
  client: SupabaseClient | null,
  requestId: string,
  status: string,
): Promise<boolean> {
  if (!client) return false
  try {
    const { data, error } = await client
      .from("affiliate_requests")
      .update({ status })
      .eq("request_id", requestId)
      .select("id")
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}

/** Append one lifecycle event to the append-only ledger. Best-effort. */
export async function recordAffiliateStatusEvent(
  client: SupabaseClient | null,
  input: AffiliateStatusEventInput,
): Promise<void> {
  if (!client) return
  try {
    await client.from("affiliate_status_events").insert({
      request_id: input.requestId,
      status: input.status,
      note: input.note ?? null,
      source: input.source ?? null,
    })
  } catch {
    // best-effort: the status update is the source of truth, the event is history
  }
}

export type CommissionRecordInput = {
  requestId: string
  offerId: string
  model: string
  status: string
  amountCents: number
  currency?: string | null
  externalReference?: string | null
  note?: string | null
  source?: string | null
}

/**
 * Insert one commission row, keyed by (request_id, offer_id). Returns "created",
 * "duplicate" when the pair already exists, or "error". The distinction lets the
 * caller answer idempotently: a repeated callback is not a failure.
 */
export async function createCommissionRecord(
  client: SupabaseClient | null,
  input: CommissionRecordInput,
): Promise<"created" | "duplicate" | "error"> {
  if (!client) return "error"
  try {
    const { error } = await client.from("affiliate_commissions").insert({
      request_id: input.requestId,
      offer_id: input.offerId,
      model: input.model,
      status: input.status,
      amount_cents: input.amountCents,
      currency: input.currency ?? "EUR",
      external_reference: input.externalReference ?? null,
      note: input.note ?? null,
      source: input.source ?? null,
    })
    if (!error) return "created"
    // 23505 = unique_violation, the (request_id, offer_id) key already exists.
    if (error.code === "23505") return "duplicate"
    return "error"
  } catch {
    return "error"
  }
}

/** Read the current commission status for a (request, offer) pair, or null. */
export async function findCommissionStatus(
  client: SupabaseClient | null,
  requestId: string,
  offerId: string,
): Promise<string | null> {
  if (!client) return null
  try {
    const { data, error } = await client
      .from("affiliate_commissions")
      .select("status")
      .eq("request_id", requestId)
      .eq("offer_id", offerId)
      .maybeSingle()
    if (error || !data) return null
    return (data as { status: string }).status
  } catch {
    return null
  }
}

/** Advance the commission status. Returns true only when a row was updated. */
export async function updateCommissionStatus(
  client: SupabaseClient | null,
  requestId: string,
  offerId: string,
  status: string,
): Promise<boolean> {
  if (!client) return false
  try {
    const { data, error } = await client
      .from("affiliate_commissions")
      .update({ status })
      .eq("request_id", requestId)
      .eq("offer_id", offerId)
      .select("id")
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}

export { isMissingTable }
