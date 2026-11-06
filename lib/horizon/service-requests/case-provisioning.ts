import type { CaseEngineRepository } from "@/lib/horizon/case/repository"
import type { Case } from "@/lib/horizon/case/contract"
import { getHorizonServiceRequest, isHorizonServiceRequestKind, type HorizonServiceKind } from "./catalog"
import { SERVICE_REQUEST_ID_FACT, SERVICE_REQUEST_TYPE_FACT } from "./registry"

export type ProvisionHorizonServiceCaseInput = {
  kind: HorizonServiceKind
  locale: "bg" | "de"
  requestId: string
  customerName: string
  customerEmail: string
  answers: Record<string, string>
}

export type ProvisionHorizonServiceCaseResult = {
  data: Case | null
  error: string | null
  /** True when the case already existed for this request id; nothing new was created. */
  reused: boolean
}

/**
 * Idempotent: a repeated submission with the same `requestId` reuses the case an
 * earlier attempt created instead of provisioning a second one.
 *
 * Two layers close the duplicate window:
 *
 *  1. **Atomic (DB).** The request id is written to `cases.service_request_id` in
 *     the same insert that creates the case, and a partial UNIQUE index on
 *     (owner_id, service_request_id) makes that insert the atomic dedup step. If
 *     two concurrent requests pass the read guard together, exactly one insert
 *     wins and the other fails with `23505`; the loser then recovers the winner's
 *     case with an owner-scoped lookup instead of failing. This is what makes the
 *     guarantee hold under concurrency — a read-then-write guard cannot.
 *
 *  2. **Fact fallback (legacy).** Cases provisioned before the column existed
 *     carry the request id only as the `service_request_id` fact. They are found
 *     through `findCaseByFact`, so a retry that arrives long after the first
 *     attempt still reuses the same case rather than scanning a bounded list of
 *     recent cases.
 *
 * Both lookups are owner-scoped, so a request id can never reach another user's
 * case. A partial failure after the insert (a later `addFacts`/`addMessage`/
 * `advanceTo` error) leaves the case bound to the request id, so the next attempt
 * reuses it.
 */
export async function provisionHorizonServiceCase(
  repository: CaseEngineRepository,
  input: ProvisionHorizonServiceCaseInput,
): Promise<ProvisionHorizonServiceCaseResult> {
  if (!isHorizonServiceRequestKind(input.kind)) return { data: null, error: "UNKNOWN_HORIZON_SERVICE", reused: false }
  const service = getHorizonServiceRequest(input.kind)
  const title = input.locale === "de"
    ? `${service.kind} — Alpha Team Fall`
    : `${service.kind} — Alpha Team case`

  // Fast path: reuse the case a previous attempt already bound to this request id.
  const existing = await findExistingCase(repository, input.requestId)
  if (existing.error) return { data: null, error: existing.error, reused: false }
  if (existing.data) return completeReuse(repository, existing.data)

  const created = await repository.createCase({
    title,
    module: "general",
    intent: "application",
    uiLocale: input.locale,
    conversationLocale: input.locale,
    serviceRequestId: input.requestId,
  })
  if (created.code === "23505") {
    // Another request won the race between our lookup and our insert. The unique
    // index is the guarantee; recover the winner's case instead of failing.
    const raced = await repository.findCaseByServiceRequestId(input.requestId)
    if (raced.error) return { data: null, error: raced.error, reused: false }
    if (raced.data) return completeReuse(repository, raced.data)
    // The index rejected the insert but no case is visible: the winner's row is not
    // readable here. Surface the original error rather than looping.
    return { data: null, error: created.error ?? "CASE_CREATE_FAILED", reused: false }
  }
  if (created.error || !created.data) return { data: null, error: created.error ?? "CASE_CREATE_FAILED", reused: false }
  const caseId = created.data.id

  const answerFacts = Object.entries(input.answers).map(([key, value]) => ({
    key: `intake_${key}`,
    value,
    critical: false,
  }))
  const facts = await repository.addFacts(caseId, [
    { key: SERVICE_REQUEST_TYPE_FACT, value: input.kind, critical: true },
    { key: SERVICE_REQUEST_ID_FACT, value: input.requestId, critical: true },
    { key: "alpha_team_lead", value: service.alphaAgent },
    ...answerFacts,
  ])
  if (facts.error) return { data: null, error: facts.error, reused: false }

  const initial = input.locale === "de"
    ? `Ich habe deine Anfrage für ${service.kind} als HORIZON-Fall angelegt. Das Alpha Team (${service.alphaAgent}) prüft jetzt die Angaben. Bitte kommuniziere weiter in diesem Fall; fehlende Unterlagen werden hier angefordert. Keine externe Aktion erfolgt ohne deine Freigabe.`
    : `Създадох HORIZON case за ${service.kind}. Alpha Team (${service.alphaAgent}) ще провери данните и ще поиска липсващите документи тук. Комуникацията продължава в този case; външно действие няма да се извърши без твоето одобрение.`
  const message = await repository.addMessage(caseId, { role: "assistant", locale: input.locale, content: initial })
  if (message.error) return { data: null, error: message.error, reused: false }

  await repository.appendAudit(caseId, "alpha_team_run_created", {
    requestId: input.requestId,
    serviceKind: input.kind,
    leadAgent: service.alphaAgent,
    execution: "prepare_draft_and_request_missing_evidence",
    assistantRoute: `/api/horizon/cases/${caseId}/assistant`,
  })
  await repository.appendAudit(caseId, "quality_safety_blocked", {
    reason: "required_evidence_and_user_confirmation_pending",
    requiredEvidence: service.requiredEvidence,
    externalActions: "blocked_until_human_approval",
  })

  const collecting = await repository.advanceTo(caseId, "collecting_data")
  if (collecting.error) return { data: null, error: collecting.error, reused: false }
  const waiting = await repository.advanceTo(caseId, "waiting_for_user")
  if (waiting.error) return { data: null, error: waiting.error, reused: false }
  return { data: waiting.data ?? collecting.data ?? created.data, error: null, reused: false }
}

/**
 * Resolve an existing case for the request id: the indexed column first, then the
 * legacy fact. Column-first keeps the common path on the unique index; the fact
 * fallback keeps cases provisioned before the column reachable.
 */
async function findExistingCase(
  repository: CaseEngineRepository,
  requestId: string,
): Promise<{ data: Case | null; error: string | null }> {
  const byColumn = await repository.findCaseByServiceRequestId(requestId)
  if (byColumn.error) return byColumn
  if (byColumn.data) return byColumn
  return repository.findCaseByFact(SERVICE_REQUEST_ID_FACT, requestId)
}

/**
 * Finish a reused case: a previous attempt may have stopped after the case was
 * bound but before it reached `waiting_for_user`. Advancement is forward-only, so
 * this is a no-op once the case is already at or past the target and never
 * regresses a case a user has since moved on.
 */
async function completeReuse(
  repository: CaseEngineRepository,
  existing: Case,
): Promise<ProvisionHorizonServiceCaseResult> {
  const completed = await repository.advanceTo(existing.id, "waiting_for_user")
  if (completed.error) return { data: null, error: completed.error, reused: false }
  return { data: completed.data ?? existing, error: null, reused: true }
}
