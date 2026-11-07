import {
  evaluateHorizonAgentOperation,
  type HorizonAgentOperation,
} from "../agent/safety"
import { getAlphaSkillContracts } from "../agent/skills"
import { listAlphaAgents, type AlphaAgent } from "../agent/team"
import { fail, ok, type ConsultantResult, type RunReference } from "./contract"

/**
 * HORIZON Business Consultant — specialist agent registry.
 *
 * The six Business Consultant specialists are *not* a second agent system. Each
 * one is bound to an existing Alpha Team agent and its registered SOP contract,
 * and each declares the single set of HORIZON operations it is allowed to ask
 * for. Permissions are separated by construction:
 *
 * - the registry is the closed list of who may do what;
 * - every operation is re-checked against `evaluateHorizonAgentOperation` at
 *   resolution time, so a registry entry that names a gated operation cannot
 *   slip it past the safety policy;
 * - no specialist is granted `send_external`, `sign_or_accept_contract` or
 *   `access_authenticated_account`, and the safety gate denies them anyway.
 *
 * This is what "clearly separated permissions" means here: not a description in
 * a prompt, but a table the code reads and a gate the code consults.
 */

export const BUSINESS_SPECIALISTS = [
  "business-analyst",
  "document",
  "contract",
  "finance-operations",
  "administration",
  "compliance",
] as const
export type BusinessSpecialistId = (typeof BUSINESS_SPECIALISTS)[number]

export type BusinessSpecialist = {
  id: BusinessSpecialistId
  name: { bg: string; de: string }
  responsibility: { bg: string; de: string }
  /** The existing Alpha Team agent this specialist runs as. */
  alphaAgentId: string
  /** The registered SOP contract version, read from the Alpha Team skills module. */
  sopId: string
  skillVersion: string
  /** The operations this specialist may request. Closed, deny-by-default. */
  operations: readonly HorizonAgentOperation[]
  /** What this specialist must never do, for the operator console. */
  refusals: readonly string[]
}

/**
 * The registry. `operations` are a subset of the bound Alpha Team agent's own
 * operations, so a specialist can never claim more than its SOP allows. The
 * capability ceiling is the bound agent; the role separation is the specialist id.
 *
 * `quality-safety` deliberately keeps its `prepare_external_handoff` capability
 * OUT of every specialist's list: the safety gate denies that operation without
 * human-review and customer-approval evidence, and a specialist must not hold it
 * as a standing right.
 */
export const SPECIALIST_REGISTRY: readonly BusinessSpecialist[] = [
  {
    id: "business-analyst",
    name: { bg: "Бизнес анализатор", de: "Business-Analyst" },
    responsibility: {
      bg: "Диагноза, силни и слаби страни, стратегически препоръки.",
      de: "Diagnose, Stärken und Schwächen, strategische Empfehlungen.",
    },
    // Bound to the Alpha Team agent whose SOP carries the analysis capability set.
    alphaAgentId: "finance-tax",
    sopId: "SOP-FINANCE-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "analyse_user_document", "propose_next_step"],
    refusals: ["eligibility guarantee", "financial forecast presented as fact"],
  },
  {
    id: "document",
    name: { bg: "Документен агент", de: "Dokumenten-Agent" },
    responsibility: {
      bg: "Класификация, извличане, липсващи документи, резюмета.",
      de: "Klassifikation, Extraktion, fehlende Unterlagen, Zusammenfassungen.",
    },
    alphaAgentId: "document-intake",
    sopId: "SOP-DOCUMENTS-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "analyse_user_document", "extract_proposed_facts"],
    refusals: ["document outside the validated case", "unconfirmed fact presented as confirmed"],
  },
  {
    id: "contract",
    name: { bg: "Договорен агент", de: "Vertrags-Agent" },
    responsibility: {
      bg: "Извличане на данни от договори, срокове за прекратяване, сравнение.",
      de: "Vertragsdaten extrahieren, Kündigungsfristen, Vergleich.",
    },
    alphaAgentId: "document-intake",
    sopId: "SOP-DOCUMENTS-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "analyse_user_document", "extract_proposed_facts"],
    refusals: ["cancellation sent automatically", "inferred deadline"],
  },
  {
    id: "finance-operations",
    name: { bg: "Финансов агент", de: "Finanz-Agent" },
    responsibility: {
      bg: "Категоризиране на разходи, паричен поток, обобщения по наличните данни.",
      de: "Ausgaben kategorisieren, Cashflow, Zusammenfassungen aus vorhandenen Daten.",
    },
    alphaAgentId: "finance-tax",
    sopId: "SOP-FINANCE-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "analyse_user_document", "draft_content", "propose_next_step"],
    refusals: ["tax advice", "invented figure", "external filing"],
  },
  {
    id: "administration",
    name: { bg: "Административен агент", de: "Verwaltungs-Agent" },
    responsibility: {
      bg: "Подготовка на административни задачи, следене на срокове, координация.",
      de: "Verwaltungsaufgaben vorbereiten, Fristen überwachen, Koordination.",
    },
    alphaAgentId: "deadline-monitor",
    sopId: "SOP-OPS-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "propose_next_step"],
    refusals: ["inferred date", "external transmission"],
  },
  {
    id: "compliance",
    name: { bg: "Съответствие", de: "Compliance-Assistent" },
    responsibility: {
      bg: "Идентифициране на възможни регулаторни изисквания и нужда от специалист.",
      de: "Mögliche regulatorische Anforderungen und Bedarf an Fachleuten erkennen.",
    },
    alphaAgentId: "quality-safety",
    sopId: "SOP-QUALITY-001",
    skillVersion: "1.0.0",
    operations: ["read_case", "request_human_review"],
    refusals: ["legal determination", "tax determination", "autonomous external action"],
  },
]

export type ResolvedSpecialist = BusinessSpecialist & {
  /** The Alpha Team agent and its live SOP contract, re-read at resolve time. */
  alphaAgent: AlphaAgent
  contractVersion: string
}

/**
 * Resolves a specialist, verifying at resolve time that:
 *   1. it names a real Business Consultant specialist;
 *   2. the Alpha Team agent it claims is still registered;
 *   3. the SOP contract version still matches what the skills module declares;
 *   4. every operation it lists is permitted by the safety gate.
 *
 * Any mismatch fails closed, so a stale registry entry cannot execute against a
 * changed policy or a renamed agent.
 */
export function resolveSpecialist(id: string): ConsultantResult<ResolvedSpecialist> {
  const specialist = SPECIALIST_REGISTRY.find((entry) => entry.id === id)
  if (!specialist) return fail("UNKNOWN_SPECIALIST", "UNKNOWN_SPECIALIST")

  const agents = listAlphaAgents()
  const alphaAgent = agents.find((agent) => agent.id === specialist.alphaAgentId)
  if (!alphaAgent) return fail("SPECIALIST_AGENT_NOT_REGISTERED", "SPECIALIST_AGENT_NOT_REGISTERED")

  const [contract] = getAlphaSkillContracts([alphaAgent])
  if (!contract) return fail("SPECIALIST_CONTRACT_NOT_FOUND", "SPECIALIST_CONTRACT_NOT_FOUND")
  if (contract.sopId !== specialist.sopId) {
    return fail("SPECIALIST_SOP_MISMATCH", "SPECIALIST_SOP_MISMATCH")
  }
  // The declared skill version must match the live contract, so the registry
  // cannot silently drift from the SOP the Alpha Team actually publishes.
  if (contract.version !== specialist.skillVersion) {
    return fail("SPECIALIST_SKILL_VERSION_MISMATCH", "SPECIALIST_SKILL_VERSION_MISMATCH")
  }

  // Every operation must be one the bound agent's SOP declares AND one the safety
  // policy permits for an agent to request.
  for (const operation of specialist.operations) {
    if (!alphaAgent.operations.includes(operation)) {
      return fail("SPECIALIST_OPERATION_OUT_OF_SOP", "SPECIALIST_OPERATION_OUT_OF_SOP")
    }
    const decision = evaluateHorizonAgentOperation({ operation })
    if (!decision.allowed) {
      return fail("SPECIALIST_OPERATION_DENIED", "SPECIALIST_OPERATION_DENIED")
    }
  }

  return ok({ ...specialist, alphaAgent, contractVersion: contract.version })
}

/** The operator-console view: who exists, what they may do, what they must not. */
export function listBusinessSpecialists(): Array<{
  id: BusinessSpecialistId
  alphaAgentId: string
  operations: readonly HorizonAgentOperation[]
  refusals: readonly string[]
}> {
  return SPECIALIST_REGISTRY.map((entry) => ({
    id: entry.id,
    alphaAgentId: entry.alphaAgentId,
    operations: entry.operations,
    refusals: entry.refusals,
  }))
}

/**
 * The objective a run for a specialist is created with. Deterministic, so the
 * Agent Runs Engine's Conductor routing reproduces the same lead agent.
 */
export function specialistObjective(input: {
  specialist: BusinessSpecialistId
  businessName: string
  focus?: string
}): string {
  const label = SPECIALIST_REGISTRY.find((entry) => entry.id === input.specialist)?.id ?? input.specialist
  const focus = input.focus?.trim().slice(0, 200) ?? ""
  return [
    `Business Consultant task (${label})`,
    `Betrieb: ${input.businessName.slice(0, 120)}`,
    focus ? `Fokus: ${focus}` : "",
  ]
    .filter(Boolean)
    .join(" — ")
}

/** The input references a specialist run carries, so provenance is explicit. */
export function specialistReferences(input: {
  profileId: string
  documentIds?: readonly string[]
}): RunReference[] {
  return [
    { kind: "business_profile", id: input.profileId },
    ...(input.documentIds ?? []).map((id) => ({ kind: "document" as const, id })),
  ]
}
