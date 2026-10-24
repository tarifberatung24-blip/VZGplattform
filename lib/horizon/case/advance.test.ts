import { describe, expect, it } from "vitest"
import {
  HORIZON_CASE_ACTIONS,
  HORIZON_CASE_STATUSES,
  type HorizonCaseStatus,
} from "./contract"
import { CASE_ADVANCE_TARGETS, caseAdvancePath, nextCaseStatus } from "./lifecycle"

/**
 * The application advances a case automatically on four events. These tests fix
 * which status each event may reach and prove that no automatic move can ever go
 * backwards, because a case that silently regressed would tell the customer their
 * finished work was undone.
 */
describe("automatic case advancement", () => {
  const targets = Object.values(CASE_ADVANCE_TARGETS)

  it("keeps every advance target inside the declared status vocabulary", () => {
    for (const target of targets) {
      expect(HORIZON_CASE_STATUSES).toContain(target)
    }
  })

  it("reaches every target from a freshly created case", () => {
    for (const target of targets) {
      const path = caseAdvancePath("draft", target)
      expect(path, `draft -> ${target}`).not.toBeNull()
    }
  })

  it("walks only declared transitions", () => {
    for (const target of targets) {
      const path = caseAdvancePath("draft", target) ?? []
      let status: HorizonCaseStatus = "draft"
      for (const action of path) {
        expect(HORIZON_CASE_ACTIONS).toContain(action)
        const next = nextCaseStatus(status, action)
        expect(next, `${status} --${action}--> ?`).not.toBeNull()
        status = next as HorizonCaseStatus
      }
      expect(status).toBe(target)
    }
  })

  it("never routes an advance through cancelled", () => {
    for (const target of targets) {
      const path = caseAdvancePath("draft", target) ?? []
      expect(path).not.toContain("cancel")
    }
  })

  it("refuses to move a case backwards", () => {
    // A saved draft (draft_ready) must not undo a recorded approval, and a resend
    // of a sent draft must not undo action_ready.
    expect(caseAdvancePath("approved", "draft_ready")).toBeNull()
    expect(caseAdvancePath("action_ready", "draft_ready")).toBeNull()
    expect(caseAdvancePath("action_ready", "approved")).toBeNull()
    expect(caseAdvancePath("completed", "action_ready")).toBeNull()
    expect(caseAdvancePath("cancelled", "collecting_data")).toBeNull()
  })

  it("treats an already-reached target as a no-op", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      expect(caseAdvancePath(status, status)).toEqual([])
    }
  })

  it("requires a real approval before a case may become action_ready", () => {
    const path = caseAdvancePath("draft", "action_ready")
    expect(path).toEqual([
      "start_collecting",
      "mark_draft_ready",
      "approve",
      "mark_action_ready",
    ])
    expect(path).toContain("approve")
  })

  it("does not reach completed automatically, only by an explicit close", () => {
    expect(targets).not.toContain("completed")
    expect(targets).not.toContain("cancelled")
    expect(caseAdvancePath("draft", "completed")).not.toBeNull()
  })
})
