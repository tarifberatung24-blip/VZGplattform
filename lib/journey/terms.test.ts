import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const upsert = vi.fn()
const selectMaybeSingle = vi.fn()
const from = vi.fn((table: string) => ({
  upsert: (...args: unknown[]) => upsert(table, ...args),
  select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => selectMaybeSingle(table) }) }) }),
}))
vi.mock("./db", () => ({ createJourneyDb: () => ({ from }) }))

import { TERMS_VERSION } from "./keys"
import { ensureTermsAccepted, hasAcceptedTerms, recordTermsAcceptance, termsIntentGiven } from "./terms"

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockResolvedValue({ error: null })
})

describe("termsIntentGiven", () => {
  it("needs the current version in the account metadata or the cookie", () => {
    expect(termsIntentGiven({ terms_accepted_version: TERMS_VERSION }, undefined)).toBe(true)
    expect(termsIntentGiven(undefined, TERMS_VERSION)).toBe(true)
    expect(termsIntentGiven({ terms_accepted_version: "2020-01-01" }, undefined)).toBe(false)
    expect(termsIntentGiven({ terms_accepted: true }, "1")).toBe(false)
    expect(termsIntentGiven(undefined, undefined)).toBe(false)
  })
})

describe("hasAcceptedTerms", () => {
  it("is true only for a granted row of the current version", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true, text_version: TERMS_VERSION }, error: null })
    expect(await hasAcceptedTerms("u1")).toBe(true)
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true, text_version: "2020-01-01" }, error: null })
    expect(await hasAcceptedTerms("u1")).toBe(false)
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await hasAcceptedTerms("u1")).toBe(false)
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true, text_version: TERMS_VERSION }, error: { message: "boom" } })
    expect(await hasAcceptedTerms("u1")).toBe(false)
  })
})

describe("recordTermsAcceptance", () => {
  it("stores the acceptance with the version, source and a server timestamp", async () => {
    expect(await recordTermsAcceptance("u1", "gate")).toEqual({ ok: true })
    const [table, row] = upsert.mock.calls[0]
    expect(table).toBe("user_consents")
    expect(row).toMatchObject({ user_id: "u1", purpose: "terms_and_privacy", granted: true, text_version: TERMS_VERSION, source: "gate" })
    expect(typeof row.granted_at).toBe("string")
  })

  it("reports failure when the row could not be stored", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "x" } })
    expect(await recordTermsAcceptance("u1", "gate")).toEqual({ ok: false })
  })
})

describe("ensureTermsAccepted", () => {
  it("accepts an account that already accepted, without writing", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: { granted: true, text_version: TERMS_VERSION }, error: null })
    expect(await ensureTermsAccepted("u1", undefined, undefined)).toBe(true)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("records the sign-up checkbox for a new account", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await ensureTermsAccepted("u1", { terms_accepted_version: TERMS_VERSION }, undefined)).toBe(true)
    expect(upsert.mock.calls[0][1]).toMatchObject({ source: "signup" })
  })

  it("asks an account without the checkbox, for example one created through Google on the login page", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await ensureTermsAccepted("u1", { first_name: "A" }, undefined)).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("does not let the account through when the acceptance could not be stored", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    upsert.mockResolvedValueOnce({ error: { message: "x" } })
    expect(await ensureTermsAccepted("u1", { terms_accepted_version: TERMS_VERSION }, undefined)).toBe(false)
  })

  it("does not throw when the database call fails", async () => {
    selectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    upsert.mockRejectedValueOnce(new Error("network"))
    await expect(ensureTermsAccepted("u1", undefined, TERMS_VERSION)).resolves.toBe(false)
  })
})
