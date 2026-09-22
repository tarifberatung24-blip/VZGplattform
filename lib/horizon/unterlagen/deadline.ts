/**
 * P16 — deadline evidence.
 *
 * A deadline is the most consequential thing an explained document can carry: act
 * late and the user loses money or a right. So this module never produces a date
 * it cannot point at. Three kinds are distinguished, and the distinction is the
 * whole point:
 *
 * - `printed` — a date appears in the document next to deadline wording. The exact
 *   matched text is returned so the user can see what the claim rests on.
 * - `calculated` — the document states a *rule* ("innerhalb von zwei Wochen") and
 *   a reference date, and the date is arithmetic over those two printed facts. It
 *   is still flagged `requiresUserVerification`, because a rule read from one
 *   clause may be qualified elsewhere in the document.
 * - `unknown` — nothing supports a date. This is reported as unknown, never
 *   guessed, never defaulted to "soon", and never omitted so the user assumes
 *   there is none.
 *
 * No German statutory period is hardcoded here. A period is only used when the
 * document itself states it, which is why this module can serve an arbitrary
 * incoming letter rather than one known process.
 */

export const DEADLINE_EVIDENCE_KINDS = ["printed", "calculated", "unknown"] as const
export type DeadlineEvidenceKind = (typeof DEADLINE_EVIDENCE_KINDS)[number]

export type DeadlineEvidence = {
  kind: DeadlineEvidenceKind
  /** ISO date, only for a kind that supports one. */
  date: string | null
  /** The verbatim text the evidence rests on, so nothing is asserted unquoted. */
  quote: string | null
  /** The rule that produced a calculated date, for display and audit. */
  rule: string | null
  /** True when the user must confirm before relying on this date. */
  requiresUserVerification: boolean
}

/**
 * Deadline wording that may introduce a date.
 *
 * Deliberately short and literal. A long keyword list would start matching
 * incidental words and produce confident-looking hits from ordinary prose, which
 * is the failure mode this module exists to avoid.
 */
const DEADLINE_MARKERS = [
  "frist",
  "bis zum",
  "bis spätestens",
  "spätestens",
  "zahlbar bis",
  "innerhalb von",
  "fristgerecht",
  "antragsfrist",
  "widerspruchsfrist",
  "kündigungsfrist",
] as const

const MONTHS_DE: Record<string, number> = {
  januar: 1,
  februar: 2,
  märz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
}

/** `12.03.2026` / `12.3.26` — the numeric form used in most German letters. */
const NUMERIC_DATE = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/
/** `12. März 2026` — the written-out form. */
const WRITTEN_DATE = /\b(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s*(\d{4})\b/

/** A period stated in the document: `innerhalb von zwei Wochen`, `innerhalb 14 Tagen`. */
const PERIOD =
  /innerhalb\s+(?:von\s+)?(\d{1,3}|zwei|drei|vier|sechs|acht|zwölf|ein|eine)\s+(tag(?:en)?|woche(?:n)?|monat(?:en)?|jahr(?:en)?)/i

const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  eine: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  sechs: 6,
  acht: 8,
  zwölf: 12,
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

function toIso(year: number, month: number, day: number): string | null {
  // A two-digit year is expanded into the 2000s; anything else is refused rather
  // than guessed, because a wrong century is a wrong deadline.
  const full = year < 100 ? 2000 + year : year
  if (!isRealDate(full, month, day)) return null
  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${full}-${mm}-${dd}`
}

/** The first date in a line, as ISO, or null. */
function firstDateIn(line: string): string | null {
  const numeric = NUMERIC_DATE.exec(line)
  if (numeric) {
    const iso = toIso(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]))
    if (iso) return iso
  }
  const written = WRITTEN_DATE.exec(line)
  if (written) {
    const month = MONTHS_DE[written[2].toLowerCase()]
    if (month) {
      const iso = toIso(Number(written[3]), month, Number(written[1]))
      if (iso) return iso
    }
  }
  return null
}

function lineHasDeadlineMarker(line: string): boolean {
  const lower = line.toLowerCase()
  return DEADLINE_MARKERS.some((marker) => lower.includes(marker))
}

function addPeriod(isoDate: string, amount: number, unit: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  const lower = unit.toLowerCase()
  if (lower.startsWith("tag")) {
    date.setUTCDate(date.getUTCDate() + amount)
  } else if (lower.startsWith("woche")) {
    date.setUTCDate(date.getUTCDate() + amount * 7)
  } else if (lower.startsWith("monat")) {
    // Calendar-aware: adding a month to 31.01 must land in February, not March.
    const day = date.getUTCDate()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + amount)
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate()
    date.setUTCDate(Math.min(day, lastDay))
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + amount)
  }
  return date.toISOString().slice(0, 10)
}

/**
 * Reads deadline evidence out of document text.
 *
 * Pass one looks for a date printed beside deadline wording — the strongest
 * evidence, quoted verbatim. Pass two looks for a stated period applied to a
 * stated reference date; that is arithmetic over two printed facts and is marked
 * for user verification. Otherwise the answer is `unknown`.
 */
export function findDeadlineEvidence(text: string): DeadlineEvidence {
  const unknown: DeadlineEvidence = {
    kind: "unknown",
    date: null,
    quote: null,
    rule: null,
    requiresUserVerification: true,
  }

  if (typeof text !== "string" || text.trim() === "") return unknown

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Pass 1 — a date on a line that also carries deadline wording.
  for (const line of lines) {
    if (!lineHasDeadlineMarker(line)) continue
    const date = firstDateIn(line)
    if (date) {
      return {
        kind: "printed",
        date,
        quote: line,
        rule: null,
        requiresUserVerification: false,
      }
    }
  }

  // Pass 2 — a stated period plus a stated reference date.
  const documentDate =
    lines.map((line) => firstDateIn(line)).find((value) => value !== null) ?? null

  for (const line of lines) {
    const period = PERIOD.exec(line)
    if (!period) continue
    const rawAmount = period[1].toLowerCase()
    const amount = /^\d+$/.test(rawAmount)
      ? Number(rawAmount)
      : (NUMBER_WORDS[rawAmount] ?? null)
    if (amount === null) continue

    // The reference date may sit on the period line or anywhere in the document.
    const reference = firstDateIn(line) ?? documentDate
    if (!reference) continue

    const date = addPeriod(reference, amount, period[2])
    return {
      kind: "calculated",
      date,
      quote: line,
      rule: `innerhalb von ${amount} ${period[2]} ab ${reference}`,
      requiresUserVerification: true,
    }
  }

  return unknown
}
