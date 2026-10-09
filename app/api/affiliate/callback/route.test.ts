import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const findServiceRequestStatus = vi.fn()
const markServiceRequestStatus = vi.fn().mockResolvedValue(true)
const recordAffiliateStatusEvent = vi.fn().mockResolvedValue(undefined)
vi.mock("../../../../lib/affiliate/analytics", () => ({
  findServiceRequestStatus: (...args: unknown[]) => findServiceRequestStatus(...args),
  markServiceRequestStatus: (...args: unknown[]) => markServiceRequestStatus(...args),
  recordAffiliateStatusEvent: (...args: unknown[]) => recordAffiliateStatusEvent(...args),
}))
vi.mock("../../../../lib/affiliate/analytics-client", () => ({
  createAffiliateAnalyticsClient: () => ({ __fake: true }),
}))

import { POST } from "./route"

const SECRET = "operator-secret-1234567890"

function callback(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/affiliate/callback", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv("AFFILIATE_OPERATOR_SECRET", SECRET)
  findServiceRequestStatus.mockReset()
  markServiceRequestStatus.mockClear()
  recordAffiliateStatusEvent.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("affiliate operator callback", () => {
  it("is disabled (503) when no operator secret is configured", async () => {
    vi.stubEnv("AFFILIATE_OPERATOR_SECRET", "")
    const res = await POST(callback({ requestId: "hz_1", status: "in_review" }))
    expect(res.status).toBe(503)
    expect(findServiceRequestStatus).not.toHaveBeenCalled()
  })

  it("rejects a missing or wrong secret with 401", async () => {
    const missing = await POST(callback({ requestId: "hz_1", status: "in_review" }))
    expect(missing.status).toBe(401)
    const wrong = await POST(
      callback({ requestId: "hz_1", status: "in_review" }, { "x-horizon-operator-secret": "nope" }),
    )
    expect(wrong.status).toBe(401)
    expect(markServiceRequestStatus).not.toHaveBeenCalled()
  })

  it("rejects a malformed body with 400", async () => {
    const res = await POST(
      callback({ status: "in_review" }, { "x-horizon-operator-secret": SECRET }),
    )
    expect(res.status).toBe(400)
  })

  it("rejects an unknown status with 422", async () => {
    const res = await POST(
      callback({ requestId: "hz_1", status: "paid" }, { "x-horizon-operator-secret": SECRET }),
    )
    expect(res.status).toBe(422)
    expect(findServiceRequestStatus).not.toHaveBeenCalled()
  })

  it("returns 404 when the request is not found", async () => {
    findServiceRequestStatus.mockResolvedValue(null)
    const res = await POST(
      callback({ requestId: "hz_missing", status: "in_review" }, { "x-horizon-operator-secret": SECRET }),
    )
    expect(res.status).toBe(404)
    expect(markServiceRequestStatus).not.toHaveBeenCalled()
  })

  it("advances queued -> in_review and records the event", async () => {
    findServiceRequestStatus.mockResolvedValue("queued")
    const res = await POST(
      callback(
        { requestId: "hz_1", status: "in_review", note: "operator picked it up", source: "activepieces" },
        { "x-horizon-operator-secret": SECRET },
      ),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ requestId: "hz_1", from: "queued", status: "in_review" })
    expect(markServiceRequestStatus).toHaveBeenCalledWith({ __fake: true }, "hz_1", "in_review")
    expect(recordAffiliateStatusEvent).toHaveBeenCalledOnce()
  })

  it("rejects a skipped transition with 409 and does not write", async () => {
    findServiceRequestStatus.mockResolvedValue("queued")
    const res = await POST(
      callback({ requestId: "hz_1", status: "sent" }, { "x-horizon-operator-secret": SECRET }),
    )
    expect(res.status).toBe(409)
    expect(markServiceRequestStatus).not.toHaveBeenCalled()
    expect(recordAffiliateStatusEvent).not.toHaveBeenCalled()
  })

  it("is idempotent for a repeated status (200, no write)", async () => {
    findServiceRequestStatus.mockResolvedValue("sent")
    const res = await POST(
      callback({ requestId: "hz_1", status: "sent" }, { "x-horizon-operator-secret": SECRET }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ code: "ALREADY_IN_STATUS", status: "sent" })
    expect(markServiceRequestStatus).not.toHaveBeenCalled()
  })
})
