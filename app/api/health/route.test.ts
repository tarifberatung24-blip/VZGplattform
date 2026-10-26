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
    const capabilities = body.capabilities as {
      smtp: boolean
      smtpMissingEnv: string[]
      googleSender: boolean
      automationHandoff: boolean
    }
    expect(capabilities.smtp).toBe(false)
    expect(capabilities.automationHandoff).toBe(false)
    // The operator is told exactly which variables are absent, and nothing more.
    expect(capabilities.smtpMissingEnv).toContain("HORIZON_SMTP_HOST")
    expect(capabilities.smtpMissingEnv).toContain("HORIZON_SMTP_PASSWORD")
    expect(capabilities.googleSender).toBe(false)
  })

  it("names only the environment variables that must be set", async () => {
    vi.stubEnv("HORIZON_SMTP_HOST", "smtp.example.com")
    vi.stubEnv("HORIZON_SMTP_PORT", "465")
    vi.stubEnv("HORIZON_SMTP_USER", "mailer")
    vi.stubEnv("HORIZON_SMTP_PASSWORD", "secret-value")
    vi.stubEnv("HORIZON_SMTP_FROM", "")

    const { body } = await readHealth()
    const capabilities = body.capabilities as { smtp: boolean; smtpMissingEnv: string[] }

    expect(capabilities.smtp).toBe(false)
    expect(capabilities.smtpMissingEnv).toEqual(["HORIZON_SMTP_FROM"])
  })

  it("reports smtp capability when SMTP is fully configured", async () => {
    vi.stubEnv("HORIZON_SMTP_HOST", "smtp.example.com")
    vi.stubEnv("HORIZON_SMTP_PORT", "465")
    vi.stubEnv("HORIZON_SMTP_USER", "mailer")
    vi.stubEnv("HORIZON_SMTP_PASSWORD", "secret-value")
    vi.stubEnv("HORIZON_SMTP_FROM", "no-reply@example.com")

    const { body } = await readHealth()

    const capabilities = body.capabilities as { smtp: boolean; smtpMissingEnv: string[] }
    expect(capabilities.smtp).toBe(true)
    expect(capabilities.smtpMissingEnv).toEqual([])
  })

  it("reports the second transport independently of SMTP", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "")
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "")
    let { body } = await readHealth()
    expect((body.capabilities as { googleSender: boolean }).googleSender).toBe(false)

    // A configured Google client means a signed-in user can send from their own
    // mailbox even though the server-side relay is absent. The two must not be
    // conflated into one "send" flag.
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id")
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret")
    ;({ body } = await readHealth())
    const capabilities = body.capabilities as { googleSender: boolean; smtp: boolean }
    expect(capabilities.googleSender).toBe(true)
    expect(capabilities.smtp).toBe(false)
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
