/**
 * P11 — SMTP configuration.
 *
 * Everything here comes from server-side environment variables. Nothing has a
 * default that could silently point at the wrong server, and no credential is
 * ever embedded in code, logged, or returned in a result.
 *
 * Configuration is parsed as a whole and either yields a complete config or a
 * refusal naming the missing parts. A partially configured SMTP server is treated
 * as absent rather than as "probably fine": connecting with a guessed port or a
 * blank username risks handing a customer's official documents to whatever
 * answers on the other end.
 *
 * Deliberately not supported, because each would need an explicit owner decision:
 * relaying through a service that requires OAuth, accepting a self-signed
 * certificate, and ignoring a certificate mismatch.
 */

/** Everything a plain SMTP submission needs. */
export type SmtpConfig = {
  host: string
  port: number
  /** `true` for implicit TLS (465), `false` for STARTTLS upgrade (587). */
  secure: boolean
  auth: { user: string; pass: string }
  /** The envelope sender. Must be an address the SMTP server is allowed to use. */
  from: string
  /** Used for the Message-ID domain and HELO, when set. */
  heloName?: string
}

export type SmtpConfigResult =
  | { ok: true; config: SmtpConfig }
  | { ok: false; missing: readonly string[]; invalid: readonly string[] }

/**
 * Only accepts the two standard submission ports by default. An arbitrary port is
 * permitted, because private relays use custom ports, but it must at least be a
 * real port number.
 */
function parsePort(raw: string | undefined): number | null {
  if (!raw) return null
  // Digits only. `Number.parseInt` would accept "587.5" as 587 and silently
  // connect to a port the operator did not configure.
  if (!/^\d+$/.test(raw)) return null
  const port = Number.parseInt(raw, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return port
}

/**
 * `true`/`false` only, with `465`/`587` as the shorthand. An unrecognised value is
 * an error rather than a fallback: sending in the clear because a typo defaulted
 * to `false` is exactly the failure this avoids.
 */
function parseSecure(raw: string | undefined, port: number): boolean | null {
  if (raw === undefined || raw.trim() === "") return port === 465
  const value = raw.trim().toLowerCase()
  if (value === "true" || value === "1" || value === "yes") return true
  if (value === "false" || value === "0" || value === "no") return false
  return null
}

/**
 * Reads SMTP configuration from the server-side environment.
 *
 * Returns the missing and invalid names so the caller can surface a precise
 * reason without echoing any value — a variable *name* is safe to report, its
 * contents are not.
 */
export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfigResult {
  const host = env.HORIZON_SMTP_HOST?.trim()
  const portRaw = env.HORIZON_SMTP_PORT?.trim()
  const user = env.HORIZON_SMTP_USER?.trim()
  const pass = env.HORIZON_SMTP_PASSWORD
  const from = env.HORIZON_SMTP_FROM?.trim()
  const secureRaw = env.HORIZON_SMTP_SECURE?.trim()
  const heloName = env.HORIZON_SMTP_HELO_NAME?.trim()

  const missing: string[] = []
  const invalid: string[] = []

  // A blank password is treated as absent: an empty string is a configuration
  // mistake, not an intentional credential-less server.
  if (!host) missing.push("HORIZON_SMTP_HOST")
  if (!portRaw) missing.push("HORIZON_SMTP_PORT")
  if (!user) missing.push("HORIZON_SMTP_USER")
  if (!pass) missing.push("HORIZON_SMTP_PASSWORD")
  if (!from) missing.push("HORIZON_SMTP_FROM")

  const port = parsePort(portRaw)
  if (portRaw && port === null) invalid.push("HORIZON_SMTP_PORT")

  const secure = port === null ? null : parseSecure(secureRaw, port)
  if (secureRaw && secure === null) invalid.push("HORIZON_SMTP_SECURE")

  // A sender that is not an address would be rejected by the server anyway, but
  // failing here keeps the refusal before any connection is attempted.
  if (from && !/^[^\s@,;:"'<>()[\]]+@[^\s@,;:"'<>()[\]]+\.[A-Za-z]{2,}$/.test(from)) {
    invalid.push("HORIZON_SMTP_FROM")
  }

  if (missing.length > 0 || invalid.length > 0 || port === null || secure === null) {
    return { ok: false, missing, invalid }
  }

  return {
    ok: true,
    config: {
      host: host as string,
      port,
      secure,
      auth: { user: user as string, pass: pass as string },
      from: from as string,
      ...(heloName ? { heloName } : {}),
    },
  }
}

/**
 * A redacted summary safe to log or show. Contains no host, no username and no
 * password: a host and username are themselves sensitive for a private relay.
 */
export function describeSmtpConfig(result: SmtpConfigResult): string {
  if (!result.ok) {
    const parts: string[] = []
    if (result.missing.length > 0) parts.push(`missing=${result.missing.join(",")}`)
    if (result.invalid.length > 0) parts.push(`invalid=${result.invalid.join(",")}`)
    return parts.join(" ") || "missing=HORIZON_SMTP_HOST,HORIZON_SMTP_PORT,HORIZON_SMTP_USER,HORIZON_SMTP_PASSWORD,HORIZON_SMTP_FROM"
  }
  return result.config.secure ? "smtp=true" : "smtp=false"
}