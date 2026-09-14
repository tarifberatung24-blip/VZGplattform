import { afterEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const validBody = {
  kind: "energy",
  locale: "bg",
  landingUrl: "https://www.finanzberaterbg.de/bg/zayavka?service=energy",
  source: "service_request_wizard",
  customer: {
    name: "Ivan Petrov",
    email: "ivan@example.com",
    phone: "+491701234567",
  },
  answers: {
    fullName: "Ivan Petrov",
    email: "ivan@example.com",
    energyType: "strom",
    postcode: "60311",
    annualConsumption: "2500",
    privacyConsent: "yes",
  },
  consent: true,
}

function request(body: unknown) {
  return new Request("http://localhost/api/service-requests", {
    method: "POST",
    headers: {
      referer: "https://www.finanzberaterbg.de/bg/produkte",
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("service request n8n webhook", () => {
  it("fails clearly when n8n webhook is not configured", async () => {
    const response = await POST(request(validBody))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: "N8N_WEBHOOK_NOT_CONFIGURED" })
  })

  it("validates required contact data before calling n8n", async () => {
    vi.stubEnv("N8N_OFFER_REQUEST_WEBHOOK_URL", "https://n8n.example/webhook/finanzbg-offer-request")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(request({ ...validBody, customer: { ...validBody.customer, email: "not-an-email" } }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts a manual offer payload to n8n with the shared secret header", async () => {
    vi.stubEnv("N8N_OFFER_REQUEST_WEBHOOK_URL", "https://n8n.example/webhook/finanzbg-offer-request")
    vi.stubEnv("N8N_WEBHOOK_SECRET", "test-secret")
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(request(validBody))
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json.requestId).toMatch(/^fbg_/)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://n8n.example/webhook/finanzbg-offer-request")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-FinanzBG-Webhook-Secret": "test-secret",
    })
    const payload = JSON.parse(String(init.body))
    expect(payload.workflow).toMatchObject({ name: "finanzbg_offer_request_v1", mode: "manual_offer_preparation", slaMinutes: 120 })
    expect(payload.compliance).toMatchObject({ customerConsent: true, noAutomatedDecision: true, noGuaranteedPriceOrApproval: true })
    expect(payload.customer.email).toBe("ivan@example.com")
    expect(payload.answers.annualConsumption).toBe("2500")
  })
})
