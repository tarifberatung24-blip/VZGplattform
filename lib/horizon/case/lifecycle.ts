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

/**
 * Progress order used for automatic advancement.
 *
 * Only one direction is meaningful for an automatic advance: a case moves on
 * when new evidence appears, and never slides back because bookkeeping ran.
 * `cancelled` sorts last so a cancelled case is never auto-advanced out of its
 * terminal state, and `completed` cannot be reached by an event path.
 */
const STATUS_RANK: Record<HorizonCaseStatus, number> = {
  draft: 0,
  collecting_data: 1,
  waiting_for_user: 1,
  processing: 2,
  draft_ready: 3,
  review: 4,
  approved: 5,
  action_ready: 6,
  completed: 7,
  cancelled: 8,
}

export function statusRank(status: HorizonCaseStatus): number {
  return STATUS_RANK[status]
}

/**
 * The status each engine event should leave the case in.
 *
 * These are the only statuses the application advances to automatically. Kept
 * here, next to the transition table, so a wiring mistake is a compile error and
 * so a test can prove every target is reachable from a freshly created case.
 */
export const CASE_ADVANCE_TARGETS = {
  intake: "collecting_data",
  draftSaved: "draft_ready",
  approved: "approved",
  sent: "action_ready",
} as const satisfies Record<string, HorizonCaseStatus>

/**
 * The action sequence that moves a case from `from` to `to`, or null when no
 * forward path exists.
 *
 * Walks the declared transition table breadth-first instead of hard-coding a
 * path, so the table stays the single source of truth: adding or removing an
 * edge changes the answer here with no second edit. A move that does not go
 * forward (`statusRank(to) <= statusRank(from)`) is refused, which is what keeps
 * an automatic advance from regressing a case that has already moved on — for
 * example re-saving a draft after a successful send must not undo `action_ready`.
 * `cancelled` is never used as an intermediate step.
 */
export function caseAdvancePath(
  from: HorizonCaseStatus,
  to: HorizonCaseStatus,
): HorizonCaseAction[] | null {
  if (from === to) return []
  if (statusRank(to) <= statusRank(from)) return null

  const queue: Array<{ status: HorizonCaseStatus; path: HorizonCaseAction[] }> = [
    { status: from, path: [] },
  ]
  const seen = new Set<HorizonCaseStatus>([from])

  while (queue.length > 0) {
    const current = queue.shift() as { status: HorizonCaseStatus; path: HorizonCaseAction[] }
    for (const action of HORIZON_CASE_ACTIONS) {
      const next = nextCaseStatus(current.status, action)
      if (!next || seen.has(next)) continue
      if (next === "cancelled" && to !== "cancelled") continue

      const path = [...current.path, action]
      if (next === to) return path

      seen.add(next)
      queue.push({ status: next, path })
    }
  }

  return null
}