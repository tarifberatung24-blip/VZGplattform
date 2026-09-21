import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { readSmtpConfig, describeSmtpConfig } from "./smtp-config"

/** A complete, valid configuration, used as the baseline for each test. */
const VALID = {
  HORIZON_SMTP_HOST: "smtp.example.test",
  HORIZON_SMTP_PORT: "587",
  HORIZON_SMTP_USER: "mailer@example.test",
  HORIZON_SMTP_PASSWORD: "not-a-real-password",
  HORIZON_SMTP_FROM: "no-reply@example.test",
}

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { ...VALID, ...overrides } as unknown as NodeJS.ProcessEnv
}

describe("smtp configuration", () => {
  it("accepts a complete configuration", () => {
    const result = readSmtpConfig(env())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.port).toBe(587)
    // 587 is the STARTTLS port; choosing implicit TLS here would try to handshake
    // before the server has offered to.
    expect(result.config.secure).toBe(false)
  })

  it("defaults to implicit TLS on port 465", () => {
    const result = readSmtpConfig(env({ HORIZON_SMTP_PORT: "465" }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.secure).toBe(true)
  })

  it("honours an explicit secure flag over the port default", () => {
    const result = readSmtpConfig(env({ HORIZON_SMTP_PORT: "465", HORIZON_SMTP_SECURE: "false" }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.secure).toBe(false)
  })

  it("treats missing configuration as absent rather than partially usable", () => {
    const result = readSmtpConfig({} as NodeJS.ProcessEnv)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.missing).toContain("HORIZON_SMTP_HOST")
    expect(result.missing).toContain("HORIZON_SMTP_PORT")
    expect(result.missing).toContain("HORIZON_SMTP_USER")
    expect(result.missing).toContain("HORIZON_SMTP_PASSWORD")
    expect(result.missing).toContain("HORIZON_SMTP_FROM")
  })

  it("refuses a configuration missing only the password", () => {
    // The dangerous case: everything else is present, so a partially-configured
    // relay could look usable. An empty password is a mistake, not a credential.
    const result = readSmtpConfig(env({ HORIZON_SMTP_PASSWORD: undefined }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.missing).toEqual(["HORIZON_SMTP_PASSWORD"])
  })

  it("treats a blank password as absent", () => {
    const result = readSmtpConfig(env({ HORIZON_SMTP_PASSWORD: "" }))
    expect(result.ok).toBe(false)
  })

  it("rejects an out-of-range port", () => {
    for (const port of ["0", "70000", "-1", "not-a-port", "587.5"]) {
      const result = readSmtpConfig(env({ HORIZON_SMTP_PORT: port }))
      expect(result.ok, `port ${port} must be refused`).toBe(false)
      if (result.ok) continue
      expect(result.invalid).toContain("HORIZON_SMTP_PORT")
    }
  })

  it("rejects an unparseable secure flag instead of falling back", () => {
    // Falling back would risk sending in the clear because of a typo.
    const result = readSmtpConfig(env({ HORIZON_SMTP_SECURE: "maybe" }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.invalid).toContain("HORIZON_SMTP_SECURE")
  })

  it("accepts the documented secure spellings", () => {
    for (const value of ["true", "1", "yes"]) {
      const result = readSmtpConfig(env({ HORIZON_SMTP_SECURE: value }))
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.config.secure).toBe(true)
    }
    for (const value of ["false", "0", "no"]) {
      const result = readSmtpConfig(env({ HORIZON_SMTP_SECURE: value }))
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.config.secure).toBe(false)
    }
  })

  it("rejects a sender that is not an address", () => {
    for (const from of ["not-an-address", "a@b", "a b@c.de"]) {
      const result = readSmtpConfig(env({ HORIZON_SMTP_FROM: from }))
      expect(result.ok, `from ${from} must be refused`).toBe(false)
      if (result.ok) continue
      expect(result.invalid).toContain("HORIZON_SMTP_FROM")
    }
  })

  it("never exposes credentials or host in the description", () => {
    const ok = describeSmtpConfig(readSmtpConfig(env()))
    expect(ok).not.toContain("not-a-real-password")
    expect(ok).not.toContain("smtp.example.test")
    expect(ok).not.toContain("mailer@example.test")

    const bad = describeSmtpConfig(readSmtpConfig({} as NodeJS.ProcessEnv))
    // Variable names are safe to report; their values are not.
    expect(bad).toContain("HORIZON_SMTP_HOST")
    expect(bad).not.toContain("not-a-real-password")
  })

  it("carries an optional HELO name only when set", () => {
    const without = readSmtpConfig(env())
    expect(without.ok).toBe(true)
    if (without.ok) expect(without.config.heloName).toBeUndefined()

    const with_ = readSmtpConfig(env({ HORIZON_SMTP_HELO_NAME: "mail.example.test" }))
    expect(with_.ok).toBe(true)
    if (with_.ok) expect(with_.config.heloName).toBe("mail.example.test")
  })
})