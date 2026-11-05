import { afterEach, describe, expect, it, vi } from "vitest"

// Mock the analytics module so the route can be tested without a database. The
// route must persist before forwarding and must never lose the request when the
// webhook is unavailable.
const persistServiceRequest = vi.fn().mockResolvedValue("row-1")
const markServiceRequestForward = vi.fn().mockResolvedValue(undefined)
const recordAffiliateClick = vi.fn().mockResolvedValue(true)
const linkServiceRequestCase = vi.fn().mockResolvedValue(true)
vi.mock("../../../lib/affiliate/analytics", () => ({
  persistServiceRequest: (...args: unknown[]) => persistServiceRequest(...args),
  markServiceRequestForward: (...args: unknown[]) => markServiceRequestForward(...args),
  recordAffiliateClick: (...args: unknown[]) => recordAffiliateClick(...args),
  linkServiceRequestCase: (...args: unknown[]) => linkServiceRequestCase(...args),
}))
vi.mock("../../../lib/affiliate/analytics-client", () => ({
  createAffiliateAnalyticsClient: () => ({ __fake: true }),
}))

// Case provisioning is mocked so the ordering between persistence, case creation
// and the linkage backfill can be asserted. The default engine is unconfigured,
// which is what the non-HORIZON kinds already see.
const createCaseEngine = vi.fn()
vi.mock("../../../lib/horizon/case", () => ({
  createCaseEngine: (...args: unknown[]) => createCaseEngine(...args),
}))
const provisionHorizonServiceCase = vi.fn()
vi.mock("../../../lib/horizon/service-requests/case-provisioning", () => ({
  provisionHorizonServiceCase: (...args: unknown[]) => provisionHorizonServiceCase(...args),
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

let requestCounter = 0

function request(body: unknown) {
  // A unique client IP per call keeps the in-memory rate limiter (5 / 10 min,
  // keyed by IP) from coupling the tests to one another.
  requestCounter += 1
  return new Request("http://localhost/api/service-requests", {
    method: "POST",
    headers: {
      referer: "https://www.finanzberaterbg.de/bg/produkte",
      "user-agent": "vitest",
      "x-forwarded-for": `10.0.0.${requestCounter}`,
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  persistServiceRequest.mockClear()
  markServiceRequestForward.mockClear()
  linkServiceRequestCase.mockClear()
  createCaseEngine.mockReset()
  provisionHorizonServiceCase.mockReset()
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

  it("routes Tarifberater24 services to the free Alpha Team workflow", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-alpha-service")
    vi.stubEnv("AUTOMATION_WEBHOOK_SECRET", "test-secret")
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(request({
      ...validBody,
      kind: "steuererklaerung",
      answers: {
        fullName: "Ivan Petrov",
        email: "ivan@example.com",
        serviceDetails: "Steuerjahr 2025, angestellt",
        privacyConsent: "yes",
      },
    }))

    expect(response.status).toBe(202)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(init.body))
    expect(payload.workflow).toMatchObject({
      name: "horizon_alpha_service_v1",
      mode: "alpha_team_intake_and_execution",
      freeForHorizon: true,
      externalActions: "human_approval_required",
    })
    expect(payload.alphaTeam).toMatchObject({
      serviceKind: "steuererklaerung",
      leadAgent: "finance-tax",
      externalActions: "blocked_until_human_approval",
    })
    expect(payload.compliance.externalActionsHumanApprovalRequired).toBe(true)
  })

  it("persists the request before provisioning the case, then backfills the case link", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-alpha-service")
    vi.stubEnv("AUTOMATION_WEBHOOK_SECRET", "test-secret")
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    createCaseEngine.mockResolvedValue({ repository: { __repo: true }, userId: "user-7", configured: true })
    provisionHorizonServiceCase.mockResolvedValue({ data: { id: "case-9", status: "waiting_for_user" }, error: null })

    const response = await POST(request({
      ...validBody,
      kind: "steuererklaerung",
      answers: { fullName: "Ivan", email: "ivan@example.com", serviceDetails: "Steuerjahr 2025", privacyConsent: "yes" },
    }))

    expect(response.status).toBe(202)
    const json = await response.json()
    expect(json.caseId).toBe("case-9")
    // The durable write happens first; the case is created only afterwards.
    expect(persistServiceRequest.mock.invocationCallOrder[0]).toBeLessThan(
      provisionHorizonServiceCase.mock.invocationCallOrder[0],
    )
    // The request row is linked to the case only after the case exists.
    expect(linkServiceRequestCase.mock.invocationCallOrder[0]).toBeGreaterThan(
      provisionHorizonServiceCase.mock.invocationCallOrder[0],
    )
    expect(linkServiceRequestCase).toHaveBeenCalledWith(expect.anything(), {
      requestId: json.requestId,
      caseId: "case-9",
      userId: "user-7",
    })
    // The row is inserted without the case columns; they are set by the backfill.
    expect(persistServiceRequest.mock.calls[0][1]).not.toHaveProperty("caseId")
  })

  it("keeps the persisted request even when case provisioning fails", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://automation.example/webhook/horizon-alpha-service")
    vi.stubEnv("AUTOMATION_WEBHOOK_SECRET", "test-secret")
    vi.stubGlobal("fetch", vi.fn())
    createCaseEngine.mockResolvedValue({ repository: { __repo: true }, userId: "user-7", configured: true })
    provisionHorizonServiceCase.mockResolvedValue({ data: null, error: "CASE_CREATE_FAILED" })

    const response = await POST(request({
      ...validBody,
      kind: "wohnungsanmeldung",
      answers: { fullName: "Ivan", email: "ivan@example.com", address: "Berlin", privacyConsent: "yes" },
    }))

    expect(response.status).toBe(500)
    expect((await response.json()).code).toBe("HORIZON_CASE_PROVISIONING_FAILED")
    // Persist ran first, so the customer request survives the provisioning failure.
    expect(persistServiceRequest).toHaveBeenCalledOnce()
    expect(linkServiceRequestCase).not.toHaveBeenCalled()
  })
})
