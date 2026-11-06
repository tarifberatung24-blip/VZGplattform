import type { CaseEngineRepository } from "@/lib/horizon/case/repository"
import type { Case, CaseMessage } from "@/lib/horizon/case/contract"
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
 * First line of the assistant's opening message. It is a stable, unique marker:
 * a retry looks for it to tell "the opening message was already written" from
 * "it is still missing", so the message is never duplicated.
 */
const OPENING_MESSAGE_MARKER = "HORIZON case за"
const OPENING_MESSAGE_MARKER_DE = "HORIZON-Fall angelegt"

function openingMessage(input: ProvisionHorizonServiceCaseInput, serviceKind: string, alphaAgent: string): string {
  return input.locale === "de"
    ? `Ich habe deine Anfrage für ${serviceKind} als HORIZON-Fall angelegt. Das Alpha Team (${alphaAgent}) prüft jetzt die Angaben. Bitte kommuniziere weiter in diesem Fall; fehlende Unterlagen werden hier angefordert. Keine externe Aktion erfolgt ohne deine Freigabe.`
    : `Създадох ${OPENING_MESSAGE_MARKER} ${serviceKind}. Alpha Team (${alphaAgent}) ще провери данните и ще поиска липсващите документи тук. Комуникацията продължава в този case; външно действие няма да се извърши без твоето одобрение.`
}

function hasOpeningMessage(messages: readonly CaseMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      (message.content.includes(OPENING_MESSAGE_MARKER) || message.content.includes(OPENING_MESSAGE_MARKER_DE)),
  )
}

/**
 * The provisioning facts, keyed so a retry can top up exactly what is missing.
 *
 * The request-id fact is the idempotency anchor and must always exist. The
 * answer facts are derived from the submitted answers; only keys the case does
 * not already carry are written, so a retry never overwrites a value the user
 * may have edited in the meantime.
 */
function provisioningFacts(
  input: ProvisionHorizonServiceCaseInput,
  alphaAgent: string,
): Array<{ key: string; value: string; critical?: boolean }> {
  return [
    { key: SERVICE_REQUEST_TYPE_FACT, value: input.kind, critical: true },
    { key: SERVICE_REQUEST_ID_FACT, value: input.requestId, critical: true },
    { key: "alpha_team_lead", value: alphaAgent },
    ...Object.entries(input.answers).map(([key, value]) => ({ key: `intake_${key}`, value })),
  ]
}

/**
 * Provision the HORIZON case for a service request, idempotently and repair-safely.
 *
 * The case row and its artifacts (facts, opening message, audit trail, lifecycle)
 * are written by several statements, not one transaction, so a crash can stop the
 * flow between them. This function is therefore written to be re-entrant:
 *
 *  - **The case row is created once.** The request id is bound in the create
 *    insert, and a partial UNIQUE index on (owner_id, service_request_id) makes
 *    that insert the atomic dedup step. Two concurrent requests cannot both
 *    create a case; the loser gets `23505` and recovers the winner's case.
 *
 *  - **Every artifact is repaired on retry, without duplication.** A retry of an
 *    existing case re-reads what is stored and writes only what is missing:
 *    facts are topped up by key, the opening message is written only when no
 *    assistant message with the marker exists, audit entries are appended only
 *    when their action is absent, and the lifecycle advance is forward-only.
 *
 *  - **User data is never overwritten.** Answer facts the case already carries
 *    are left as they are, and no existing fact or message is updated or deleted.
 *
 *  - **Legacy cases are still found.** A case provisioned before the column
 *    existed carries the request id only as a fact; the lookup falls back to it.
 *
 * Both lookups are owner-scoped, so a request id can never reach another user's
 * case.
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

  // Fast path: the case a previous attempt already bound to this request id.
  const existing = await findExistingCase(repository, input.requestId)
  if (existing.error) return { data: null, error: existing.error, reused: false }
  if (existing.data) return finishProvisioning(repository, input, service, existing.data, true)

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
    // index is the guarantee; recover the winner's case (and repair it) instead of
    // failing.
    const raced = await repository.findCaseByServiceRequestId(input.requestId)
    if (raced.error) return { data: null, error: raced.error, reused: false }
    if (raced.data) return finishProvisioning(repository, input, service, raced.data, true)
    // The index rejected the insert but no case is readable: surface the original
    // error rather than looping.
    return { data: null, error: created.error ?? "CASE_CREATE_FAILED", reused: false }
  }
  if (created.error || !created.data) return { data: null, error: created.error ?? "CASE_CREATE_FAILED", reused: false }

  // First attempt: write the artifacts, then finish. A failure at any step is
  // returned so the caller does not treat a half-provisioned case as durable; a
  // retry repairs the missing pieces through the same tail.
  return finishProvisioning(repository, input, service, created.data, false)
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
 * Shared tail for both the first attempt and a retry. It writes only the artifacts
 * that are missing, so it is safe to call on a case that is already complete (it
 * then just re-asserts the lifecycle) and on a case left half-provisioned by an
 * earlier failure (it repairs it). `reused` records whether the case already
 * existed before this call.
 */
async function finishProvisioning(
  repository: CaseEngineRepository,
  input: ProvisionHorizonServiceCaseInput,
  service: ReturnType<typeof getHorizonServiceRequest>,
  caseRow: Case,
  reused: boolean,
): Promise<ProvisionHorizonServiceCaseResult> {
  const caseId = caseRow.id

  // 1. Facts. Read what the case already carries, then write only the missing
  //    keys. On a fresh case nothing exists and the full set is written; on a
  //    retry after a failed `addFacts` only the remainder is written. Existing
  //    values (including any the user edited) are left untouched.
  const existingFacts = await repository.listFacts(caseId)
  if (existingFacts.error) return { data: null, error: existingFacts.error, reused }
  const presentKeys = new Set((existingFacts.data ?? []).map((fact) => fact.key))
  const missingFacts = provisioningFacts(input, service.alphaAgent).filter((fact) => !presentKeys.has(fact.key))
  if (missingFacts.length > 0) {
    const facts = await repository.addFacts(caseId, missingFacts)
    if (facts.error) return { data: null, error: facts.error, reused }
  }

  // 2. Opening message. Written only when no assistant message with the marker is
  //    stored, so a retry after a failed message write repairs it and a retry
  //    after a successful one does not duplicate it. User messages are never
  //    touched.
  const existingMessages = await repository.listMessages(caseId)
  if (existingMessages.error) return { data: null, error: existingMessages.error, reused }
  if (!hasOpeningMessage(existingMessages.data ?? [])) {
    const message = await repository.addMessage(caseId, {
      role: "assistant",
      locale: input.locale,
      content: openingMessage(input, service.kind, service.alphaAgent),
    })
    if (message.error) return { data: null, error: message.error, reused }
  }

  // 3. Audit trail. Append-only, so a retry must not append a second copy of an
  //    event that is already recorded. Missing events are added.
  const existingAudit = await repository.listAudit(caseId)
  if (existingAudit.error) return { data: null, error: existingAudit.error, reused }
  const recordedActions = new Set((existingAudit.data ?? []).map((event) => event.action))
  if (!recordedActions.has("alpha_team_run_created")) {
    await repository.appendAudit(caseId, "alpha_team_run_created", {
      requestId: input.requestId,
      serviceKind: input.kind,
      leadAgent: service.alphaAgent,
      execution: "prepare_draft_and_request_missing_evidence",
      assistantRoute: `/api/horizon/cases/${caseId}/assistant`,
    })
  }
  if (!recordedActions.has("quality_safety_blocked")) {
    await repository.appendAudit(caseId, "quality_safety_blocked", {
      reason: "required_evidence_and_user_confirmation_pending",
      requiredEvidence: service.requiredEvidence,
      externalActions: "blocked_until_human_approval",
    })
  }

  // 4. Lifecycle. Forward-only, so a retry never regresses a case a user has since
  //    moved on. `advanceTo` re-asserts the target and is a no-op when the case is
  //    already at or past it.
  const collecting = await repository.advanceTo(caseId, "collecting_data")
  if (collecting.error) return { data: null, error: collecting.error, reused }
  const waiting = await repository.advanceTo(caseId, "waiting_for_user")
  if (waiting.error) return { data: null, error: waiting.error, reused }
  return { data: waiting.data ?? collecting.data ?? caseRow, error: null, reused }
}
