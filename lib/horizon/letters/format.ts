/**
 * Shared date formatting for generated German letters.
 *
 * Every letter builder in this codebase obeys one rule about dates: a date is
 * either a plain ISO date the caller supplied, or it does not exist. A
 * best-effort parse of a half-typed value would print a date the user never
 * wrote, and on a letter to an authority or a landlord that is the worst
 * possible failure — the user acts on a deadline that was never theirs. So the
 * parse is strict and the fallback is null.
 *
 * Kept here rather than inside one module because more than one letter needs it,
 * and two implementations of "what is a German date" would eventually disagree.
 */

/** `2026-03-31` → `31.03.2026`. Returns null for anything not a plain ISO date. */
export function formatGermanDate(iso: string | null): string | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return null
  return `${match[3]}.${match[2]}.${match[1]}`
}
