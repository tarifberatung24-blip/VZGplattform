import {
  HORIZON_CASE_ACTIONS,
  HORIZON_CASE_STATUSES,
  type HorizonCaseAction,
  type HorizonCaseStatus,
} from "./contract"

/** Kept verbatim so the adapter cannot drift from the `cases.status` CHECK constraint. */
export const LEGACY_CASE_STATUSES = [
  "NEW",
  "UPLOADED",
  "EXTRACTING",
  "NEEDS_INFO",
  "DRAFTING",
  "NEEDS_CONFIRMATION",
  "APPROVED",
  "EXPORTED",
  "SENT",
  "WAITING_REPLY",
  "ACTION_REQUIRED",
  "CLOSED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "HUMAN_REVIEW",
] as const

export type LegacyCaseStatus = (typeof LEGACY_CASE_STATUSES)[number]

const toLegacy: Record<HorizonCaseStatus, LegacyCaseStatus> = {
  draft: "NEW",
  collecting_data: "UPLOADED",
  waiting_for_user: "NEEDS_INFO",
  processing: "DRAFTING",
  draft_ready: "NEEDS_CONFIRMATION",
  review: "HUMAN_REVIEW",
  approved: "APPROVED",
  action_ready: "EXPORTED",
  completed: "CLOSED",
  cancelled: "CLOSED",
}

/**
 * `CLOSED` is ambiguous and resolves to `completed`; `FAILED_*` are terminal
 * without a deliverable, so they resolve to `cancelled`. This direction is only
 * used for rows that predate `horizon_status`.
 */
const fromLegacy: Record<LegacyCaseStatus, HorizonCaseStatus> = {
  NEW: "draft",
  UPLOADED: "collecting_data",
  EXTRACTING: "processing",
  NEEDS_INFO: "waiting_for_user",
  DRAFTING: "processing",
  NEEDS_CONFIRMATION: "draft_ready",
  APPROVED: "approved",
  EXPORTED: "action_ready",
  SENT: "action_ready",
  WAITING_REPLY: "action_ready",
  ACTION_REQUIRED: "waiting_for_user",
  CLOSED: "completed",
  FAILED_RETRYABLE: "cancelled",
  FAILED_FINAL: "cancelled",
  HUMAN_REVIEW: "review",
}

export function isHorizonCaseStatus(value: unknown): value is HorizonCaseStatus {
  return typeof value === "string" && (HORIZON_CASE_STATUSES as readonly string[]).includes(value)
}

export function isHorizonCaseAction(value: unknown): value is HorizonCaseAction {
  return typeof value === "string" && (HORIZON_CASE_ACTIONS as readonly string[]).includes(value)
}

export function toLegacyStatus(status: HorizonCaseStatus): LegacyCaseStatus {
  return toLegacy[status]
}

export function fromLegacyStatus(status: LegacyCaseStatus): HorizonCaseStatus {
  return fromLegacy[status]
}

/** Canonical rows carry `horizon_status`; older rows are mapped on read. */
export function resolveCaseStatus(row: {
  horizon_status?: string | null
  status?: string | null
}): HorizonCaseStatus {
  if (isHorizonCaseStatus(row.horizon_status)) return row.horizon_status
  if (typeof row.status === "string" && row.status in fromLegacy) {
    return fromLegacy[row.status as LegacyCaseStatus]
  }
  return "draft"
}

const transitions: Record<HorizonCaseStatus, Partial<Record<HorizonCaseAction, HorizonCaseStatus>>> = {
  draft: {
    start_collecting: "collecting_data",
    request_user_input: "waiting_for_user",
    start_processing: "processing",
    cancel: "cancelled",
  },
  collecting_data: {
    user_input_received: "processing",
    start_processing: "processing",
    request_user_input: "waiting_for_user",
    mark_draft_ready: "draft_ready",
    cancel: "cancelled",
  },
  waiting_for_user: {
    user_input_received: "collecting_data",
    start_processing: "processing",
    mark_draft_ready: "draft_ready",
    cancel: "cancelled",
  },
  processing: {
    request_user_input: "waiting_for_user",
    mark_draft_ready: "draft_ready",
    cancel: "cancelled",
  },
  draft_ready: {
    submit_for_review: "review",
    start_processing: "processing",
    approve: "approved",
    cancel: "cancelled",
  },
  review: {
    approve: "approved",
    return_to_draft: "draft_ready",
    request_user_input: "waiting_for_user",
    cancel: "cancelled",
  },
  approved: {
    mark_action_ready: "action_ready",
    return_to_draft: "draft_ready",
    cancel: "cancelled",
  },
  action_ready: {
    complete: "completed",
    return_to_draft: "draft_ready",
    cancel: "cancelled",
  },
  completed: { reopen: "collecting_data" },
  cancelled: { reopen: "draft" },
}

export function nextCaseStatus(
  status: HorizonCaseStatus,
  action: HorizonCaseAction,
): HorizonCaseStatus | null {
  return transitions[status][action] ?? null
}

export function canApplyCaseAction(status: HorizonCaseStatus, action: HorizonCaseAction): boolean {
  return nextCaseStatus(status, action) !== null
}

export function allowedCaseActions(status: HorizonCaseStatus): HorizonCaseAction[] {
  return HORIZON_CASE_ACTIONS.filter((action) => canApplyCaseAction(status, action))
}

export function isTerminalCaseStatus(status: HorizonCaseStatus): boolean {
  return status === "completed" || status === "cancelled"
}