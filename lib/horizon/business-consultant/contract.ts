/**
 * HORIZON Business Consultant — vocabulary and contracts.
 *
 * The Business Consultant is an extension of the owner-approved Business Profile
 * MVP. It does not add a second AI pipeline or a second execution engine: the
 * diagnosis runs through the existing model registry, the specialist agents run
 * through the merged Agent Runs Engine, and every persistent row references the
 * existing business profile, case and document entities by id.
 *
 * Two boundaries are structural, not prompt-level:
 * - Every finding carries an `EvidenceClass`. There is no shape in which a
 *   finding can be stored without declaring where it came from, so an AI
 *   assumption can never be presented as a verified fact.
 * - The playbook action status is user-driven. The consultant proposes; only the
 *   owner completes, postpones or rejects an action.
 */

/** Where a finding or figure came from. Closed list — never a free string. */
export const EVIDENCE_CLASSES = [
  /** Read directly from an uploaded document the owner provided. */
  "verified_fact",
  /** Stated by the owner in the profile or an entry. */
  "user_provided",
  /** Produced by the model. Never presented as fact. */
  "ai_assumption",
  /** Requires a qualified professional or an external check. */
  "requires_external_verification",
  /** A suggested next step, not a statement about the business. */
  "recommendation",
] as const
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number]

export function isEvidenceClass(value: unknown): value is EvidenceClass {
  return typeof value === "string" && (EVIDENCE_CLASSES as readonly string[]).includes(value)
}

/** Sections of a diagnosis. Each holds findings with their own evidence class. */
export const DIAGNOSIS_SECTIONS = [
  "overview",
  "strengths",
  "weaknesses",
  "bottlenecks",
  "administrative_inefficiencies",
  "cost_opportunities",
  "revenue_opportunities",
  "digitalization",
  "risks",
  "missing_information",
  "recommendations",
] as const
export type DiagnosisSection = (typeof DIAGNOSIS_SECTIONS)[number]

export type DiagnosisFinding = {
  section: DiagnosisSection
  statement: string
  evidenceClass: EvidenceClass
  /** References to the inputs the statement rests on, when there are any. */
  references: RunReference[]
}

export type BusinessDiagnosisContent = {
  findings: DiagnosisFinding[]
  /** Inputs the diagnosis was built from, for provenance. */
  inputReferences: RunReference[]
  /** Facts the profile did not supply, so the UI can ask rather than guess. */
  missingInformation: string[]
}

/** A reference to an existing HORIZON entity. Never content. */
export type RunReference =
  | { kind: "business_profile"; id: string }
  | { kind: "document"; id: string }
  | { kind: "case"; id: string }
  | { kind: "finance_entry"; id: string }

export const PLAYBOOK_HORIZONS = [30, 60, 90] as const
export type PlaybookHorizon = (typeof PLAYBOOK_HORIZONS)[number]

export const PLAYBOOK_ACTION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "postponed",
  "rejected",
] as const
export type PlaybookActionStatus = (typeof PLAYBOOK_ACTION_STATUSES)[number]

export const PLAYBOOK_PRIORITIES = ["low", "medium", "high"] as const
export type PlaybookPriority = (typeof PLAYBOOK_PRIORITIES)[number]

export type PlaybookAction = {
  id: string
  profileId: string
  horizon: PlaybookHorizon
  actionKey: string
  title: string
  description: string
  priority: PlaybookPriority
  effort: PlaybookPriority
  expectedBenefit: string
  requiredDocuments: string[]
  dependencies: string[]
  deadline: string | null
  responsible: "user" | "horizon" | "partner"
  approvalRequired: boolean
  status: PlaybookActionStatus
  postponedUntil: string | null
  evidenceClass: EvidenceClass
}

/** The actions a user may perform on their own action. Complete/postpone/reject. */
export const PLAYBOOK_USER_ACTIONS = ["start", "complete", "postpone", "reject", "reopen"] as const
export type PlaybookUserAction = (typeof PLAYBOOK_USER_ACTIONS)[number]

/**
 * The allowed status transitions. Forward-only where it matters: a completed
 * action is not silently re-openable by a stale request, and the consultant never
 * completes an action on the user's behalf.
 *
 * This is the single definition. The server enforces it, and the UI reads it to
 * decide which buttons to show, so the two cannot drift into offering a button the
 * server refuses. Both the server and the database re-check, so hiding a button is
 * a convenience, never the boundary.
 */
export function nextActionStatus(
  current: PlaybookActionStatus,
  action: PlaybookUserAction,
): PlaybookActionStatus | null {
  if (action === "start" && current === "pending") return "in_progress"
  if (action === "complete" && (current === "pending" || current === "in_progress")) return "completed"
  if (action === "postpone" && (current === "pending" || current === "in_progress")) return "postponed"
  if (action === "reject" && current !== "completed") return "rejected"
  if (action === "reopen" && (current === "postponed" || current === "rejected")) return "pending"
  return null
}

/** Whether a user action is available for a status. Derived, never a second table. */
export function isActionAvailable(current: PlaybookActionStatus, action: PlaybookUserAction): boolean {
  return nextActionStatus(current, action) !== null
}

export const BUSINESS_DOCUMENT_CATEGORIES = [
  "gewerbeanmeldung",
  "tax",
  "invoice",
  "contract",
  "insurance",
  "supplier",
  "bank_statement",
  "e_invoice",
  "other",
] as const
export type BusinessDocumentCategory = (typeof BUSINESS_DOCUMENT_CATEGORIES)[number]

export type BusinessDocumentLink = {
  id: string
  profileId: string
  documentId: string
  caseId: string | null
  category: BusinessDocumentCategory
  expiresOn: string | null
  renewalOn: string | null
  summary: string | null
}

export const FINANCE_KINDS = ["revenue", "expense"] as const
export type FinanceKind = (typeof FINANCE_KINDS)[number]

export const FINANCE_CATEGORIES = [
  "revenue_sales",
  "revenue_services",
  "revenue_other",
  "expense_personnel",
  "expense_materials",
  "expense_rent",
  "expense_insurance",
  "expense_software",
  "expense_travel",
  "expense_tax_advice",
  "expense_other",
] as const
export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number]

export const FINANCE_SOURCES = ["manual", "document", "invoice"] as const
export type FinanceSource = (typeof FINANCE_SOURCES)[number]

export type FinanceEntry = {
  id: string
  profileId: string
  documentId: string | null
  kind: FinanceKind
  category: FinanceCategory
  amountCents: number
  currency: "EUR"
  periodMonth: string
  description: string
  recurring: boolean
  source: FinanceSource
  evidenceClass: EvidenceClass
}

/** The result shape used by the service layer, mirroring the case engine. */
export type ConsultantResult<T> = { data: T | null; error: string | null; code?: string | null }

export const ok = <T>(data: T): ConsultantResult<T> => ({ data, error: null, code: null })
export const fail = <T>(error: string, code?: string | null): ConsultantResult<T> => ({
  data: null,
  error,
  code: code ?? null,
})

/** Bounded, so a malformed input cannot turn into unbounded work. */
export const MAX_FINDINGS = 40
export const MAX_MISSING_INFORMATION = 20
export const MAX_ACTIONS_PER_HORIZON = 8
export const MAX_DIAGNOSIS_STATEMENT_LENGTH = 400
export const MAX_FINANCE_ENTRIES = 500
export const MAX_LIST_ITEM_LENGTH = 120
