import { afterEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

/**
 * The health endpoint is the one place an operator looks to decide whether a
 * deployment is usable. These tests fix the contract that matters: liveness stays
 * unconditional, capability reflects configuration, and no secret value is ever
 * echoed.
 */
async function readHealth() {
  const response = await GET()
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("health endpoint", () => {
  it("reports ok even when nothing is configured", async () => {
    vi.stubEnv("HORIZON_SMTP_HOST", "")
    vi.stubEnv("HORIZON_SMTP_PORT", "")
    vi.stubEnv("HORIZON_SMTP_USER", "")
    vi.stubEnv("HORIZON_SMTP_PASSWORD", "")
    vi.stubEnv("HORIZON_SMTP_FROM", "")
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "")

    const { status, body } = await readHealth()

    // Liveness must not depend on configuration, or a restart probe would loop.
    expect(status).toBe(200)
    expect(body.status).toBe("ok")
    const capabilities = body.capabilities as { send: boolean; automationHandoff: boolean }
    expect(capabilities.send).toBe(false)
    expect(capabilities.automationHandoff).toBe(false)
  })

  it("reports send capability when SMTP is fully configured", async () => {
    vi.stubEnv("HORIZON_SMTP_HOST", "smtp.example.com")
    vi.stubEnv("HORIZON_SMTP_PORT", "465")
    vi.stubEnv("HORIZON_SMTP_USER", "mailer")
    vi.stubEnv("HORIZON_SMTP_PASSWORD", "secret-value")
    vi.stubEnv("HORIZON_SMTP_FROM", "no-reply@example.com")

    const { body } = await readHealth()

    const capabilities = body.capabilities as { send: boolean }
    expect(capabilities.send).toBe(true)
  })

  it("never echoes a secret value or the SMTP host", async () => {
    vi.stubEnv("HORIZON_SMTP_HOST", "smtp.example.com")
    vi.stubEnv("HORIZON_SMTP_PORT", "465")
    vi.stubEnv("HORIZON_SMTP_USER", "mailer")
    vi.stubEnv("HORIZON_SMTP_PASSWORD", "secret-value")
    vi.stubEnv("HORIZON_SMTP_FROM", "no-reply@example.com")

    const { body } = await readHealth()
    const serialized = JSON.stringify(body)

    expect(serialized).not.toContain("secret-value")
    expect(serialized).not.toContain("smtp.example.com")
    expect(serialized).not.toContain("mailer")
  })

  it("accepts an https automation webhook and refuses a plain-http one", async () => {
    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "https://hooks.example.com/x")
    let { body } = await readHealth()
    expect((body.capabilities as { automationHandoff: boolean }).automationHandoff).toBe(true)

    vi.stubEnv("AUTOMATION_WEBHOOK_URL", "http://hooks.example.com/x")
    ;({ body } = await readHealth())
    expect((body.capabilities as { automationHandoff: boolean }).automationHandoff).toBe(false)
  })
})
