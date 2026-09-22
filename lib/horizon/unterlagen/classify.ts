/**
 * P16 — document classification and uncertainty-aware risk assessment.
 *
 * Two rules govern everything here.
 *
 * **Classification is a label, not a conclusion.** A document is sorted into the
 * closest matching kind from *printed cues only* (letterhead words, form names,
 * subject-line wording). When nothing matches clearly, the answer is `unclear`
 * rather than the nearest guess, because a wrong label changes how the rest of the
 * workflow treats the document.
 *
 * **Risk language states its own uncertainty.** The three states below are
 * deliberately asymmetric:
 *
 * - `signals_detected` — the text contains wording that *resembles* known scam or
 *   pressure patterns. This is a prompt to look carefully, and it names the exact
 *   phrase it reacted to. It is never a claim that the sender is fraudulent.
 * - `no_obvious_signals` — none of the patterns matched. This is *not* a
 *   reassurance that the document is safe; absence of a match is absence of
 *   evidence, not evidence of absence.
 * - `cannot_determine` — there is not enough text to assess at all.
 *
 * Nothing here accuses anyone of wrongdoing. A false accusation against a real
 * authority or provider is a serious harm, and pattern matching cannot support one.
 */

export const DOCUMENT_KINDS = [
  "behoerdenbescheid",
  "rechnung",
  "vertrag",
  "kuendigung",
  "mahnung",
  "antrag",
  "formular",
  "mitteilung",
  "unclear",
] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export type ClassificationResult = {
  kind: DocumentKind
  /** The printed phrase the label rests on, quoted, or null for `unclear`. */
  evidence: string | null
  /** Ranked alternatives, so the user can correct a wrong label. */
  alternatives: readonly DocumentKind[]
}

/**
 * Cues per kind, most specific first.
 *
 * Order matters: a Kündigung from an authority is still a Kündigung, so the
 * specific contract-termination wording is tested before the general
 * authority-letter wording.
 */
const KIND_CUES: readonly { kind: DocumentKind; cues: readonly string[] }[] = [
  { kind: "kuendigung", cues: ["kündigung", "kuendigung", "kündige ich", "beendigung des vertrags"] },
  { kind: "mahnung", cues: ["mahnung", "zahlungserinnerung", "letzte mahnung", "verzug"] },
  { kind: "behoerdenbescheid", cues: ["bescheid", "widerspruchsbelehrung", "festsetzung", "bewilligungsbescheid", "ablehnungsbescheid"] },
  { kind: "rechnung", cues: ["rechnung", "rechnungsnummer", "zahlbetrag", "fällig am", "faellig am"] },
  { kind: "vertrag", cues: ["vertrag", "vertragsnummer", "vertragslaufzeit", "agb", "vereinbarung"] },
  { kind: "antrag", cues: ["antrag", "antragsformular", "hiermit beantrage"] },
  { kind: "formular", cues: ["anlage", "formular", "bitte ausfüllen", "felder ausfüllen"] },
  { kind: "mitteilung", cues: ["mitteilung", "information", "sehr geehrte", "wir informieren"] },
]

export function isDocumentKind(value: unknown): value is DocumentKind {
  return typeof value === "string" && (DOCUMENT_KINDS as readonly string[]).includes(value)
}

/**
 * Classifies a document from its text.
 *
 * Returns `unclear` with no evidence when no cue matches, and lists the kinds it
 * did match as alternatives, so the UI can offer a correction instead of
 * presenting a guess as fact.
 */
export function classifyDocument(text: string): ClassificationResult {
  if (typeof text !== "string" || text.trim() === "") {
    return { kind: "unclear", evidence: null, alternatives: [] }
  }

  const lower = text.toLowerCase()
  const matches: { kind: DocumentKind; evidence: string }[] = []

  for (const entry of KIND_CUES) {
    for (const cue of entry.cues) {
      const index = lower.indexOf(cue)
      if (index === -1) continue
      // Quote the surrounding line rather than the bare cue, so the evidence is
      // readable and its context is visible.
      const lineStart = lower.lastIndexOf("\n", index) + 1
      const lineEnd = lower.indexOf("\n", index)
      const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim()
      matches.push({ kind: entry.kind, evidence: line.slice(0, 200) })
      break
    }
  }

  if (matches.length === 0) return { kind: "unclear", evidence: null, alternatives: [] }

  return {
    kind: matches[0].kind,
    evidence: matches[0].evidence,
    alternatives: matches.slice(1).map((match) => match.kind),
  }
}

export const RISK_STATES = ["signals_detected", "no_obvious_signals", "cannot_determine"] as const
export type RiskState = (typeof RISK_STATES)[number]

export type RiskSignal = {
  /** Stable identifier, so the UI and audit log can name the same signal. */
  id: string
  /** The verbatim phrase the signal reacted to. */
  quote: string
}

export type RiskAssessment = {
  state: RiskState
  signals: readonly RiskSignal[]
  /**
   * Always present. States what this assessment can and cannot establish, so the
   * user never reads `no_obvious_signals` as a clearance.
   */
  caveat: string
}

/**
 * Pressure and impersonation patterns.
 *
 * These are *wording* patterns, not verdicts. Each carries an id so the exact
 * trigger is recorded, and the quote is returned so a user can judge it themselves.
 */
const RISK_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "payment_deadline_hours", pattern: /\binnerhalb von \d+\s*stunden\b/i },
  { id: "immediate_payment_demand", pattern: /\bsofort(?:ige)?\s+zahlung\b/i },
  { id: "gift_card_payment", pattern: /\bgeschenkkarte|\bgutscheinkarte|\bitunes\b|\bgoogle play\b/i },
  { id: "crypto_payment", pattern: /\bbitcoin\b|\bkrypto(?:währung)?\b|\bwallet-adresse\b/i },
  { id: "account_blocked_threat", pattern: /\bkonto (?:wird |werde )?(?:gesperrt|blockiert)\b/i },
  { id: "legal_threat_generic", pattern: /\bstrafanzeige\b|\bzwangsvollstreckung\b|\bpfändung\b/i },
  { id: "credential_request", pattern: /\bpasswort\b.{0,40}\b(?:bestätigen|eingeben|mitteilen)\b/i },
  { id: "unusual_sender_domain", pattern: /\b[a-z0-9-]+\.(?:top|xyz|click|zip|country)\b/i },
  { id: "prize_or_windfall", pattern: /\bgewinn(?:benachrichtigung)?\b|\bsie haben gewonnen\b/i },
]

const CAVEAT =
  "Diese Einschätzung prüft nur Formulierungen im vorliegenden Text. Sie ist kein Urteil über den Absender und keine Freigabe: auch ohne erkannte Muster kann ein Schreiben problematisch sein."

const CAVEAT_NO_TEXT =
  "Es liegt zu wenig Text vor, um Formulierungen zu prüfen. Eine Aussage über Risiken ist damit nicht möglich."

export const RISK_CAVEATS: Record<RiskState, string> = {
  signals_detected: CAVEAT,
  no_obvious_signals: CAVEAT,
  cannot_determine: CAVEAT_NO_TEXT,
}

/**
 * Assesses the wording of a document for scam-like or pressure patterns.
 *
 * Reports `cannot_determine` for text too short to assess rather than reporting
 * "no signals", which would imply the check actually ran.
 */
export function assessDocumentRisk(text: string): RiskAssessment {
  if (typeof text !== "string" || text.trim().length < 20) {
    return { state: "cannot_determine", signals: [], caveat: CAVEAT_NO_TEXT }
  }

  const signals: RiskSignal[] = []
  for (const entry of RISK_PATTERNS) {
    const match = entry.pattern.exec(text)
    if (match) signals.push({ id: entry.id, quote: match[0].slice(0, 200) })
  }

  if (signals.length === 0) {
    return { state: "no_obvious_signals", signals: [], caveat: CAVEAT }
  }
  return { state: "signals_detected", signals, caveat: CAVEAT }
}

export const NEXT_ACTIONS = [
  "verify_deadline",
  "review_risk_signals",
  "confirm_facts",
  "prepare_reply",
  "translate_document",
  "no_action_evident",
] as const
export type NextAction = (typeof NEXT_ACTIONS)[number]

/**
 * The single next step, derived from what was actually found.
 *
 * Priority is deliberate: an unverified deadline outranks everything, because
 * acting late is the loss that cannot be undone. Risk signals come next, then
 * unconfirmed facts, then a reply. When nothing was found, the answer says so
 * plainly instead of inventing work.
 */
export function recommendNextAction(input: {
  deadline: { kind: string; requiresUserVerification: boolean }
  risk: RiskState
  unconfirmedFactCount: number
  hasDraft?: boolean
}): NextAction {
  if (input.deadline.kind !== "unknown" && input.deadline.requiresUserVerification) {
    return "verify_deadline"
  }
  if (input.risk === "signals_detected") return "review_risk_signals"
  if (input.unconfirmedFactCount > 0) return "confirm_facts"
  if (input.deadline.kind === "printed") return "prepare_reply"
  if (input.hasDraft) return "prepare_reply"
  return "no_action_evident"
}
