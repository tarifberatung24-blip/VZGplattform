import "server-only"
import { createCaseEngine } from "@/lib/horizon/case"
import { fail, ok, type ConsultantResult } from "./contract"

/**
 * HORIZON Business Consultant — canonical case provisioning.
 *
 * The Business Consultant service deliberately never writes the case spine: it
 * *references* cases and documents. A specialist run, however, is executed by the
 * Agent Runs Engine against a case's owner-validated context, and a run without a
 * case is skipped rather than answered from nothing. This module closes that gap
 * by opening (or reusing) exactly one canonical `public.cases` row per business
 * profile, through the same case engine every other module uses.
 *
 * Idempotency is the database's, not this module's: the case is created with a
 * `service_request_id` derived from the profile id, and the partial UNIQUE index
 * on `(owner_id, service_request_id)` makes a concurrent duplicate insert fail
 * with `23505` instead of creating a second case. The recovery then reads the
 * winner. Nothing here writes `horizon_status` directly — the lifecycle is
 * advanced through `CaseEngineRepository.advanceTo`.
 */

export const BUSINESS_CASE_REQUEST_PREFIX = "business-consultant:"

/** The stable, owner-scoped request id that binds one profile to one case. */
export function businessCaseRequestId(profileId: string): string {
  return `${BUSINESS_CASE_REQUEST_PREFIX}${profileId}`
}

export type BusinessCaseResult = {
  caseId: string
  /** True when a case for this profile already existed; nothing new was created. */
  reused: boolean
}

function caseTitle(businessName: string, locale: "bg" | "de"): string {
  const name = businessName.trim().slice(0, 160) || "HORIZON"
  return locale === "de" ? `${name} — HORIZON Betrieb` : `${name} — HORIZON бизнес`
}

/**
 * Opens or reuses the canonical case for a business profile.
 *
 * The caller supplies the profile id and business name it already resolved
 * against the owner's own rows; the case engine then proves ownership again by
 * creating under the session user and by looking the request id up owner-scoped.
 */
export async function ensureBusinessCase(input: {
  profileId: string
  businessName: string
  locale: "bg" | "de"
}): Promise<ConsultantResult<BusinessCaseResult>> {
  const engine = await createCaseEngine()
  if (!engine.repository) return fail("AUTHENTICATION_REQUIRED", "AUTHENTICATION_REQUIRED")
  const repository = engine.repository
  const requestId = businessCaseRequestId(input.profileId)

  const existing = await repository.findCaseByServiceRequestId(requestId)
  if (existing.error) return fail(existing.error, "CASE_LOOKUP_FAILED")
  if (existing.data) return ok({ caseId: existing.data.id, reused: true })

  const created = await repository.createCase({
    title: caseTitle(input.businessName, input.locale),
    module: "general",
    intent: "explanation",
    uiLocale: input.locale,
    conversationLocale: input.locale,
    serviceRequestId: requestId,
  })

  if (created.code === "23505") {
    // Another request won the race between the lookup and the insert. The unique
    // index is the guarantee; recover the winner instead of failing.
    const raced = await repository.findCaseByServiceRequestId(requestId)
    if (raced.error) return fail(raced.error, "CASE_LOOKUP_FAILED")
    if (raced.data) return ok({ caseId: raced.data.id, reused: true })
    return fail(created.error ?? "CASE_CREATE_FAILED", "CASE_CREATE_FAILED")
  }
  if (created.error || !created.data) {
    return fail(created.error ?? "CASE_CREATE_FAILED", "CASE_CREATE_FAILED")
  }

  const caseId = created.data.id

  // Provisioning facts carry a stable identity, so a retry tops up only what is
  // missing and never overwrites a value the user may have edited since.
  await repository.addFacts(
    caseId,
    [
      { key: "business_profile_id", value: input.profileId, critical: true, idempotencyKey: `${requestId}:fact:profile` },
      { key: "business_name", value: input.businessName.slice(0, 200), idempotencyKey: `${requestId}:fact:name` },
    ],
    { auditIdempotencyKey: `${requestId}:audit:facts_added` },
  )

  // Forward-only: a retry never regresses a case the user has since moved on.
  const collecting = await repository.advanceTo(caseId, "collecting_data")
  if (collecting.error) return fail(collecting.error, "CASE_ADVANCE_FAILED")

  return ok({ caseId, reused: false })
}
