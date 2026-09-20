/**
 * P11 — recipient handling.
 *
 * A message is only ever addressed to a recipient that already exists as
 * recorded data and that the user has explicitly confirmed. There is no path in
 * this module that synthesises an address, fills one in from a case, or guesses
 * a likely authority mailbox: an authority's address is exactly the kind of
 * value that must not be inferred, because a wrong-but-plausible address sends a
 * customer's documents to an unrelated third party.
 *
 * So the only accepted source is the draft's own `recipient`, which the user
 * authored or approved, plus an explicit confirmation flag for this send. When
 * it is absent or malformed the send is refused with a reason; it is never
 * repaired silently.
 */

/**
 * Deliberately conservative. A "valid-looking" address is not the standard here:
 * the standard is "an address the user actually meant". This pattern rejects the
 * shapes that most often indicate a typo or an injected value, and everything it
 * accepts is still shown to the user for confirmation before sending.
 */
const ADDRESS_PATTERN = /^[^\s@,;:"'<>()[\]]+@[^\s@,;:"'<>()[\]]+\.[A-Za-z]{2,}$/

export type RecipientRefusal =
  | "RECIPIENT_MISSING"
  | "RECIPIENT_MALFORMED"
  | "RECIPIENT_NOT_CONFIRMED"

export type RecipientCheck =
  | { ok: true; to: string }
  | { ok: false; code: RecipientRefusal }

/**
 * Validates the recipient for a send.
 *
 * `confirmed` must come from an explicit user action on this exact address; a
 * default or a pre-filled value is not confirmation. The returned address is
 * trimmed, never rewritten — lowercasing a local part can change which mailbox
 * receives a message, so casing is preserved exactly as recorded.
 */
export function checkRecipient(input: {
  recipient: string | null | undefined
  confirmed: boolean
}): RecipientCheck {
  const raw = input.recipient?.trim()
  if (!raw) return { ok: false, code: "RECIPIENT_MISSING" }
  if (!ADDRESS_PATTERN.test(raw)) return { ok: false, code: "RECIPIENT_MALFORMED" }
  if (!input.confirmed) return { ok: false, code: "RECIPIENT_NOT_CONFIRMED" }
  return { ok: true, to: raw }
}

/**
 * A redacted form for audit records and logs. The local part is partly masked so
 * an audit row does not become a plaintext copy of a customer's contact details,
 * while still being specific enough to tell two recipients apart.
 */
export function redactRecipient(address: string): string {
  const at = address.lastIndexOf("@")
  if (at <= 0) return "***"
  const local = address.slice(0, at)
  const domain = address.slice(at)
  if (local.length <= 2) return `${local[0] ?? "*"}***${domain}`
  return `${local.slice(0, 2)}***${domain}`
}