import { afterEach, describe, expect, it, vi } from "vitest"

// The route records a click as a side effect. Mock the analytics module so the
// test asserts the route calls it with the right arguments without a database.
const recordAffiliateClick = vi.fn().mockResolvedValue(true)
vi.mock("../../../lib/affiliate/analytics", () => ({
  recordAffiliateClick: (...args: unknown[]) => recordAffiliateClick(...args),
}))
vi.mock("../../../lib/affiliate/analytics-client", () => ({
  createAffiliateAnalyticsClient: () => ({ __fake: true }),
}))

import { GET } from "./route"

afterEach(() => {
  vi.unstubAllEnvs()
  recordAffiliateClick.mockClear()
})

function params(offer: string) {
  return Promise.resolve({ offer })
}

describe("affiliate go redirect", () => {
  it("redirects to the exact configured https deeplink without added parameters", async () => {
    const deeplink = "https://partner.example/track?id=abc&aff=42"
    vi.stubEnv("AFFILIATE_BUSINESS_INSURANCE_URL", deeplink)

    const response = await GET(new Request("http://localhost/de/go/business-insurance"), {
      params: params("business-insurance"),
    })

    expect(response.status).toBe(302)
    // The exact configured URL, with nothing appended to it.
    expect(response.headers.get("location")).toBe(deeplink)
  })

  it("records one click with the offer, locale and path, then redirects", async () => {
    vi.stubEnv("AFFILIATE_KFZ_URL", "https://partner.example/kfz")

    const response = await GET(new Request("http://localhost/de/go/kfz"), { params: params("kfz") })

    expect(response.status).toBe(302)
    expect(recordAffiliateClick).toHaveBeenCalledOnce()
    expect(recordAffiliateClick.mock.calls[0][1]).toMatchObject({
      offerId: "kfz",
      locale: "de",
      path: "/de/go/kfz",
    })
  })

  it("does not record a click when the partner link is not configured", async () => {
    const response = await GET(new Request("http://localhost/go/business-insurance"), {
      params: params("business-insurance"),
    })
    expect(response.status).toBe(503)
    expect(recordAffiliateClick).not.toHaveBeenCalled()
  })

  it("answers 503 for an inactive offer even when a URL is configured", async () => {
    vi.stubEnv("AFFILIATE_SCHUFA_URL", "https://partner.example/schufa")
    const response = await GET(new Request("http://localhost/go/schufa"), { params: params("schufa") })
    expect(response.status).toBe(503)
    expect(response.headers.get("location")).toBeNull()
    expect(recordAffiliateClick).not.toHaveBeenCalled()
  })

  it("answers 404 for an unknown offer and does not redirect", async () => {
    const response = await GET(new Request("http://localhost/go/unknown"), { params: params("unknown") })
    expect(response.status).toBe(404)
    expect(response.headers.get("location")).toBeNull()
    expect(recordAffiliateClick).not.toHaveBeenCalled()
  })
})
