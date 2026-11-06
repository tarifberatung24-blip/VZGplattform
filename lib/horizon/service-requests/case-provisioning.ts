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
 * A partial failure after `createCase` (a later `addFacts`/`addMessage`/`advanceTo`
 * error) would otherwise leave the request unlinked, so a retry would create a
 * duplicate. The link fact is therefore written with the first batch of facts,
 * and every later attempt looks it up before creating anything. The lookup is a
 * targeted query on `extracted_facts` (owner-scoped, `limit 1`), so a retry that
 * arrives long after the first attempt still reuses the same case rather than
 * scanning a bounded list of recent cases. Matching is scoped to the acting owner,
 * so a request id cannot reach another user's case.
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

  // Idempotency guard: reuse the case a previous attempt already linked. The fact
  // key is the same string older attempts wrote, so a legacy request is found too.
  const existing = await repository.findCaseByFact(SERVICE_REQUEST_ID_FACT, input.requestId)
  if (existing.error) return { data: null, error: existing.error, reused: false }
  if (existing.data) {
    // A previous attempt may have stopped after the facts were written but before
    // the case reached `waiting_for_user`. Advancement is forward-only, so this is
    // a no-op once the case is already at or past the target and never regresses
    // a case a user has since moved on.
    const completed = await repository.advanceTo(existing.data.id, "waiting_for_user")
    if (completed.error) return { data: null, error: completed.error, reused: false }
    return { data: completed.data ?? existing.data, error: null, reused: true }
  }

  const created = await repository.createCase({
    title,
    module: "general",
    intent: "application",
    uiLocale: input.locale,
    conversationLocale: input.locale,
  })
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
