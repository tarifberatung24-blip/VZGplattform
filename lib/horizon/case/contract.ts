export const CASE_MODULES = [
  "agentur_fuer_arbeit",
  "jobcenter",
  "kuendigung",
  "steuererklaerung",
  "unterlagen_erklaeren",
  "contract_management",
  "general",
] as const

export type CaseModule = (typeof CASE_MODULES)[number]

export const HORIZON_CASE_STATUSES = [
  "draft",
  "collecting_data",
  "waiting_for_user",
  "processing",
  "draft_ready",
  "review",
  "approved",
  "action_ready",
  "completed",
  "cancelled",
] as const

export type HorizonCaseStatus = (typeof HORIZON_CASE_STATUSES)[number]

export const HORIZON_CASE_ACTIONS = [
  "start_collecting",
  "request_user_input",
  "user_input_received",
  "start_processing",
  "mark_draft_ready",
  "submit_for_review",
  "return_to_draft",
  "approve",
  "mark_action_ready",
  "complete",
  "cancel",
  "reopen",
] as const

export type HorizonCaseAction = (typeof HORIZON_CASE_ACTIONS)[number]

export type Case = {
  id: string
  ownerId: string
  module: CaseModule
  status: HorizonCaseStatus
  title: string
  intent: string
  uiLocale: string
  conversationLocale: string
  institution: string | null
  deadline: string | null
  createdAt: string
}

export type CaseSourceDocument = {
  id: string
  caseId: string
  path: string
  mime: string
  sizeBytes: number
  sha256: string
  status: "UPLOADED" | "EXTRACTING" | "READY" | "NEEDS_CONFIRMATION" | "FAILED"
  createdAt: string
}

export type ExtractedFact = {
  id: string
  caseId: string
  documentId: string | null
  pageNo: number | null
  key: string
  value: string
  evidence: string | null
  sourceType: "document" | "user"
  confidence: number | null
  critical: boolean
  confirmedAt: string | null
  createdAt: string
}

export type CaseMessage = {
  id: string
  caseId: string
  role: "user" | "assistant"
  locale: string
  content: string
  createdAt: string
}

export const DRAFT_REVIEW_STATUSES = ["pending", "pass", "revise", "block"] as const
export type DraftReviewStatus = (typeof DRAFT_REVIEW_STATUSES)[number]

export type CaseDraft = {
  id: string
  caseId: string
  version: number
  subject: string
  body: string
  recipient: string | null
  contentHash: string
  reviewStatus: DraftReviewStatus
  createdAt: string
}

export type CaseApproval = {
  id: string
  caseId: string
  draftId: string
  approvedHash: string
  approvedAt: string
}

export type CaseTask = {
  id: string
  caseId: string
  type: "reminder" | "human_review"
  dueAt: string | null
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  createdAt: string
}

export type CaseAuditEvent = {
  id: string
  caseId: string | null
  action: string
  metadata: Record<string, unknown>
  createdAt: string
}

/** Derived from fact confirmation so it cannot drift from the facts it describes. */
export type MissingInformation = {
  missingFactKeys: string[]
  unconfirmedCriticalFactKeys: string[]
  complete: boolean
}