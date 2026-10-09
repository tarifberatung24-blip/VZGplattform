import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createCommissionRecord = vi.fn()
const findCommissionStatus = vi.fn()
const updateCommissionStatus = vi.fn().mockResolvedValue(true)
vi.mock("../../../../lib/affiliate/analytics", () => ({
  createCommissionRecord: (...args: unknown[]) => createCommissionRecord(...args),
  findCommissionStatus: (...args: unknown[]) => findCommissionStatus(...args),
  updateCommissionStatus: (...args: unknown[]) => updateCommissionStatus(...args),
}))
vi.mock("../../../../lib/affiliate/analytics-client", () => ({
  createAffiliateAnalyticsClient: () => ({ __fake: true }),
}))

import { PATCH, POST } from "./route"

const SECRET = "operator-secret-1234567890"
const auth = { "x-horizon-operator-secret": SECRET }

function req(method: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/affiliate/conversions", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv("AFFILIATE_OPERATOR_SECRET", SECRET)
  createCommissionRecord.mockReset()
  findCommissionStatus.mockReset()
  updateCommissionStatus.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("commission conversions endpoint", () => {
  it("is disabled (503) without a configured secret", async () => {
    vi.stubEnv("AFFILIATE_OPERATOR_SECRET", "")
    const res = await POST(req("POST", { requestId: "hz_1", offerId: "kfz", model: "cpa", cpaAmountEur: 45 }))
    expect(res.status).toBe(503)
  })

  it("rejects a wrong secret with 401", async () => {
    const res = await POST(
      req("POST", { requestId: "hz_1", offerId: "kfz", model: "cpa", cpaAmountEur: 45 }, { "x-horizon-operator-secret": "nope" }),
    )
    expect(res.status).toBe(401)
    expect(createCommissionRecord).not.toHaveBeenCalled()
  })

  it("rejects an unknown offer, model and status", async () => {
    const badOffer = await POST(req("POST", { requestId: "hz_1", offerId: "unknown", model: "cpa", cpaAmountEur: 45 }, auth))
    expect(badOffer.status).toBe(422)
    const badModel = await POST(req("POST", { requestId: "hz_1", offerId: "kfz", model: "flat", cpaAmountEur: 45 }, auth))
    expect(badModel.status).toBe(422)
    const badStatus = await POST(
      req("POST", { requestId: "hz_1", offerId: "kfz", model: "cpa", cpaAmountEur: 45, status: "done" }, auth),
    )
    expect(badStatus.status).toBe(422)
  })

  it("refuses to record a conversion it cannot price", async () => {
    const res = await POST(req("POST", { requestId: "hz_1", offerId: "kfz", model: "cpa" }, auth))
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: "COMMISSION_NOT_COMPUTABLE", reason: "invalid_cpa" })
    expect(createCommissionRecord).not.toHaveBeenCalled()
  })

  it("records a priced conversion as 201 with integer cents", async () => {
    createCommissionRecord.mockResolvedValue("created")
    const res = await POST(req("POST", { requestId: "hz_1", offerId: "kfz", model: "hybrid", cpaAmountEur: 45, revenueSharePercent: 10, dealValueEur: 1000 }, auth))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ amountCents: 14500, status: "pending" })
    expect(createCommissionRecord).toHaveBeenCalledOnce()
  })

  it("answers 200 ALREADY_RECORDED for a duplicate conversion (idempotent)", async () => {
    createCommissionRecord.mockResolvedValue("duplicate")
    const res = await POST(req("POST", { requestId: "hz_1", offerId: "kfz", model: "cpa", cpaAmountEur: 45 }, auth))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ code: "ALREADY_RECORDED" })
  })

  it("advances pending -> approved -> paid via PATCH", async () => {
    findCommissionStatus.mockResolvedValue("pending")
    const res = await PATCH(req("PATCH", { requestId: "hz_1", offerId: "kfz", status: "approved" }, auth))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ from: "pending", status: "approved" })
    expect(updateCommissionStatus).toHaveBeenCalledWith({ __fake: true }, "hz_1", "kfz", "approved")
  })

  it("rejects skipping to paid with 409 and does not write", async () => {
    findCommissionStatus.mockResolvedValue("pending")
    const res = await PATCH(req("PATCH", { requestId: "hz_1", offerId: "kfz", status: "paid" }, auth))
    expect(res.status).toBe(409)
    expect(updateCommissionStatus).not.toHaveBeenCalled()
  })

  it("returns 404 when the commission does not exist", async () => {
    findCommissionStatus.mockResolvedValue(null)
    const res = await PATCH(req("PATCH", { requestId: "hz_x", offerId: "kfz", status: "approved" }, auth))
    expect(res.status).toBe(404)
    expect(updateCommissionStatus).not.toHaveBeenCalled()
  })
})
