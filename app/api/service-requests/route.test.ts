import { afterEach, describe, expect, it, vi } from "vitest"

// Mock the analytics module so the route can be tested without a database. The
// route must persist before forwarding and must never lose the request when the
// webhook is unavailable.
const persistServiceRequest = vi.fn().mockResolvedValue("row-1")
const markServiceRequestForward = vi.fn().mockResolvedValue(undefined)
const recordAffiliateClick = vi.fn().mockResolvedValue(true)
vi.mock("../../../lib/affiliate/analytics", () => ({
  persistServiceRequest: (...args: unknown[]) => persistServiceRequest(...args),
  markServiceRequestForward: (...args: unknown[]) => markServiceRequestForward(...args),
  recordAffiliateClick: (...args: unknown[]) => recordAffiliateClick(...args),
}))
vi.mock("../../../lib/affiliate/analytics-client", () => ({
  createAffiliateAnalyticsClient: () => ({ __fake: true }),
}))

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
  persistServiceRequest.mockClear()
  markServiceRequestForward.mockClear()
})

describe("service request automation webhook", () => {
  it("fails clearly when the automation webhook is not configured but still persists the request", async () => {
    const response = await POST(request(validBody))
    expect(response.status).toBe(503)
    const json = await response.json()
    expect(json.code).toBe("AUTOMATION_WEBHOOK_NOT_CONFIGURED")
    expect(json.requestId).toMatch(/^hz_/)
    // The request survives an unconfigured orchestrator.
    expect(persistServiceRequest).toHaveBeenCalledOnce()
    expect(markServiceRequestForward).toHaveBeenCalledWith(expect.anything(), json.requestId, "not_configured")
  })

  it("validates required contact data before persisting or calling the webhook", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-offer-request")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(request({ ...validBody, customer: { ...validBody.customer, email: "not-an-email" } }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(persistServiceRequest).not.toHaveBeenCalled()
  })

  it("persists before forwarding, then posts a manual offer payload with the shared secret header", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-offer-request")
    vi.stubEnv("AUTOMATION_WEBHOOK_SECRET", "test-secret")
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(request(validBody))
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json.requestId).toMatch(/^hz_/)
    expect(persistServiceRequest).toHaveBeenCalledOnce()
    // Persist happens before the webhook call.
    expect(persistServiceRequest.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0])
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://automation.example/webhook/horizon-offer-request")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Horizon-Webhook-Secret": "test-secret",
    })
    const payload = JSON.parse(String(init.body))
    expect(payload.workflow).toMatchObject({ name: "horizon_offer_request_v1", mode: "manual_offer_preparation", slaMinutes: 120 })
    expect(payload.compliance).toMatchObject({ customerConsent: true, noAutomatedDecision: true, noGuaranteedPriceOrApproval: true })
    expect(payload.customer.email).toBe("ivan@example.com")
    expect(payload.answers.annualConsumption).toBe("2500")
    expect(markServiceRequestForward).toHaveBeenCalledWith(expect.anything(), json.requestId, "forwarded")
  })

  it("records a failed hand-off when the webhook rejects the payload", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-offer-request")
    vi.stubEnv("AUTOMATION_WEBHOOK_SECRET", "test-secret")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })))

    const response = await POST(request(validBody))
    expect(response.status).toBe(502)
    expect(persistServiceRequest).toHaveBeenCalledOnce()
    expect(markServiceRequestForward).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^hz_/), "failed", "HTTP 500")
  })
})
