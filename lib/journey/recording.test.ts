import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const upsert = vi.fn()
const deleteEq = vi.fn()
const selectMaybeSingle = vi.fn()
const from = vi.fn((table: string) => ({
  upsert: (...args: unknown[]) => upsert(table, ...args),
  delete: () => ({ eq: (...args: unknown[]) => deleteEq(table, ...args) }),
  select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => selectMaybeSingle(table) }) }) }),
}))
vi.mock("./db", () => ({ createJourneyDb: () => ({ from }) }))

import { isJourneyRecordingEnabled, setJourneyRecording } from "./recording"

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockResolvedValue({ error: null })
  deleteEq.mockResolvedValue({ error: null })
})

describe("isJourneyRecordingEnabled", () => {
  it("is on by default, when the user has made no choice", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await isJourneyRecordingEnabled("u1")).toBe(true)
  })

  it("stays on after an explicit opt-in", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true }, error: null })
    expect(await isJourneyRecordingEnabled("u1")).toBe(true)
  })

  it("is off once the user has objected", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: false }, error: null })
    expect(await isJourneyRecordingEnabled("u1")).toBe(false)
  })

  it("is off when the preference cannot be read, so an objection is never missed", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } })
    expect(await isJourneyRecordingEnabled("u1")).toBe(false)
  })
})

describe("setJourneyRecording", () => {
  it("switching on records the choice and deletes nothing", async () => {
    expect(await setJourneyRecording("u1", true)).toEqual({ ok: true })
    expect(upsert.mock.calls[0][0]).toBe("user_consents")
    expect(upsert.mock.calls[0][1]).toMatchObject({ user_id: "u1", purpose: "product_journey", granted: true, source: "settings" })
    expect(deleteEq).not.toHaveBeenCalled()
  })

  it("switching off records the objection and deletes the user's events", async () => {
    expect(await setJourneyRecording("u1", false)).toEqual({ ok: true })
    expect(upsert.mock.calls[0][1]).toMatchObject({ granted: false })
    expect(deleteEq).toHaveBeenCalledWith("product_events", "user_id", "u1")
  })

  it("reports failure when the events could not be deleted, so the user can retry", async () => {
    deleteEq.mockResolvedValueOnce({ error: { message: "x" } })
    expect(await setJourneyRecording("u1", false)).toEqual({ ok: false })
  })

  it("reports failure when the choice could not be stored", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "x" } })
    expect(await setJourneyRecording("u1", false)).toEqual({ ok: false })
    expect(deleteEq).not.toHaveBeenCalled()
  })
})
