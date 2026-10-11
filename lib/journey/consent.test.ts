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

import { applySignupConsent, hasJourneyConsent, setJourneyConsent, signupConsentIntended } from "./consent"

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockResolvedValue({ error: null })
  deleteEq.mockResolvedValue({ error: null })
})

describe("signupConsentIntended", () => {
  it("needs an explicit true in the metadata or the cookie set to 1", () => {
    expect(signupConsentIntended({ journey_consent: true }, undefined)).toBe(true)
    expect(signupConsentIntended(undefined, "1")).toBe(true)
    expect(signupConsentIntended({ journey_consent: "true" }, undefined)).toBe(false)
    expect(signupConsentIntended({}, "0")).toBe(false)
    expect(signupConsentIntended(undefined, undefined)).toBe(false)
  })
})

describe("applySignupConsent", () => {
  it("writes nothing when the checkbox was not ticked", async () => {
    await applySignupConsent("u1", {}, undefined)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("records a signup consent without overriding an existing decision", async () => {
    await applySignupConsent("u1", { journey_consent: true }, undefined)
    expect(upsert).toHaveBeenCalledTimes(1)
    const [table, row, options] = upsert.mock.calls[0]
    expect(table).toBe("user_consents")
    expect(row).toMatchObject({ user_id: "u1", purpose: "product_journey", granted: true, source: "signup" })
    expect(options).toMatchObject({ ignoreDuplicates: true })
  })

  it("does not throw when the database call fails", async () => {
    upsert.mockRejectedValueOnce(new Error("network"))
    await expect(applySignupConsent("u1", { journey_consent: true }, undefined)).resolves.toBeUndefined()
  })
})

describe("setJourneyConsent", () => {
  it("records a grant without deleting events", async () => {
    expect(await setJourneyConsent("u1", true, "settings")).toEqual({ ok: true })
    expect(deleteEq).not.toHaveBeenCalled()
  })

  it("deletes the user's events when consent is withdrawn", async () => {
    expect(await setJourneyConsent("u1", false, "settings")).toEqual({ ok: true })
    expect(upsert.mock.calls[0][1]).toMatchObject({ granted: false })
    expect(deleteEq).toHaveBeenCalledWith("product_events", "user_id", "u1")
  })

  it("reports failure when the events could not be deleted, so the user can retry", async () => {
    deleteEq.mockResolvedValueOnce({ error: { message: "x" } })
    expect(await setJourneyConsent("u1", false, "settings")).toEqual({ ok: false })
  })
})

describe("hasJourneyConsent", () => {
  it("is true only for an explicit grant", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true }, error: null })
    expect(await hasJourneyConsent("u1")).toBe(true)
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: false }, error: null })
    expect(await hasJourneyConsent("u1")).toBe(false)
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await hasJourneyConsent("u1")).toBe(false)
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true }, error: { message: "boom" } })
    expect(await hasJourneyConsent("u1")).toBe(false)
  })
})
