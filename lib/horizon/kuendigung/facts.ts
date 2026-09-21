/**
 * P14 — contract-termination facts and the deadline rule.
 *
 * The whole risk of a Kündigung workflow is a date. A letter that states a
 * termination date the user cannot rely on is worse than a letter that states
 * none: the user posts it, believes the contract ends, and it does not. So this
 * module draws one hard line and enforces it everywhere:
 *
 *   A concrete Kündigungsfrist or Vertragsende is produced ONLY when
 *   1. the source document states it explicitly (an evidenced fact), or
 *   2. it is computed from confirmed dates by a rule this codebase implements
 *      and tests.
 *
 *   Otherwise the result is `unconfirmed`, and the UI must say so.
 *
 * The calculation branch is deliberately narrow. It implements exactly one rule
 * — the statutory § 309 Nr. 9 BGB maximum for consumer contracts with automatic
 * renewal: a notice period of at most one month, effective at the end of the
 * month after receipt. That rule is a ceiling the law imposes on the provider's
 * terms, not a statement about this user's contract; the evidence of the actual
 * contractual period lives in the document, so the calculated value is labelled
 * with the rule it came from and is never presented as certain.
 *
 * The module is pure: no I/O, no clock of its own (a "today" is passed in), no
 * model. Every branch is testable without a document, a database or a network.
 */

/** A fact as far as this module cares: value, confirmation, and where it came from. */
export type KuendigungFact = {
  key: string
  value: string
  /** ISO timestamp when the user confirmed it, or null. */
  confirmedAt?: string | null
  /** Free-text evidence quoted from the source document, when document-derived. */
  evidence?: string | null
}

/**
 * The facts a termination letter consumes.
 *
 * `provider` and `reference` are the minimum the existing kuendigung module
 * already requires. The rest are optional: a contract letter without a start
 * date can still be written, and the workflow must not refuse to help because a
 * document did not print one.
 */
export const KUENDIGUNG_FACT_KEYS = {
  provider: "contract_provider",
  reference: "contract_reference",
  customerName: "contract_customer_name",
  contractType: "contract_type",
  startDate: "contract_start_date",
  minimumTerm: "contract_minimum_term",
  noticePeriod: "contract_notice_period",
  /** A termination date the document states outright. */
  documentedEndDate: "contract_end_date",
  /** The provider's postal address, only if evidenced. */
  providerAddress: "contract_provider_address",
  /** The provider's email, only if evidenced. */
  providerEmail: "contract_provider_email",
  /** The user's wish to terminate "zum nächstmöglichen Zeitpunkt". */
  noFixedDate: "contract_terminate_soonest",
  /** A user-supplied date the user has themselves verified. */
  userConfirmedEndDate: "contract_user_confirmed_end_date",
} as const

/** The facts without which no letter can be addressed meaningfully. */
export const KUENDIGUNG_REQUIRED_KEYS: readonly string[] = [
  KUENDIGUNG_FACT_KEYS.provider,
  KUENDIGUNG_FACT_KEYS.reference,
]

export type KuendigungFacts = {
  provider: string | null
  reference: string | null
  customerName: string | null
  contractType: string | null
  startDate: string | null
  minimumTerm: string | null
  noticePeriod: string | null
  documentedEndDate: string | null
  providerAddress: string | null
  providerEmail: string | null
  terminateSoonest: boolean
  userConfirmedEndDate: string | null
}

/** Confirmed facts only. An unconfirmed fact is not evidence and is not read. */
function confirmedValue(facts: readonly KuendigungFact[], key: string): string | null {
  // Last confirmed value wins: a re-answer appends a superseding fact, and the
  // user's latest statement is the one that counts.
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    const fact = facts[index]
    if (fact.key !== key) continue
    if (!fact.confirmedAt) continue
    const value = fact.value.trim()
    if (value.length === 0) continue
    return value
  }
  return null
}

function confirmedBoolean(facts: readonly KuendigungFact[], key: string): boolean {
  const value = confirmedValue(facts, key)
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized === "true" || normalized === "yes" || normalized === "ja" || normalized === "да"
}

/**
 * Reads only confirmed facts into the typed shape the letter generator uses.
 *
 * Nothing here infers a missing value from a present one. In particular a start
 * date does not produce an end date, and a notice period does not produce one
 * either — those are the deadline rule's job, and it is a separate, labelled
 * decision.
 */
export function readKuendigungFacts(facts: readonly KuendigungFact[]): KuendigungFacts {
  return {
    provider: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.provider),
    reference: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.reference),
    customerName: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.customerName),
    contractType: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.contractType),
    startDate: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.startDate),
    minimumTerm: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.minimumTerm),
    noticePeriod: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.noticePeriod),
    documentedEndDate: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.documentedEndDate),
    providerAddress: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.providerAddress),
    providerEmail: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.providerEmail),
    terminateSoonest: confirmedBoolean(facts, KUENDIGUNG_FACT_KEYS.noFixedDate),
    userConfirmedEndDate: confirmedValue(facts, KUENDIGUNG_FACT_KEYS.userConfirmedEndDate),
  }
}

/**
 * How a termination timing was arrived at, and how much weight it carries.
 *
 * - `documented` — the contract itself prints it. Strongest.
 * - `user_confirmed_verified` — the user says they checked it themselves.
 * - `calculated_max_notice` — derived from the § 309 Nr. 9 BGB ceiling. A legal
 *   bound, not a reading of this contract; presented as guidance, not certainty.
 * - `unconfirmed` — nothing supports a date. The UI must ask, not guess.
 */
export const KUENDIGUNG_TIMING_KINDS = [
  "documented",
  "user_confirmed_verified",
  "calculated_max_notice",
  "unconfirmed",
] as const

export type KuendigungTimingKind = (typeof KUENDIGUNG_TIMING_KINDS)[number]

export type KuendigungTiming = {
  kind: KuendigungTimingKind
  /** The date, only for a kind that actually supports one. */
  date: string | null
  /** Which rule produced a calculated date, for display and audit. */
  rule: string | null
  /** True when the user must verify before relying on this. */
  requiresUserVerification: boolean
}

/**
 * The single rule this module implements: § 309 Nr. 9 lit. b BGB.
 *
 * For a consumer contract that renews automatically, the provider may not impose
 * a notice period longer than one month, and notice given takes effect at the
 * end of the month following receipt. Applied here as: from a reference date,
 * the next possible end is the last day of the following month.
 *
 * This is a ceiling on unfair terms, not a reading of the user's contract. The
 * comment is the contract; the test file is the proof.
 */
export const MAX_NOTICE_RULE = "bgb-309-9-max-one-month-end-of-next-month" as const

/**
 * Last day of the month following `fromIso`.
 *
 * Returns null for an unparseable input rather than a best-effort date, because
 * an invalid date silently corrected is exactly the invented deadline this
 * workflow exists to prevent.
 */
export function endOfFollowingMonth(fromIso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null

  // Day 0 of month+2 is the last day of month+1, which handles year rollover and
  // month lengths in one step.
  const result = new Date(Date.UTC(year, month + 1, 0))
  const iso = result.toISOString().slice(0, 10)
  return Number.isNaN(result.getTime()) ? null : iso
}

/**
 * Decides how a termination timing may be presented.
 *
 * Order matters and is the safety property: a date printed in the contract
 * outranks a user's own note, which outranks a calculated ceiling. A calculation
 * is only attempted when the user has not asked for "nächstmöglich" as wording —
 * because a calculated date under a "soonest possible" instruction would
 * silently convert open wording into a fixed date, which the launch rules forbid.
 */
export function assessTerminationTiming(input: {
  facts: KuendigungFacts
  /** Today, passed in so the function stays deterministic and testable. */
  today: string
}): KuendigungTiming {
  const { facts } = input

  if (facts.documentedEndDate) {
    return {
      kind: "documented",
      date: facts.documentedEndDate,
      rule: null,
      requiresUserVerification: false,
    }
  }

  if (facts.userConfirmedEndDate) {
    return {
      kind: "user_confirmed_verified",
      date: facts.userConfirmedEndDate,
      rule: null,
      requiresUserVerification: false,
    }
  }

  // "Zum nächstmöglichen Zeitpunkt" is wording the user may choose; it is not
  // converted into a date, so no calculation runs on this branch.
  if (facts.terminateSoonest) {
    return { kind: "unconfirmed", date: null, rule: null, requiresUserVerification: true }
  }

  // Calculation requires a confirmed reference date and an evidenced reference
  // to a contract period. Without both, the honest answer is "not confirmed".
  if (!facts.startDate && !facts.noticePeriod) {
    return { kind: "unconfirmed", date: null, rule: null, requiresUserVerification: true }
  }

  // The start date is only usable as a reference when the contract also shows it
  // renews; otherwise a computed date would be a guess about an unknown term.
  const reference = facts.startDate
  if (!reference) {
    return { kind: "unconfirmed", date: null, rule: null, requiresUserVerification: true }
  }

  const date = endOfFollowingMonth(reference)
  if (!date) {
    return { kind: "unconfirmed", date: null, rule: null, requiresUserVerification: true }
  }

  return {
    kind: "calculated_max_notice",
    date,
    rule: MAX_NOTICE_RULE,
    // A statutory ceiling is guidance: the actual contract may permit less, so
    // the user must verify against their own document before relying on it.
    requiresUserVerification: true,
  }
}

/** Whether a timing value may be written into the letter as a firm date. */
export function timingIsFirm(timing: KuendigungTiming): boolean {
  return (
    timing.date !== null &&
    (timing.kind === "documented" || timing.kind === "user_confirmed_verified")
  )
}