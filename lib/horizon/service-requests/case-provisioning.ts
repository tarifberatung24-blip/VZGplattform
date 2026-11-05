import type { CaseEngineRepository } from "@/lib/horizon/case/repository"
import type { Case } from "@/lib/horizon/case/contract"
import { getHorizonServiceRequest, isHorizonServiceRequestKind, type HorizonServiceKind } from "./catalog"
import { SERVICE_REQUEST_TYPE_FACT } from "./registry"

export type ProvisionHorizonServiceCaseInput = {
  kind: HorizonServiceKind
  locale: "bg" | "de"
  requestId: string
  customerName: string
  customerEmail: string
  answers: Record<string, string>
}

export async function provisionHorizonServiceCase(
  repository: CaseEngineRepository,
  input: ProvisionHorizonServiceCaseInput,
): Promise<{ data: Case | null; error: string | null }> {
  if (!isHorizonServiceRequestKind(input.kind)) return { data: null, error: "UNKNOWN_HORIZON_SERVICE" }
  const service = getHorizonServiceRequest(input.kind)
  const title = input.locale === "de"
    ? `${service.kind} — Alpha Team Fall`
    : `${service.kind} — Alpha Team case`

  const created = await repository.createCase({
    title,
    module: "general",
    intent: "application",
    uiLocale: input.locale,
    conversationLocale: input.locale,
  })
  if (created.error || !created.data) return { data: null, error: created.error ?? "CASE_CREATE_FAILED" }
  const caseId = created.data.id

  const answerFacts = Object.entries(input.answers).map(([key, value]) => ({
    key: `intake_${key}`,
    value,
    critical: false,
  }))
  const facts = await repository.addFacts(caseId, [
    { key: SERVICE_REQUEST_TYPE_FACT, value: input.kind, critical: true },
    { key: "alpha_team_lead", value: service.alphaAgent },
    { key: "service_request_id", value: input.requestId },
    ...answerFacts,
  ])
  if (facts.error) return { data: null, error: facts.error }

  const initial = input.locale === "de"
    ? `Ich habe deine Anfrage für ${service.kind} als HORIZON-Fall angelegt. Das Alpha Team (${service.alphaAgent}) prüft jetzt die Angaben. Bitte kommuniziere weiter in diesem Fall; fehlende Unterlagen werden hier angefordert. Keine externe Aktion erfolgt ohne deine Freigabe.`
    : `Създадох HORIZON case за ${service.kind}. Alpha Team (${service.alphaAgent}) ще провери данните и ще поиска липсващите документи тук. Комуникацията продължава в този case; външно действие няма да се извърши без твоето одобрение.`
  const message = await repository.addMessage(caseId, { role: "assistant", locale: input.locale, content: initial })
  if (message.error) return { data: null, error: message.error }

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
  if (collecting.error) return { data: null, error: collecting.error }
  const waiting = await repository.advanceTo(caseId, "waiting_for_user")
  if (waiting.error) return { data: null, error: waiting.error }
  return { data: waiting.data ?? collecting.data ?? created.data, error: null }
}
