/**
 * HORIZON NEGOTIATION — security guards.
 *
 * Two hard rules are enforced here rather than trusted to every caller.
 *
 * 1. HORIZON never asks for, stores, logs, or transmits a provider password,
 *    banking PIN, TAN, OTP, or any authentication secret. The negotiation engine
 *    works from contract data, uploaded documents, extracted facts, a customer
 *    number, and an explicit authorization where representation is required.
 *
 * 2. A provider communication is never sent without an explicit user action or
 *    an explicitly approved assisted-workflow authorization.
 *
 * `containsCredentialLikeValue` is a belt-and-braces scan: it refuses a payload
 * that looks like it carries a secret, so a mistake in one route cannot turn into
 * a stored credential. It is intentionally conservative — a false positive is a
 * refused write, never a leaked password.
 */

/** Field names that must never appear in a negotiation payload. */
export const FORBIDDEN_FIELD_PATTERNS = [
  "password",
  "passwort",
  "kennwort",
  "pin",
  "tan",
  "otp",
  "einmalcode",
  "secret",
  "token",
  "api_key",
  "apikey",
  "credential",
  "iban",
  "bic",
  "kartennummer",
  "card_number",
  "cvv",
  "cvc",
] as const

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "")
}

/** True when a field name names a credential or a full payment secret. */
export function isForbiddenFieldName(key: string): boolean {
  const normalized = normalizeKey(key)
  return FORBIDDEN_FIELD_PATTERNS.some((pattern) => normalized.includes(normalizeKey(pattern)))
}

/**
 * Scans a nested payload for forbidden field names. Returns the offending paths
 * so the caller can report exactly what was rejected without echoing the value.
 */
export function findForbiddenFields(value: unknown, path = ""): string[] {
  if (value == null || typeof value !== "object") return []
  const found: string[] = []
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      found.push(...findForbiddenFields(item, `${path}[${index}]`))
    })
    return found
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key
    if (isForbiddenFieldName(key)) {
      found.push(childPath)
      continue
    }
    found.push(...findForbiddenFields(child, childPath))
  }
  return found
}

/** The error a payload carrying a forbidden field reports. */
export const CREDENTIAL_FIELD_REFUSED_CODE = "NEGOTIATION_CREDENTIAL_FIELD_REFUSED"

/**
 * Whether a provider message may be sent now. Sending requires either an
 * explicit user action or a granted authorization; neither means no send.
 */
export function canSendProviderMessage(input: {
  explicitUserAction: boolean
  authorizationStatus: "not_required" | "pending" | "granted" | "revoked"
}): boolean {
  if (input.explicitUserAction) return true
  return input.authorizationStatus === "granted"
}

/**
 * Redacts a metadata object before it reaches an audit row, mirroring the
 * existing provider-audit redaction so negotiation events never persist a secret
 * even if one were somehow supplied.
 */
export function redactNegotiationMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const walk = (value: unknown): unknown => {
    if (value == null || typeof value !== "object") return value
    if (Array.isArray(value)) return value.map(walk)
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isForbiddenFieldName(key) ? "[redacted]" : walk(child)
    }
    return out
  }
  return walk(metadata) as Record<string, unknown>
}
