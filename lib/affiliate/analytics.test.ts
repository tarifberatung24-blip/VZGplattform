import { afterEach, describe, expect, it, vi } from "vitest"
import { findServiceRequestLink, linkServiceRequestCase, markServiceRequestForward, persistServiceRequest, recordAffiliateClick } from "./analytics"

/** Minimal chainable fake of the two call shapes the helpers use: `insert().select().single()` for persist and an awaited `insert()` for click events. */
function fakeClient(result: { data?: unknown; error?: unknown }, read?: { data?: unknown; error?: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  // Awaitable AND chainable: recordAffiliateClick awaits insert() directly while
  // persistServiceRequest uses insert().select().single().
  const insertResult = Object.assign(Promise.resolve(result), { select })
  const insert = vi.fn().mockReturnValue(insertResult)
  // `update().eq()` is awaited by markServiceRequestForward, while
  // linkServiceRequestCase chains `update().eq().select().maybeSingle()`, so the
  // eq() result is both awaitable and chainable.
  const updateMaybeSingle = vi.fn().mockResolvedValue(result)
  const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle })
  const eqResult = Object.assign(Promise.resolve(result), { select: updateSelect })
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqResult) })
  // `select().eq().maybeSingle()` is the read shape used by findServiceRequestLink.
  const readMaybeSingle = vi.fn().mockResolvedValue(read ?? { data: null, error: null })
  const readEq = vi.fn().mockReturnValue({ maybeSingle: readMaybeSingle })
  const readSelect = vi.fn().mockReturnValue({ eq: readEq })
  return {
    from: vi.fn().mockReturnValue({ insert, update, select: readSelect }),
    __insert: insert,
    __update: update,
    __updateSelect: updateSelect,
    __updateMaybeSingle: updateMaybeSingle,
    __readSelect: readSelect,
    __readMaybeSingle: readMaybeSingle,
  }
}

const REQUEST = {
  requestId: "hz_test-1",
  kind: "energy",
  locale: "bg",
  source: "service_request_wizard",
  landingUrl: "https://www.finanzberaterbg.de/bg/zayavka?service=energy",
  referrer: "https://www.finanzberaterbg.de/bg/produkte",
  userAgent: "vitest",
  customer: { name: "Ivan", email: "ivan@example.com", phone: null },
  answers: { postcode: "60311", energyType: "strom", annualConsumption: "2500" },
  consent: true,
  slaMinutes: 120,
  promisedResponseBy: "2026-10-09T12:00:00.000Z",
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("affiliate analytics durability", () => {
  it("returns null and does not throw when no client is configured", async () => {
    await expect(persistServiceRequest(null, REQUEST)).resolves.toBeNull()
    await expect(recordAffiliateClick(null, { offerId: "kfz" })).resolves.toBe(false)
    await expect(markServiceRequestForward(null, "hz_test-1", "forwarded")).resolves.toBeUndefined()
  })

  it("persists a request and returns the row id", async () => {
    const client = fakeClient({ data: { id: "row-1" }, error: null })
    const id = await persistServiceRequest(client as never, REQUEST)
    expect(id).toBe("row-1")
    expect(client.__insert).toHaveBeenCalledOnce()
    const row = client.__insert.mock.calls[0][0]
    expect(row).toMatchObject({
      request_id: "hz_test-1",
      kind: "energy",
      customer_email: "ivan@example.com",
      forward_status: "pending",
      sla_minutes: 120,
    })
  })

  it("returns null when the insert fails instead of throwing", async () => {
    const client = fakeClient({ data: null, error: { code: "42P01" } })
    await expect(persistServiceRequest(client as never, REQUEST)).resolves.toBeNull()
  })

  it("returns the existing row id when a retry hits the unique request_id", async () => {
    // 23505 = unique_violation. The request is already durable, so the retry must
    // report success with the existing id rather than a failure.
    const client = fakeClient(
      { data: null, error: { code: "23505" } },
      { data: { id: "row-9", case_id: null, user_id: null }, error: null },
    )
    await expect(persistServiceRequest(client as never, REQUEST)).resolves.toBe("row-9")
  })

  it("stays null when the insert fails and no existing row can be read back", async () => {
    const client = fakeClient({ data: null, error: { code: "23505" } }, { data: null, error: null })
    await expect(persistServiceRequest(client as never, REQUEST)).resolves.toBeNull()
  })

  it("records a click and reports success", async () => {
    const client = fakeClient({ error: null })
    await expect(
      recordAffiliateClick(client as never, { offerId: "energy", locale: "de", path: "/de/go/energy" }),
    ).resolves.toBe(true)
    const row = client.__insert.mock.calls[0][0]
    expect(row).toMatchObject({ offer_id: "energy", locale: "de", path: "/de/go/energy" })
  })

  it("reports a click as unrecorded when the insert fails", async () => {
    const client = fakeClient({ error: { code: "42P01" } })
    await expect(recordAffiliateClick(client as never, { offerId: "energy" })).resolves.toBe(false)
  })

  it("marks the forward outcome on the stored request", async () => {
    const client = fakeClient({ error: null })
    await markServiceRequestForward(client as never, "hz_test-1", "failed", "HTTP 502")
    const patch = client.__update.mock.calls[0][0]
    expect(patch).toMatchObject({ forward_status: "failed", forward_error: "HTTP 502" })
  })
})

describe("service request case linkage", () => {
  it("backfills case_id and user_id on the stored request", async () => {
    const client = fakeClient({ data: { id: "row-1" }, error: null })
    await expect(
      linkServiceRequestCase(client as never, { requestId: "hz_test-1", caseId: "case-9", userId: "user-7" }),
    ).resolves.toBe(true)
    const patch = client.__update.mock.calls[0][0]
    expect(patch).toMatchObject({ case_id: "case-9", user_id: "user-7" })
    // The update is scoped to the request id, never a bulk update.
    expect(client.__updateSelect).toHaveBeenCalledOnce()
  })

  it("accepts a null user for a request persisted without a session", async () => {
    const client = fakeClient({ data: { id: "row-1" }, error: null })
    await expect(
      linkServiceRequestCase(client as never, { requestId: "hz_test-1", caseId: "case-9", userId: null }),
    ).resolves.toBe(true)
    expect(client.__update.mock.calls[0][0]).toMatchObject({ case_id: "case-9", user_id: null })
  })

  it("returns false when no client is configured instead of throwing", async () => {
    await expect(
      linkServiceRequestCase(null, { requestId: "hz_test-1", caseId: "case-9", userId: "user-7" }),
    ).resolves.toBe(false)
  })

  it("does not fail when the case-link migration is not applied yet", async () => {
    const client = fakeClient({ data: null, error: { code: "42703" } })
    await expect(
      linkServiceRequestCase(client as never, { requestId: "hz_test-1", caseId: "case-9", userId: "user-7" }),
    ).resolves.toBe(false)
  })

  it("returns false when the request row is missing", async () => {
    const client = fakeClient({ data: null, error: null })
    await expect(
      linkServiceRequestCase(client as never, { requestId: "hz_missing", caseId: "case-9", userId: "user-7" }),
    ).resolves.toBe(false)
  })
})

describe("findServiceRequestLink", () => {
  it("returns the row id, case id and owner for a stored request", async () => {
    const client = fakeClient({ error: null }, { data: { id: "row-1", case_id: "case-9", user_id: "user-7" }, error: null })
    await expect(findServiceRequestLink(client as never, "hz_test-1")).resolves.toEqual({
      id: "row-1",
      caseId: "case-9",
      userId: "user-7",
    })
    expect(client.__readSelect).toHaveBeenCalledOnce()
  })

  it("returns nulls for a stored but unlinked request", async () => {
    const client = fakeClient({ error: null }, { data: { id: "row-1", case_id: null, user_id: null }, error: null })
    await expect(findServiceRequestLink(client as never, "hz_test-1")).resolves.toEqual({
      id: "row-1",
      caseId: null,
      userId: null,
    })
  })

  it("returns null when the row does not exist", async () => {
    const client = fakeClient({ error: null }, { data: null, error: null })
    await expect(findServiceRequestLink(client as never, "hz_missing")).resolves.toBeNull()
  })

  it("returns null when no client is configured", async () => {
    await expect(findServiceRequestLink(null, "hz_test-1")).resolves.toBeNull()
  })
})
