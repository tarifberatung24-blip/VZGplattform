import { describe, expect, it } from "vitest"
import {
  AUTOMATION_SECRET_HEADER,
  LEGACY_AUTOMATION_SECRET_HEADER,
  resolveServiceRequestAutomation,
  serviceRequestAutomationHeaders,
} from "./service-request-transport"

describe("service request automation transport", () => {
  it("uses the complete neutral pair", () => {
    const config = resolveServiceRequestAutomation({
      HORIZON_AUTOMATION_SERVICE_REQUEST_WEBHOOK_URL: "https://example.test/hook",
      HORIZON_AUTOMATION_WEBHOOK_SECRET: "neutral-secret",
    })
    expect(config).toEqual({
      url: "https://example.test/hook",
      secret: "neutral-secret",
      family: "neutral",
    })
    expect(serviceRequestAutomationHeaders(config!)).toEqual({
      "Content-Type": "application/json",
      [AUTOMATION_SECRET_HEADER]: "neutral-secret",
    })
  })

  it("fails closed on a partial neutral pair instead of mixing legacy credentials", () => {
    expect(resolveServiceRequestAutomation({
      HORIZON_AUTOMATION_SERVICE_REQUEST_WEBHOOK_URL: "https://activepieces.example/hook",
      N8N_WEBHOOK_SECRET: "legacy-secret",
      N8N_OFFER_REQUEST_WEBHOOK_URL: "https://n8n.example/hook",
    })).toBeNull()
  })

  it("keeps the legacy n8n pair as an isolated compatibility fallback", () => {
    const config = resolveServiceRequestAutomation({
      N8N_OFFER_REQUEST_WEBHOOK_URL: "https://n8n.example/hook",
      N8N_WEBHOOK_SECRET: "legacy-secret",
    })
    expect(config?.family).toBe("legacy")
    expect(serviceRequestAutomationHeaders(config!)).toMatchObject({
      [AUTOMATION_SECRET_HEADER]: "legacy-secret",
      [LEGACY_AUTOMATION_SECRET_HEADER]: "legacy-secret",
    })
  })

  it("rejects insecure non-local webhook URLs", () => {
    expect(resolveServiceRequestAutomation({
      HORIZON_AUTOMATION_SERVICE_REQUEST_WEBHOOK_URL: "http://example.test/hook",
      HORIZON_AUTOMATION_WEBHOOK_SECRET: "secret",
    })).toBeNull()
  })
})
