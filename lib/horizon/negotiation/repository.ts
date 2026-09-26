import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { computeContentHash } from "@/lib/horizon/case/approval"
import type {
  AuthorizationStatus,
  ExecutionMode,
  NegotiationEventType,
  NegotiationState,
  DecisionAction,
  VerificationResult,
} from "./contract"
import { isNegotiationState, isDecisionAction } from "./contract"
import type { MissingInformation, OpportunityReason } from "./opportunity"
import type { AssistedRequestStatus } from "./assisted"
import { isAssistedRequestStatus } from "./assisted"
import type { NegotiationPreferences } from "./preferences"
import type { OfferSource } from "./offer-parse"
import type { OfferTerms } from "./savings"
import type { TimelineEvent } from "./timeline"
import { redactNegotiationMetadata } from "./guard"

/**
 * HORIZON NEGOTIATION — owner-scoped persistence.
 *
 * Every query is scoped by `owner_id = auth.uid()` on top of the RLS policy, the
 * same defence-in-depth the rest of the platform uses: a row belonging to another
 * owner is indistinguishable from a missing one, so a caller can never read or
 * write across accounts even if a policy were misconfigured.
 *
 * The client is the request-scoped session client. No service-role client is used
 * here, so RLS is always in force.
 */

export type RepoResult<T> = { data: T | null; error: string | null }

const ok = <T>(data: T): RepoResult<T> => ({ data, error: null })
const fail = <T>(error: string): RepoResult<T> => ({ data: null, error })

export type NegotiationSessionRow = {
  id: string
  owner_id: string
  household_id: string
  contract_id: string
  category: string
  state: NegotiationState
  decision_action: DecisionAction | null
  reason_codes: OpportunityReason[]
  missing_information: MissingInformation[]
  opportunity_confidence: number | null
  next_review_date: string | null
  analysis: Record<string, unknown>
  execution_mode: ExecutionMode
  mode_b_request_id: string | null
  mode_b_status: AssistedRequestStatus | null
  mode_b_queued_at: string | null
  mode_b_updated_at: string | null
  authorization_status: AuthorizationStatus
  current_monthly_cost: number | null
  target_monthly_cost: number | null
  potential_monthly_saving: number | null
  potential_annual_saving: number | null
  promotion_expiry: string | null
  verification_due_at: string | null
  verified_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export type NegotiationOfferRow = {
  id: string
  session_id: string
  origin: "provider" | "user_counter" | "operator"
  source: OfferSource
  document_id: string | null
  content: Record<string, unknown>
  content_hash: string
  parsed_facts: OfferTerms
  status: "received" | "under_review" | "accepted" | "countered" | "rejected" | "superseded"
  supersedes_offer_id: string | null
  approved_hash: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
}

export type NegotiationVerificationRow = {
  id: string
  session_id: string
  expected: Record<string, unknown>
  actual: Record<string, unknown> | null
  result: VerificationResult
  discrepancies: unknown[]
  document_id: string | null
  due_at: string | null
  verified_at: string | null
  created_at: string
}

export type NegotiationEventRow = {
  id: string
  session_id: string
  event_type: NegotiationEventType
  detail: Record<string, unknown>
  created_at: string
}

const SESSION_COLUMNS =
  "id,owner_id,household_id,contract_id,category,state,decision_action,reason_codes,missing_information,opportunity_confidence,next_review_date,analysis,execution_mode,mode_b_request_id,mode_b_status,mode_b_queued_at,mode_b_updated_at,authorization_status,current_monthly_cost,target_monthly_cost,potential_monthly_saving,potential_annual_saving,promotion_expiry,verification_due_at,verified_at,closed_at,created_at,updated_at"

export class NegotiationRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly ownerId: string,
  ) {}

  async createSession(input: {
    householdId: string
    contractId: string
    category: string
    state: NegotiationState
    analysis: Record<string, unknown>
    currentMonthlyCost: number | null
    executionMode?: ExecutionMode
  }): Promise<RepoResult<NegotiationSessionRow>> {
    const { data, error } = await this.client
      .from("negotiation_sessions")
      .insert({
        owner_id: this.ownerId,
        household_id: input.householdId,
        contract_id: input.contractId,
        category: input.category,
        state: input.state,
        analysis: input.analysis,
        current_monthly_cost: input.currentMonthlyCost,
        execution_mode: input.executionMode ?? "SELF",
      })
      .select(SESSION_COLUMNS)
      .single()
    if (error || !data) return fail("NEGOTIATION_SESSION_CREATE_FAILED")
    return ok(data as NegotiationSessionRow)
  }

  async getSession(sessionId: string): Promise<RepoResult<NegotiationSessionRow>> {
    const { data, error } = await this.client
      .from("negotiation_sessions")
      .select(SESSION_COLUMNS)
      .eq("id", sessionId)
      .eq("owner_id", this.ownerId)
      .maybeSingle()
    if (error) return fail("NEGOTIATION_SESSION_UNAVAILABLE")
    if (!data) return fail("NEGOTIATION_SESSION_NOT_FOUND")
    return ok(data as NegotiationSessionRow)
  }

  async listSessions(): Promise<RepoResult<NegotiationSessionRow[]>> {
    const { data, error } = await this.client
      .from("negotiation_sessions")
      .select(SESSION_COLUMNS)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: false })
    if (error) return fail("NEGOTIATION_SESSIONS_UNAVAILABLE")
    return ok((data ?? []) as NegotiationSessionRow[])
  }

  async updateSession(
    sessionId: string,
    patch: Partial<{
      state: NegotiationState
      decision_action: DecisionAction | null
      reason_codes: OpportunityReason[]
      missing_information: MissingInformation[]
      opportunity_confidence: number | null
      next_review_date: string | null
      analysis: Record<string, unknown>
      execution_mode: ExecutionMode
      mode_b_request_id: string | null
      mode_b_status: AssistedRequestStatus | null
      mode_b_queued_at: string | null
      mode_b_updated_at: string | null
      authorization_status: AuthorizationStatus
      target_monthly_cost: number | null
      potential_monthly_saving: number | null
      potential_annual_saving: number | null
      promotion_expiry: string | null
      verification_due_at: string | null
      verified_at: string | null
      closed_at: string | null
    }>,
  ): Promise<RepoResult<NegotiationSessionRow>> {
    if (patch.state !== undefined && !isNegotiationState(patch.state)) {
      return fail("NEGOTIATION_INVALID_STATE")
    }
    if (
      patch.decision_action !== undefined &&
      patch.decision_action !== null &&
      !isDecisionAction(patch.decision_action)
    ) {
      return fail("NEGOTIATION_INVALID_ACTION")
    }
    const { data, error } = await this.client
      .from("negotiation_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("owner_id", this.ownerId)
      .select(SESSION_COLUMNS)
      .maybeSingle()
    if (error) return fail("NEGOTIATION_SESSION_UPDATE_FAILED")
    if (!data) return fail("NEGOTIATION_SESSION_NOT_FOUND")
    return ok(data as NegotiationSessionRow)
  }

  /** Appends timeline events. Append-only: there is no update or delete path. */
  async appendEvents(sessionId: string, events: TimelineEvent[]): Promise<RepoResult<number>> {
    if (events.length === 0) return ok(0)
    const rows = events.map((event) => ({
      owner_id: this.ownerId,
      session_id: sessionId,
      event_type: event.eventType,
      detail: redactNegotiationMetadata(event.detail),
    }))
    const { error } = await this.client.from("negotiation_events").insert(rows)
    if (error) return fail("NEGOTIATION_EVENT_APPEND_FAILED")
    return ok(rows.length)
  }

  async listEvents(sessionId: string): Promise<RepoResult<NegotiationEventRow[]>> {
    const { data, error } = await this.client
      .from("negotiation_events")
      .select("id,session_id,event_type,detail,created_at")
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: true })
    if (error) return fail("NEGOTIATION_EVENTS_UNAVAILABLE")
    return ok((data ?? []) as NegotiationEventRow[])
  }

  async savePreferences(
    sessionId: string,
    preferences: NegotiationPreferences,
  ): Promise<RepoResult<{ id: string }>> {
    const { data, error } = await this.client
      .from("negotiation_preferences")
      .upsert(
        {
          owner_id: this.ownerId,
          session_id: sessionId,
          must_keep: preferences.mustKeep,
          may_accept: preferences.mayAccept,
          must_never_accept: preferences.mustNeverAccept,
          max_contract_extension_months: preferences.maxContractExtensionMonths,
          allow_plan_change: preferences.allowPlanChange,
          allow_addons: preferences.allowAddons,
          allow_one_time_credit: preferences.allowOneTimeCredit,
          allow_temporary_discount: preferences.allowTemporaryDiscount,
          min_monthly_saving: preferences.minMonthlySaving,
          provenance: preferences.provenance,
        },
        { onConflict: "session_id" },
      )
      .select("id")
      .single()
    if (error || !data) return fail("NEGOTIATION_PREFERENCES_SAVE_FAILED")
    return ok(data as { id: string })
  }

  async getPreferences(sessionId: string): Promise<RepoResult<NegotiationPreferences>> {
    const { data, error } = await this.client
      .from("negotiation_preferences")
      .select(
        "must_keep,may_accept,must_never_accept,max_contract_extension_months,allow_plan_change,allow_addons,allow_one_time_credit,allow_temporary_discount,min_monthly_saving,provenance",
      )
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .maybeSingle()
    if (error) return fail("NEGOTIATION_PREFERENCES_UNAVAILABLE")
    if (!data) return fail("NEGOTIATION_PREFERENCES_NOT_FOUND")
    const row = data as Record<string, unknown>
    return ok({
      mustKeep: (row.must_keep ?? []) as NegotiationPreferences["mustKeep"],
      mayAccept: (row.may_accept ?? []) as NegotiationPreferences["mayAccept"],
      mustNeverAccept: (row.must_never_accept ?? []) as NegotiationPreferences["mustNeverAccept"],
      maxContractExtensionMonths: (row.max_contract_extension_months ?? null) as number | null,
      allowPlanChange: Boolean(row.allow_plan_change),
      allowAddons: Boolean(row.allow_addons),
      allowOneTimeCredit: Boolean(row.allow_one_time_credit),
      allowTemporaryDiscount: Boolean(row.allow_temporary_discount),
      minMonthlySaving: (row.min_monthly_saving ?? null) as number | null,
      provenance: (row.provenance ?? {}) as NegotiationPreferences["provenance"],
    })
  }

  /**
   * Inserts an offer with its content hash computed from the exact content. The
   * hash is what an approval binds to, so it is derived here rather than trusted
   * from the caller.
   */
  async addOffer(input: {
    sessionId: string
    origin: "provider" | "user_counter" | "operator"
    source: OfferSource
    documentId?: string | null
    content: Record<string, unknown>
    terms: OfferTerms
    supersedesOfferId?: string | null
  }): Promise<RepoResult<NegotiationOfferRow>> {
    const contentHash = await computeContentHash(JSON.stringify(input.content))
    const { data, error } = await this.client
      .from("negotiation_offers")
      .insert({
        owner_id: this.ownerId,
        session_id: input.sessionId,
        origin: input.origin,
        source: input.source,
        document_id: input.documentId ?? null,
        content: input.content,
        content_hash: contentHash,
        parsed_facts: input.terms,
        status: "received",
        supersedes_offer_id: input.supersedesOfferId ?? null,
      })
      .select(
        "id,session_id,origin,source,document_id,content,content_hash,parsed_facts,status,supersedes_offer_id,approved_hash,approved_at,rejected_at,created_at",
      )
      .single()
    if (error || !data) return fail("NEGOTIATION_OFFER_SAVE_FAILED")
    return ok(data as NegotiationOfferRow)
  }

  async listOffers(sessionId: string): Promise<RepoResult<NegotiationOfferRow[]>> {
    const { data, error } = await this.client
      .from("negotiation_offers")
      .select(
        "id,session_id,origin,source,document_id,content,content_hash,parsed_facts,status,supersedes_offer_id,approved_hash,approved_at,rejected_at,created_at",
      )
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: false })
    if (error) return fail("NEGOTIATION_OFFERS_UNAVAILABLE")
    return ok((data ?? []) as NegotiationOfferRow[])
  }

  async getOffer(sessionId: string, offerId: string): Promise<RepoResult<NegotiationOfferRow>> {
    const { data, error } = await this.client
      .from("negotiation_offers")
      .select(
        "id,session_id,origin,source,document_id,content,content_hash,parsed_facts,status,supersedes_offer_id,approved_hash,approved_at,rejected_at,created_at",
      )
      .eq("id", offerId)
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .maybeSingle()
    if (error) return fail("NEGOTIATION_OFFER_UNAVAILABLE")
    if (!data) return fail("NEGOTIATION_OFFER_NOT_FOUND")
    return ok(data as NegotiationOfferRow)
  }

  /**
   * Records an offer decision. `approvedHash` must equal the stored
   * `content_hash`; the caller checks this before writing, and the DB trigger
   * additionally refuses any later content edit, so an approval cannot be
   * re-pointed at content it never covered.
   */
  async decideOffer(input: {
    sessionId: string
    offerId: string
    decision: "accepted" | "rejected" | "countered" | "superseded"
    approvedHash?: string | null
  }): Promise<RepoResult<NegotiationOfferRow>> {
    const patch: Record<string, unknown> = { status: input.decision }
    if (input.decision === "accepted") {
      patch.approved_hash = input.approvedHash ?? null
      patch.approved_at = new Date().toISOString()
    }
    if (input.decision === "rejected") patch.rejected_at = new Date().toISOString()
    const { data, error } = await this.client
      .from("negotiation_offers")
      .update(patch)
      .eq("id", input.offerId)
      .eq("session_id", input.sessionId)
      .eq("owner_id", this.ownerId)
      .select(
        "id,session_id,origin,source,document_id,content,content_hash,parsed_facts,status,supersedes_offer_id,approved_hash,approved_at,rejected_at,created_at",
      )
      .maybeSingle()
    if (error) return fail("NEGOTIATION_OFFER_DECISION_FAILED")
    if (!data) return fail("NEGOTIATION_OFFER_NOT_FOUND")
    return ok(data as NegotiationOfferRow)
  }

  async addVerification(input: {
    sessionId: string
    expected: Record<string, unknown>
    dueAt: string | null
  }): Promise<RepoResult<{ id: string }>> {
    const { data, error } = await this.client
      .from("negotiation_verifications")
      .insert({
        owner_id: this.ownerId,
        session_id: input.sessionId,
        expected: input.expected,
        due_at: input.dueAt,
      })
      .select("id")
      .single()
    if (error || !data) return fail("NEGOTIATION_VERIFICATION_CREATE_FAILED")
    return ok(data as { id: string })
  }

  async listVerifications(sessionId: string): Promise<RepoResult<NegotiationVerificationRow[]>> {
    const { data, error } = await this.client
      .from("negotiation_verifications")
      .select("id,session_id,expected,actual,result,discrepancies,document_id,due_at,verified_at,created_at")
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: false })
    if (error) return fail("NEGOTIATION_VERIFICATIONS_UNAVAILABLE")
    return ok((data ?? []) as NegotiationVerificationRow[])
  }

  async updateVerification(input: {
    sessionId: string
    verificationId: string
    actual: Record<string, unknown>
    result: VerificationResult
    discrepancies: unknown[]
    documentId?: string | null
  }): Promise<RepoResult<NegotiationVerificationRow>> {
    const { data, error } = await this.client
      .from("negotiation_verifications")
      .update({
        actual: input.actual,
        result: input.result,
        discrepancies: input.discrepancies,
        document_id: input.documentId ?? null,
        verified_at: input.result === "VERIFIED" ? new Date().toISOString() : null,
      })
      .eq("id", input.verificationId)
      .eq("session_id", input.sessionId)
      .eq("owner_id", this.ownerId)
      .select("id,session_id,expected,actual,result,discrepancies,document_id,due_at,verified_at,created_at")
      .maybeSingle()
    if (error) return fail("NEGOTIATION_VERIFICATION_UPDATE_FAILED")
    if (!data) return fail("NEGOTIATION_VERIFICATION_NOT_FOUND")
    return ok(data as NegotiationVerificationRow)
  }

  async addAuthorization(input: {
    sessionId: string
    scope: string
    documentId?: string | null
  }): Promise<RepoResult<{ id: string }>> {
    const { data, error } = await this.client
      .from("negotiation_authorizations")
      .insert({
        owner_id: this.ownerId,
        session_id: input.sessionId,
        scope: input.scope,
        status: "pending",
        document_id: input.documentId ?? null,
      })
      .select("id")
      .single()
    if (error || !data) return fail("NEGOTIATION_AUTHORIZATION_CREATE_FAILED")
    return ok(data as { id: string })
  }

  async updateAuthorization(input: {
    sessionId: string
    authorizationId: string
    status: AuthorizationStatus
  }): Promise<RepoResult<{ id: string }>> {
    const { data, error } = await this.client
      .from("negotiation_authorizations")
      .update({
        status: input.status,
        granted_at: input.status === "granted" ? new Date().toISOString() : null,
        revoked_at: input.status === "revoked" ? new Date().toISOString() : null,
      })
      .eq("id", input.authorizationId)
      .eq("session_id", input.sessionId)
      .eq("owner_id", this.ownerId)
      .select("id")
      .maybeSingle()
    if (error) return fail("NEGOTIATION_AUTHORIZATION_UPDATE_FAILED")
    if (!data) return fail("NEGOTIATION_AUTHORIZATION_NOT_FOUND")
    return ok(data as { id: string })
  }

  /** The granted authorization for a session, if any. Owner-scoped. */
  async getGrantedAuthorization(
    sessionId: string,
  ): Promise<RepoResult<{ id: string; scope: string } | null>> {
    const { data, error } = await this.client
      .from("negotiation_authorizations")
      .select("id,scope,status")
      .eq("session_id", sessionId)
      .eq("owner_id", this.ownerId)
      .eq("status", "granted")
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return fail("NEGOTIATION_AUTHORIZATION_UNAVAILABLE")
    return ok((data as { id: string; scope: string } | null) ?? null)
  }

  /**
   * Atomically reserves the operator handoff and decides whether to deliver it.
   *
   * The reservation must exist before anything leaves the process, so it cannot be
   * a read-then-write from here: two concurrent submits would both read "no active
   * handoff" and both send a job. `reserve_negotiation_handoff` is a single
   * compare-and-set that also returns whether this caller owns the delivery, so a
   * concurrent double-submit resolves to one sender and one no-op.
   *
   * `deliver: false` means another caller holds the delivery (or the receiver
   * already has it); the caller must reuse `requestId` and must not send.
   */
  async reserveAssistedHandoff(input: {
    sessionId: string
    requestId: string
  }): Promise<
    RepoResult<{
      requestId: string
      deliver: boolean
      status: AssistedRequestStatus
      reason: string
    }>
  > {
    const { data, error } = await this.client.rpc("reserve_negotiation_handoff", {
      p_session_id: input.sessionId,
      p_owner_id: this.ownerId,
      p_request_id: input.requestId,
    })
    if (error) return fail("NEGOTIATION_HANDOFF_RESERVE_FAILED")
    const row = (Array.isArray(data) ? data[0] : data) as
      | { request_id: string; deliver: boolean; status: string | null; reason: string }
      | undefined
    if (!row?.request_id) return fail("NEGOTIATION_SESSION_NOT_FOUND")
    return ok({
      requestId: row.request_id,
      deliver: Boolean(row.deliver),
      status: (row.status ?? "QUEUED") as AssistedRequestStatus,
      reason: row.reason,
    })
  }

  /**
   * Records the outcome of an outbound delivery attempt. `FAILED` is what permits
   * a later retry with the same request id; `DELIVERED` retires the handoff from
   * re-sending. Keyed by request id, so a stale finalization is a no-op rather
   * than a corruption of a newer handoff.
   */
  async finalizeAssistedHandoffDelivery(input: {
    sessionId: string
    requestId: string
    delivered: boolean
  }): Promise<RepoResult<boolean>> {
    const { data, error } = await this.client.rpc("finalize_negotiation_handoff_delivery", {
      p_session_id: input.sessionId,
      p_owner_id: this.ownerId,
      p_request_id: input.requestId,
      p_delivered: input.delivered,
    })
    if (error) return fail("NEGOTIATION_HANDOFF_FINALIZE_FAILED")
    return ok(Boolean(data))
  }

  /**
   * Applies a callback status move and its timeline event in one transaction.
   *
   * Doing the two writes separately would let the status change while the event
   * that explains it is lost, so the route could not honestly claim an
   * append-only record of every move. `apply_negotiation_handoff_status` commits
   * both or neither, and its own compare-and-set on `from` makes two racing
   * callbacks resolve to one applied move and one replay.
   *
   * Returns `data: true` when applied, `data: false` when the row was absent, not
   * owned, or no longer in `from`.
   */
  async applyAssistedStatus(input: {
    sessionId: string
    from: AssistedRequestStatus
    status: AssistedRequestStatus
  }): Promise<RepoResult<boolean>> {
    if (!isAssistedRequestStatus(input.status)) return fail("NEGOTIATION_MODE_B_INVALID_STATUS")
    const { data, error } = await this.client.rpc("apply_negotiation_handoff_status", {
      p_session_id: input.sessionId,
      p_owner_id: this.ownerId,
      p_from: input.from,
      p_status: input.status,
    })
    if (error) return fail("NEGOTIATION_ASSISTED_STATUS_APPLY_FAILED")
    return ok(Boolean(data))
  }

  /**
   * Advances the operator queue state. The legal moves are checked by the caller
   * against `canTransitionAssistedRequest`; this only refuses an unknown status.
   */
  async updateAssistedStatus(input: {
    sessionId: string
    status: AssistedRequestStatus
  }): Promise<RepoResult<NegotiationSessionRow>> {
    if (!isAssistedRequestStatus(input.status)) return fail("NEGOTIATION_MODE_B_INVALID_STATUS")
    return this.updateSession(input.sessionId, {
      mode_b_status: input.status,
      mode_b_updated_at: new Date().toISOString(),
    })
  }
}
