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
const resolveClickOwner = vi.fn().mockResolvedValue({ userId: null, optimizeSessionId: null })
vi.mock("../../../lib/affiliate/click-owner", () => ({
  resolveClickOwner: (...args: unknown[]) => resolveClickOwner(...args),
}))

import { GET } from "./route"

afterEach(() => {
  vi.unstubAllEnvs()
  recordAffiliateClick.mockClear()
  recordAffiliateClick.mockResolvedValue(true)
  resolveClickOwner.mockClear()
  resolveClickOwner.mockResolvedValue({ userId: null, optimizeSessionId: null })
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

  it("attributes the click to the signed-in user and the Optimize session", async () => {
    vi.stubEnv("AFFILIATE_ENERGY_URL", "https://partner.example/energy")
    const sessionId = "11111111-2222-4333-8444-555555555555"
    resolveClickOwner.mockResolvedValue({ userId: "user-1", optimizeSessionId: sessionId })

    const response = await GET(new Request(`http://localhost/go/energy?s=${sessionId}`), { params: params("energy") })

    expect(response.status).toBe(302)
    expect(resolveClickOwner).toHaveBeenCalledWith(sessionId)
    expect(recordAffiliateClick.mock.calls[0][1]).toMatchObject({ offerId: "energy", userId: "user-1", optimizeSessionId: sessionId })
    // Without a documented sub-ID parameter the deeplink stays exactly as configured.
    expect(response.headers.get("location")).toBe("https://partner.example/energy")
  })

  it("ignores a malformed session parameter", async () => {
    vi.stubEnv("AFFILIATE_ENERGY_URL", "https://partner.example/energy")
    await GET(new Request("http://localhost/go/energy?s=not-a-uuid"), { params: params("energy") })
    expect(resolveClickOwner).toHaveBeenCalledWith(null)
  })

  it("appends the click id under the partner's documented sub-ID parameter", async () => {
    vi.stubEnv("AFFILIATE_ENERGY_URL", "https://partner.example/energy?aff=42")
    vi.stubEnv("AFFILIATE_ENERGY_SUBID_PARAM", "subid")

    const response = await GET(new Request("http://localhost/go/energy"), { params: params("energy") })

    const clickId = recordAffiliateClick.mock.calls[0][1].id as string
    expect(clickId).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers.get("location")).toBe(`https://partner.example/energy?aff=42&subid=${clickId}`)
  })

  it("does not append a sub-ID when the click could not be stored", async () => {
    vi.stubEnv("AFFILIATE_ENERGY_URL", "https://partner.example/energy")
    vi.stubEnv("AFFILIATE_ENERGY_SUBID_PARAM", "subid")
    recordAffiliateClick.mockResolvedValue(false)

    const response = await GET(new Request("http://localhost/go/energy"), { params: params("energy") })

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://partner.example/energy")
  })
})
