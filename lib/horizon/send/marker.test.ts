import { describe, expect, it } from "vitest"

import {
  SEND_RECORD_MODEL,
  isSendRecordDraft,
  pickSendableDraft,
} from "./marker"

describe("send record marker", () => {
  it("recognises a send record", () => {
    expect(isSendRecordDraft(SEND_RECORD_MODEL)).toBe(true)
  })

  it("does not treat an ordinary draft as a send record", () => {
    expect(isSendRecordDraft("gpt-4o")).toBe(false)
    expect(isSendRecordDraft(null)).toBe(false)
    expect(isSendRecordDraft(undefined)).toBe(false)
  })
})

describe("sendable draft selection", () => {
  // The list is newest-first, which is how the repository returns it.
  const drafts = [
    { id: "record", model: SEND_RECORD_MODEL },
    { id: "message", model: "gpt-4o" },
    { id: "older", model: "gpt-4o" },
  ]

  it("skips the newest draft when it is a send record", () => {
    expect(pickSendableDraft(drafts)?.id).toBe("message")
  })

  it("picks the newest draft when no record exists", () => {
    expect(pickSendableDraft(drafts.slice(1))?.id).toBe("message")
  })

  it("returns null rather than falling back to a send record", () => {
    expect(pickSendableDraft([{ id: "record", model: SEND_RECORD_MODEL }])).toBeNull()
    expect(pickSendableDraft([])).toBeNull()
  })
})
