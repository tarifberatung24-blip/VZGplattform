import { afterEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

afterEach(() => {
  vi.unstubAllEnvs()
})

function params(offer: string) {
  return Promise.resolve({ offer })
}

describe("affiliate go redirect", () => {
  it("redirects to the exact configured https deeplink without added parameters", async () => {
    const deeplink = "https://partner.example/track?id=abc&aff=42"
    vi.stubEnv("AFFILIATE_BUSINESS_INSURANCE_URL", deeplink)

    const response = await GET(new Request("http://localhost/go/business-insurance"), {
      params: params("business-insurance"),
    })

    expect(response.status).toBe(302)
    // The exact configured URL, with nothing appended to it.
    expect(response.headers.get("location")).toBe(deeplink)
  })

  it("answers 503 when the partner link is not configured", async () => {
    const response = await GET(new Request("http://localhost/go/business-insurance"), {
      params: params("business-insurance"),
    })
    expect(response.status).toBe(503)
  })

  it("answers 503 for an inactive offer even when a URL is configured", async () => {
    vi.stubEnv("AFFILIATE_SCHUFA_URL", "https://partner.example/schufa")
    const response = await GET(new Request("http://localhost/go/schufa"), { params: params("schufa") })
    expect(response.status).toBe(503)
    expect(response.headers.get("location")).toBeNull()
  })

  it("answers 404 for an unknown offer and does not redirect", async () => {
    const response = await GET(new Request("http://localhost/go/unknown"), { params: params("unknown") })
    expect(response.status).toBe(404)
    expect(response.headers.get("location")).toBeNull()
  })
})
