import "server-only"

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createNegotiationEngine, type NegotiationEngineContext } from "./index"
import { isNegotiationEnabled, NEGOTIATION_DISABLED_CODE } from "./flag"
import { buildContractFacts, contractEligibility, type NegotiationContract } from "./facts"
import type { NegotiationSessionRow } from "./repository"

/**
 * Route-level plumbing shared by the negotiation endpoints.
 *
 * Every route resolves the same three preconditions in the same order — feature
 * flag, session, engine — so a route cannot accidentally skip one. The flag is
 * checked first because a disabled feature must behave identically to one that
 * does not exist, including for an unauthenticated caller.
 */

export type RouteFailure = { response: NextResponse }

export function negotiationDisabled(): RouteFailure {
  return {
    response: NextResponse.json({ code: NEGOTIATION_DISABLED_CODE }, { status: 404 }),
  }
}

export function unauthenticated(): RouteFailure {
  return {
    response: NextResponse.json({ code: "NEGOTIATION_NOT_AUTHENTICATED" }, { status: 401 }),
  }
}

export function notFound(code = "NEGOTIATION_SESSION_NOT_FOUND"): RouteFailure {
  return { response: NextResponse.json({ code }, { status: 404 }) }
}

export function validationFailed(issues?: unknown): RouteFailure {
  return {
    response: NextResponse.json({ code: "NEGOTIATION_VALIDATION_FAILED", issues }, { status: 400 }),
  }
}

export function upstreamFailed(code: string): RouteFailure {
  return { response: NextResponse.json({ code }, { status: 502 }) }
}

export function conflict(code: string): RouteFailure {
  return { response: NextResponse.json({ code }, { status: 409 }) }
}

export function isFailure(value: unknown): value is RouteFailure {
  return Boolean(value && typeof value === "object" && "response" in value)
}

/** Resolves the engine, refusing when the flag is off or there is no session. */
export async function requireEngine(): Promise<NegotiationEngineContext | RouteFailure> {
  if (!isNegotiationEnabled()) return negotiationDisabled()
  const engine = await createNegotiationEngine()
  if (!engine.repository) return unauthenticated()
  return engine
}

/** Loads a session scoped to the caller, refusing when it is not theirs. */
export async function requireOwnedSession(
  engine: NegotiationEngineContext,
  sessionId: string,
): Promise<NegotiationSessionRow | RouteFailure> {
  const result = await engine.repository!.getSession(sessionId)
  if (result.error || !result.data) return notFound("NEGOTIATION_SESSION_NOT_FOUND")
  return result.data
}

const CONTRACT_SELECT =
  "id,title,category,provider:provider_name,contract_number,monthly_amount,start_date,end_date,cancellation_deadline,promotion_expiry,services,price_history,review_status,document_id"

type ContractRow = {
  id: string
  title: string
  category: string
  provider: string | null
  contract_number: string | null
  monthly_amount: number | null
  start_date: string | null
  end_date: string | null
  cancellation_deadline: string | null
  promotion_expiry: string | null
  services: unknown
  price_history: unknown
  review_status: string | null
  document_id: string | null
}

/**
 * Loads a contract the caller owns. `householdId` comes from `ensureHousehold`,
 * which resolves the caller's own household, so the `.eq` is a second bound on
 * top of the RLS policy rather than the only one.
 */
export async function loadOwnedContract(
  supabase: SupabaseClient,
  householdId: string,
  contractId: string,
): Promise<NegotiationContract | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("id", contractId)
    .eq("household_id", householdId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as ContractRow
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    provider: row.provider,
    customerNumber: null,
    contractNumber: row.contract_number,
    monthlyAmount: row.monthly_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    cancellationDeadline: row.cancellation_deadline,
    promotionExpiry: row.promotion_expiry,
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    priceHistory: Array.isArray(row.price_history) ? (row.price_history as never[]) : [],
    reviewStatus: (row.review_status as NegotiationContract["reviewStatus"]) ?? null,
    documentId: row.document_id,
  }
}

/**
 * Whether a contract may be negotiated, and why not. Returned as a plain object so
 * a route can render the reason instead of a bare refusal.
 */
export function contractEligibilityFor(contract: NegotiationContract) {
  return contractEligibility(contract)
}

export { buildContractFacts }
