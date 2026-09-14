import { describe, expect, it } from "vitest"
import { canTransitionWorkplace, getNextWorkplaceStatus, getWorkplaceNextAction } from "./state-machine"

describe("Workplace state machine", () => {
  it("requires review before a new case can prepare a draft", () => {
    expect(getNextWorkplaceStatus("NEW", "PREPARE_DRAFT")).toBeNull()
    expect(getNextWorkplaceStatus("NEW", "START_REVIEW")).toBe("UNDERSTANDING")
  })

  it("routes missing information before draft generation", () => {
    expect(getWorkplaceNextAction("UNDERSTANDING", [{ code: "MISSING_INFO", label: "Доход" }])).toMatchObject({
      action: "ANSWER_QUESTIONS",
    })
  })

  it("requires approval before export or send", () => {
    expect(canTransitionWorkplace("USER_REVIEW", "EXPORT")).toBe(false)
    expect(canTransitionWorkplace("USER_REVIEW", "APPROVE_DRAFT")).toBe(true)
    expect(getNextWorkplaceStatus("APPROVED", "SEND")).toBe("READY_TO_SEND")
  })

  it("allows edited drafts to return to review", () => {
    expect(getNextWorkplaceStatus("USER_REVIEW", "REOPEN")).toBe("DRAFT_READY")
  })
})
