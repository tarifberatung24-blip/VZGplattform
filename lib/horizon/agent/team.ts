import { randomUUID } from "node:crypto"

export const ALPHA_TEAM_VERSION = "alpha-team-v1"

export const ALPHA_DEPARTMENTS = [
  "conductor",
  "documents",
  "finance",
  "social",
  "communications",
  "operations",
  "quality",
] as const
export type AlphaDepartment = (typeof ALPHA_DEPARTMENTS)[number]

export const AUTONOMY_LEVELS = ["human-led", "human-assisted", "fully-autonomous"] as const
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number]

export type AlphaAgent = {
  id: string
  name: string
  department: AlphaDepartment
  purpose: string
  autonomy: AutonomyLevel
  operations: string[]
  sopId: string
  skillFile: string
}

export type AlphaTaskRequest = {
  objective: string
  caseId?: string
  documentIds?: string[]
  locale?: "bg" | "de"
  /** Internal route signal; never accepted directly from the client. */
  contextValidated?: boolean
}

export type AlphaTaskPlan = {
  version: string
  runId: string
  traceId: string
  objective: string
  department: AlphaDepartment
  leadAgent: AlphaAgent
  supportingAgents: AlphaAgent[]
  steps: string[]
  autonomy: AutonomyLevel
  approvalRequired: boolean
  externalActionBlocked: boolean
  blockers: string[]
}

const AGENTS: AlphaAgent[] = [
  {
    id: "conductor",
    name: "Horizon Conductor",
    department: "conductor",
    purpose: "Classifies a request, selects the smallest safe team and returns an executable plan.",
    autonomy: "human-assisted",
    operations: ["route_task", "assemble_plan", "request_human_review"],
    sopId: "SOP-CONDUCTOR-001",
    skillFile: "skills/conductor/route-task.md",
  },
  {
    id: "document-intake",
    name: "Document Intake Agent",
    department: "documents",
    purpose: "Reads uploaded documents, extracts proposed facts and identifies missing evidence.",
    autonomy: "human-assisted",
    operations: ["read_case", "analyse_user_document", "extract_proposed_facts"],
    sopId: "SOP-DOCUMENTS-001",
    skillFile: "skills/documents/intake-and-extract.md",
  },
  {
    id: "finance-tax",
    name: "Finance & Tax Agent",
    department: "finance",
    purpose: "Explains finance and tax correspondence and prepares reviewable drafts from confirmed facts.",
    autonomy: "human-assisted",
    operations: ["read_case", "analyse_user_document", "draft_content", "propose_next_step"],
    sopId: "SOP-FINANCE-001",
    skillFile: "skills/finance/explain-and-draft.md",
  },
  {
    id: "social-benefits",
    name: "Social Benefits Agent",
    department: "social",
    purpose: "Guides Kindergeld, Jobcenter and Arbeitsagentur workflows without deciding eligibility.",
    autonomy: "human-assisted",
    operations: ["read_case", "analyse_user_document", "extract_proposed_facts", "propose_next_step"],
    sopId: "SOP-SOCIAL-001",
    skillFile: "skills/social/benefits-case.md",
  },
  {
    id: "correspondence",
    name: "Correspondence Agent",
    department: "communications",
    purpose: "Creates bilingual explanations and drafts official German correspondence for review.",
    autonomy: "human-assisted",
    operations: ["read_case", "draft_content", "request_human_review"],
    sopId: "SOP-COMMS-001",
    skillFile: "skills/communications/draft-correspondence.md",
  },
  {
    id: "deadline-monitor",
    name: "Deadline Monitor",
    department: "operations",
    purpose: "Extracts and monitors deterministic dates from confirmed case facts and documents.",
    autonomy: "fully-autonomous",
    operations: ["read_case", "propose_next_step"],
    sopId: "SOP-OPS-001",
    skillFile: "skills/operations/deadline-monitor.md",
  },
  {
    id: "quality-safety",
    name: "Quality & Safety Agent",
    department: "quality",
    purpose: "Checks provenance, missing facts, policy boundaries and approval requirements before handoff.",
    autonomy: "human-assisted",
    operations: ["read_case", "request_human_review", "prepare_external_handoff"],
    sopId: "SOP-QUALITY-001",
    skillFile: "skills/quality/review-and-provenance.md",
  },
]

const KEYWORDS: Array<{ department: AlphaDepartment; terms: string[] }> = [
  { department: "finance", terms: ["finanzamt", "steuer", "elster", "tax", "данък", "данъци", "финанс"] },
  { department: "social", terms: ["jobcenter", "kindergeld", "bürgergeld", "arbeitsagentur", "alg", "помощ", "детски"] },
  { department: "documents", terms: ["document", "документ", "pdf", "сканиран", "ocr", "писмо", "letter"] },
  { department: "communications", terms: ["отговор", "reply", "correspondence", "имейл", "email", "brief", "писмо"] },
  { department: "operations", terms: ["срок", "deadline", "напомни", "reminder", "статус", "status"] },
]

function agent(id: string): AlphaAgent {
  const result = AGENTS.find((item) => item.id === id)
  if (!result) throw new Error(`Unknown Alpha Team agent: ${id}`)
  return result
}

export function listAlphaAgents(): AlphaAgent[] {
  return AGENTS.map((item) => ({ ...item, operations: [...item.operations] }))
}

export function getAlphaTeamManifest() {
  return {
    version: ALPHA_TEAM_VERSION,
    model: "Operator → Conductor → Specialist agents → Quality gate → Human approval",
    departments: ALPHA_DEPARTMENTS,
    autonomyLevels: AUTONOMY_LEVELS,
    agents: listAlphaAgents(),
    invariants: [
      "AI outputs are drafts or proposals with provenance.",
      "The Conductor cannot approve, sign, send or access an authenticated third-party account.",
      "External actions require a separate human-reviewed and customer-approved workflow.",
      "Missing facts are blockers; agents must not invent eligibility, tax results or official responses.",
    ],
  }
}

export function planAlphaTask(request: AlphaTaskRequest): AlphaTaskPlan {
  const objective = request.objective.trim()
  if (!objective) throw new Error("OBJECTIVE_REQUIRED")
  if (objective.length > 2000) throw new Error("OBJECTIVE_TOO_LONG")

  const normalized = objective.toLocaleLowerCase("de-DE")
  const match = KEYWORDS.find(({ terms }) => terms.some((term) => normalized.includes(term)))
  const department = match?.department ?? "documents"
  const leadAgent = agent(
    department === "finance" ? "finance-tax" :
    department === "social" ? "social-benefits" :
    department === "communications" ? "correspondence" :
    department === "operations" ? "deadline-monitor" : "document-intake",
  )
  const supportingAgents = [agent("quality-safety")]
  const locale = request.locale ?? "bg"
  const contextFree = /^(покажи|изброй|list|show|help|помощ|какво можеш|what can you do)/i.test(objective)
  const needsEvidence = !contextFree
  const steps = locale === "de"
    ? [
        "Der Conductor klassifiziert die Aufgabe und lädt nur den autorisierten Fall-/Dokumentkontext.",
        `${leadAgent.name} führt ${leadAgent.sopId} aus und gibt Vorschläge, keine endgültigen Entscheidungen, zurück.`,
        "Der Quality-&-Safety-Agent prüft Herkunft, fehlende Fakten und Grenzen externer Aktionen.",
        "Horizon zeigt das Ergebnis zur Prüfung und verlangt eine Freigabe vor einem externen Handoff.",
      ]
    : [
        "Conductor класифицира задачата и зарежда само разрешения case/document контекст.",
        `${leadAgent.name} изпълнява ${leadAgent.sopId} и връща структурирани предложения, не окончателни решения.`,
        "Quality & Safety Agent проверява provenance, липсващи факти и границите за външно действие.",
        "Horizon показва резултата за преглед и изисква одобрение преди подготовка на външен handoff.",
      ]
  const runId = randomUUID()
  return {
    version: ALPHA_TEAM_VERSION,
    runId,
    traceId: runId,
    objective,
    department,
    leadAgent,
    supportingAgents,
    steps,
    autonomy: leadAgent.autonomy,
    approvalRequired: true,
    externalActionBlocked: true,
    blockers: needsEvidence && !request.contextValidated
      ? ["CASE_OR_DOCUMENT_CONTEXT_REQUIRED_BEFORE_EXECUTION"]
      : [],
  }
}
