/**
 * Shared authentication for the affiliate operator endpoints.
 *
 * The automation/orchestrator calls the callback and conversion routes with a
 * shared secret. Both routes mutate customer/commission data, so the guard is
 * centralised here: constant-time comparison, and "disabled when unset" rather
 * than "open when unset".
 */

export const OPERATOR_SECRET_HEADER = "x-horizon-operator-secret"

/** Minimum length accepted for the shared secret. Shorter values are treated as unset. */
export const MIN_OPERATOR_SECRET_LENGTH = 16

export function readOperatorSecret(): string | null {
  const value = process.env.AFFILIATE_OPERATOR_SECRET?.trim()
  return value && value.length >= MIN_OPERATOR_SECRET_LENGTH ? value : null
}

/** Compare two strings without an early return, to avoid leaking the secret through timing. */
export function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export type OperatorAuth = { ok: true } | { ok: false; status: 503 | 401; code: string }

export function authorizeOperator(request: Request): OperatorAuth {
  const expected = readOperatorSecret()
  if (!expected) return { ok: false, status: 503, code: "OPERATOR_CALLBACK_NOT_CONFIGURED" }
  if (!secretMatches(request.headers.get(OPERATOR_SECRET_HEADER), expected)) {
    return { ok: false, status: 401, code: "UNAUTHORIZED" }
  }
  return { ok: true }
}
