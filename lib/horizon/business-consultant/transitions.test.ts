import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  PLAYBOOK_ACTION_STATUSES,
  PLAYBOOK_USER_ACTIONS,
  isActionAvailable,
  nextActionStatus,
} from "./contract"
import { nextActionStatus as serverNextActionStatus } from "./service"
import { businessConsultantCopy } from "./ui-copy"

/**
 * The playbook transition table is a boundary, not a UI detail. It is what stops a
 * stale request from silently re-opening a completed action, and it is what the
 * dashboard reads to decide which buttons to render. These tests pin the exact
 * table and prove the server and the UI cannot drift apart again: the UI once
 * offered "reopen" on a completed action, which the server refused.
 */
describe("playbook transition table", () => {
  it("moves a pending action to in_progress on start", () => {
    expect(nextActionStatus("pending", "start")).toBe("in_progress")
  })

  it("completes a pending or in-progress action", () => {
    expect(nextActionStatus("pending", "complete")).toBe("completed")
    expect(nextActionStatus("in_progress", "complete")).toBe("completed")
  })

  it("postpones a pending or in-progress action", () => {
    expect(nextActionStatus("pending", "postpone")).toBe("postponed")
    expect(nextActionStatus("in_progress", "postpone")).toBe("postponed")
  })

  it("rejects anything that is not already completed", () => {
    for (const status of PLAYBOOK_ACTION_STATUSES) {
      if (status === "completed") continue
      expect(nextActionStatus(status, "reject")).toBe("rejected")
    }
  })

  it("reopens only a postponed or rejected action, back to pending", () => {
    expect(nextActionStatus("postponed", "reopen")).toBe("pending")
    expect(nextActionStatus("rejected", "reopen")).toBe("pending")
    expect(nextActionStatus("pending", "reopen")).toBeNull()
    expect(nextActionStatus("in_progress", "reopen")).toBeNull()
  })

  it("never offers any action for a completed action", () => {
    for (const action of PLAYBOOK_USER_ACTIONS) {
      expect(nextActionStatus("completed", action)).toBeNull()
    }
  })

  it("is idempotent for reject, and changes nothing else in place", () => {
    // Repeating a rejected action must not be an error; every other repeat is refused.
    expect(nextActionStatus("rejected", "reject")).toBe("rejected")
    for (const status of PLAYBOOK_ACTION_STATUSES) {
      for (const action of PLAYBOOK_USER_ACTIONS) {
        if (status === "rejected" && action === "reject") continue
        expect(nextActionStatus(status, action)).not.toBe(status)
      }
    }
  })

  it("refuses an unknown action", () => {
    expect(nextActionStatus("pending", "explode" as never)).toBeNull()
  })

  it("agrees exactly with isActionAvailable", () => {
    for (const status of PLAYBOOK_ACTION_STATUSES) {
      for (const action of PLAYBOOK_USER_ACTIONS) {
        expect(isActionAvailable(status, action)).toBe(nextActionStatus(status, action) !== null)
      }
    }
  })

  it("is the same function the server enforces, not a second table", () => {
    expect(serverNextActionStatus).toBe(nextActionStatus)
  })

  it("offers the dashboard exactly the buttons the server accepts", () => {
    // This is the regression: the UI derives its buttons from isActionAvailable, so
    // for every status the offered set must equal the accepted set. A completed
    // action offers nothing, and "reopen" is offered only for postponed/rejected.
    for (const status of PLAYBOOK_ACTION_STATUSES) {
      const offered = PLAYBOOK_USER_ACTIONS.filter((action) => isActionAvailable(status, action))
      const accepted = PLAYBOOK_USER_ACTIONS.filter((action) => nextActionStatus(status, action) !== null)
      expect(offered).toEqual(accepted)
    }
    expect(PLAYBOOK_USER_ACTIONS.filter((action) => isActionAvailable("completed", action))).toEqual([])
    expect(PLAYBOOK_USER_ACTIONS.filter((action) => isActionAvailable("pending", action))).toEqual([
      "start",
      "complete",
      "postpone",
      "reject",
    ])
  })

  it("has a label for every action in both locales", () => {
    for (const locale of ["bg", "de"] as const) {
      const copy = businessConsultantCopy[locale] as Record<string, unknown>
      for (const action of PLAYBOOK_USER_ACTIONS) expect(copy[action]).toBeTruthy()
    }
  })
})
