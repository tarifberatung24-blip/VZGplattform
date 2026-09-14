export const workplaceStatuses = [
  "NEW",
  "UNDERSTANDING",
  "NEEDS_INFO",
  "READY_FOR_DRAFT",
  "DRAFT_READY",
  "USER_REVIEW",
  "APPROVED",
  "READY_TO_EXPORT",
  "READY_TO_SEND",
  "SENT",
  "WAITING_FOR_REPLY",
  "COMPLETED",
  "ARCHIVED",
  "REJECTED",
] as const

export type WorkplaceStatus = (typeof workplaceStatuses)[number]

export type WorkplaceAction =
  | "START_REVIEW"
  | "ANSWER_QUESTIONS"
  | "PREPARE_DRAFT"
  | "REVIEW_DRAFT"
  | "APPROVE_DRAFT"
  | "EXPORT"
  | "SEND"
  | "MARK_COMPLETE"
  | "ARCHIVE"
  | "REOPEN"

const transitions: Record<WorkplaceStatus, Partial<Record<WorkplaceAction, WorkplaceStatus>>> = {
  NEW: { START_REVIEW: "UNDERSTANDING", ARCHIVE: "ARCHIVED" },
  UNDERSTANDING: { ANSWER_QUESTIONS: "NEEDS_INFO", PREPARE_DRAFT: "READY_FOR_DRAFT", ARCHIVE: "ARCHIVED" },
  NEEDS_INFO: { ANSWER_QUESTIONS: "READY_FOR_DRAFT", ARCHIVE: "ARCHIVED" },
  READY_FOR_DRAFT: { PREPARE_DRAFT: "DRAFT_READY", ARCHIVE: "ARCHIVED" },
  DRAFT_READY: { REVIEW_DRAFT: "USER_REVIEW", ARCHIVE: "ARCHIVED" },
  USER_REVIEW: { APPROVE_DRAFT: "APPROVED", REOPEN: "DRAFT_READY", ARCHIVE: "ARCHIVED" },
  APPROVED: { EXPORT: "READY_TO_EXPORT", SEND: "READY_TO_SEND", REOPEN: "DRAFT_READY", ARCHIVE: "ARCHIVED" },
  READY_TO_EXPORT: { EXPORT: "SENT", REOPEN: "DRAFT_READY", ARCHIVE: "ARCHIVED" },
  READY_TO_SEND: { SEND: "SENT", REOPEN: "DRAFT_READY", ARCHIVE: "ARCHIVED" },
  SENT: { MARK_COMPLETE: "COMPLETED", ARCHIVE: "ARCHIVED" },
  WAITING_FOR_REPLY: { MARK_COMPLETE: "COMPLETED", ARCHIVE: "ARCHIVED" },
  COMPLETED: { ARCHIVE: "ARCHIVED", REOPEN: "UNDERSTANDING" },
  ARCHIVED: { REOPEN: "UNDERSTANDING" },
  REJECTED: { REOPEN: "UNDERSTANDING", ARCHIVE: "ARCHIVED" },
}

export function getNextWorkplaceStatus(status: WorkplaceStatus, action: WorkplaceAction): WorkplaceStatus | null {
  return transitions[status][action] ?? null
}

export function canTransitionWorkplace(status: WorkplaceStatus, action: WorkplaceAction): boolean {
  return getNextWorkplaceStatus(status, action) !== null
}

export type WorkplaceBlocker = {
  code: "UNCONFIRMED_FACTS" | "MISSING_DOCUMENT" | "MISSING_INFO" | "NO_APPROVAL"
  label: string
}

export function getWorkplaceNextAction(status: WorkplaceStatus, blockers: WorkplaceBlocker[] = []) {
  if (blockers.length > 0) {
    return { action: "ANSWER_QUESTIONS" as const, label: "Отговори на липсващите въпроси", blockers }
  }
  if (status === "NEW" || status === "UNDERSTANDING") return { action: "START_REVIEW" as const, label: "Прегледай случая", blockers }
  if (status === "READY_FOR_DRAFT") return { action: "PREPARE_DRAFT" as const, label: "Подготви чернова", blockers }
  if (status === "DRAFT_READY") return { action: "REVIEW_DRAFT" as const, label: "Провери черновата", blockers }
  if (status === "USER_REVIEW") return { action: "APPROVE_DRAFT" as const, label: "Одобри текста", blockers }
  if (status === "APPROVED") return { action: "EXPORT" as const, label: "Избери export или изпращане", blockers }
  if (status === "SENT") return { action: "MARK_COMPLETE" as const, label: "Маркирай случая като приключен", blockers }
  return { action: "ARCHIVE" as const, label: "Архивирай случая", blockers }
}
