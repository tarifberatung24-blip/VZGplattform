import { afterEach, describe, expect, it, vi } from "vitest"
import { markServiceRequestForward, persistServiceRequest, recordAffiliateClick } from "./analytics"

/** Minimal chainable fake of the two call shapes the helpers use: `insert().select().single()` for persist and an awaited `insert()` for click events. */
function fakeClient(result: { data?: unknown; error?: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  // Awaitable AND chainable: recordAffiliateClick awaits insert() directly while
  // persistServiceRequest uses insert().select().single().
  const insertResult = Object.assign(Promise.resolve(result), { select })
  const insert = vi.fn().mockReturnValue(insertResult)
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) })
  return { from: vi.fn().mockReturnValue({ insert, update }), __insert: insert, __update: update }
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
