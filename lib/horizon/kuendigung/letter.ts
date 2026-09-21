/**
 * P14 — deterministic German Kündigung letter.
 *
 * The letter is built from confirmed facts by rules, never by a model. The
 * Kündigung module is also allowed the `draft` AI capability, but that path is
 * for free-text assistance inside the case; the *document the user signs and
 * sends* is produced here, because a termination letter's dates and identifiers
 * must be reproducible and reviewable rather than sampled.
 *
 * Determinism is a requirement, not a nicety: the draft body is what P8 hashes
 * and the user approves. If two runs over the same facts produced different text
 * the approval would break on nothing more than a regeneration. So there is no
 * clock read here — the caller passes a date — and no map iteration that could
 * reorder, only an explicitly ordered list.
 *
 * What the letter never does:
 * - it never invents a Kündigungsfrist, a Vertragsende, a legal ground, a special
 *   right of termination, a recipient address or an email address;
 * - it never states or implies that the contract has ended, or that the letter
 *   has been received, merely because it was written;
 * - it never turns "zum nächstmöglichen Zeitpunkt" into a concrete date.
 *
 * Where a fact is absent the sentence that would have carried it is omitted. A
 * gap in the letter is honest; a filled gap is a defect.
 */

import {
  timingIsFirm,
  type KuendigungFacts,
  type KuendigungTiming,
} from "./facts"

export type KuendigungLetterInput = {
  facts: KuendigungFacts
  timing: KuendigungTiming
  /** ISO date of writing, so the letter is reproducible for a given day. */
  today: string
  /** Language of the user-facing explanation shown alongside the German letter. */
  locale: "de" | "bg"
}

export type KuendigungLetter = {
  subject: string
  body: string
  /** The person or organisation the letter is addressed to, from evidence only. */
  recipient: string | null
  /** Facts that were available but are not confirmed, surfaced for the user. */
  omittedFactKeys: readonly string[]
}

/** `2026-03-31` → `31.03.2026`. Returns null for anything not a plain ISO date. */
export function formatGermanDate(iso: string | null): string | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return null
  return `${match[3]}.${match[2]}.${match[1]}`
}

/**
 * Builds the letter.
 *
 * The timing block is the delicate part and is written in three distinct forms
 * depending on what is actually supported. A calculated date is never written as
 * if it were contractual, and an unsupported timing produces open wording plus an
 * explicit note rather than a date.
 */
export function buildKuendigungLetter(input: KuendigungLetterInput): KuendigungLetter {
  const { facts, timing, today } = input
  const omittedFactKeys: string[] = []

  const provider = facts.provider
  const reference = facts.reference

  const subject = reference
    ? `Kündigung ${reference}`
    : provider
      ? `Kündigung meines Vertrags bei ${provider}`
      : "Kündigung meines Vertrags"

  const lines: string[] = []

  if (facts.customerName) lines.push(facts.customerName)
  if (reference) lines.push(`Vertrags-/Kundennummer: ${reference}`)
  lines.push("")

  if (facts.provider) {
    // Only an evidenced postal address is printed. Without one the letter keeps a
    // blank address block so the user must supply the provider's own address,
    // which is exactly the fact this workflow refuses to guess.
    if (facts.providerAddress) {
      lines.push(facts.providerAddress)
    }
    lines.push(facts.provider)
  } else {
    omittedFactKeys.push("contract_provider")
  }
  lines.push("")

  lines.push(`Ort, Datum: ${formatGermanDate(today) ?? ""}`)
  lines.push("")
  lines.push(subject)
  lines.push("")

  if (facts.customerName) {
    lines.push(`Sehr geehrte Damen und Herren,`)
  } else {
    lines.push(`Sehr geehrte Damen und Herren,`)
  }
  lines.push("")

  lines.push(
    reference
      ? `hiermit kündige ich den oben genannten Vertrag (${reference}).`
      : "hiermit kündige ich den oben genannten Vertrag.",
  )
  lines.push("")

  if (timingIsFirm(timing) && timing.date) {
    // A date the contract states, or one the user has confirmed they verified.
    lines.push(
      `Die Kündigung soll zum ${formatGermanDate(timing.date) ?? timing.date} wirksam werden.`,
    )
  } else if (timing.kind === "calculated_max_notice" && timing.date) {
    // A statutory ceiling is explicitly framed as a suggestion the user must
    // check, not as a date in the contract.
    lines.push(
      `Nach der gesetzlichen Höchstgrenze für Verbraucherverträge (§ 309 Nr. 9 BGB) wäre eine Kündigung zum ${formatGermanDate(timing.date) ?? timing.date} möglich. Bitte prüfen Sie dieses Datum anhand Ihres Vertrags.`,
    )
  } else {
    // No supported date. Open wording, and no invented date.
    lines.push("Ich kündige zum nächstmöglichen Zeitpunkt.")
  }
  lines.push("")

  if (facts.contractType) {
    lines.push(`Vertragsart: ${facts.contractType}`)
    lines.push("")
  }

  if (facts.startDate) {
    lines.push(`Vertragsbeginn: ${formatGermanDate(facts.startDate) ?? facts.startDate}`)
  } else {
    omittedFactKeys.push("contract_start_date")
  }

  if (facts.noticePeriod) {
    lines.push(`Vereinbarte Kündigungsfrist laut Vertrag: ${facts.noticePeriod}`)
  } else {
    omittedFactKeys.push("contract_notice_period")
  }

  if (facts.minimumTerm) {
    lines.push(`Mindestlaufzeit laut Vertrag: ${facts.minimumTerm}`)
  }

  if (!facts.startDate || !facts.noticePeriod) lines.push("")

  lines.push(
    "Bitte bestätigen Sie mir den Eingang dieser Kündigung und das Wirksamkeitsdatum schriftlich.",
  )
  lines.push("")
  lines.push("Mit freundlichen Grüßen")
  lines.push("")
  lines.push(facts.customerName ?? "")

  // A stated legal ground is deliberately absent: whether a special right of
  // termination exists is a legal question this workflow does not answer, and a
  // fabricated ground would weaken the letter.
  lines.push("")
  lines.push(
    "__HINWEIS__: Diese Kündigung wurde aus bestätigten Angaben erstellt. Sie ist noch nicht versendet. Der Zugang beim Anbieter ist erst bestätigt, wenn der Anbieter ihn bestätigt.",
  )

  return {
    subject,
    body: lines.join("\n"),
    recipient: facts.providerEmail ?? facts.providerAddress ?? null,
    omittedFactKeys: [...new Set(omittedFactKeys)],
  }
}

/**
 * Whether the letter may be presented as ready for review.
 *
 * Missing provider or reference does not crash the generator — those facts are
 * already required by the module, so the case shows them as missing information
 * long before this point. This function exists so a caller can check the same
 * condition without duplicating the list.
 */
export function letterHasAddressableRecipient(facts: KuendigungFacts): boolean {
  return Boolean(facts.provider && facts.reference)
}

/**
 * Explanation shown next to the German letter, in the user's own language.
 *
 * The letter itself stays German because it goes to a German provider. The
 * explanation states what the letter does and does not claim, so a user reading
 * in Bulgarian is not left believing a cancellation has taken effect.
 */
export function kuendigungExplanation(
  timing: KuendigungTiming,
  locale: "de" | "bg",
): string {
  const de = locale === "de"

  if (timing.kind === "documented") {
    return de
      ? "Das Wirksamkeitsdatum steht so in Ihrem Vertragsdokument. Es wurde nicht berechnet und nicht verändert."
      : "Датата на влизане в сила е посочена така в договорния Ви документ. Не е изчислена и не е променяна."
  }

  if (timing.kind === "user_confirmed_verified") {
    return de
      ? "Sie haben dieses Datum selbst geprüft und bestätigt. HORIZON hat es nicht berechnet."
      : "Вие сам проверихте и потвърдихте тази дата. HORIZON не я е изчислявал."
  }

  if (timing.kind === "calculated_max_notice") {
    return de
      ? "Das Datum ist aus der gesetzlichen Höchstgrenze für Verbraucherverträge abgeleitet, nicht aus Ihrem Vertrag. Bitte prüfen Sie es anhand des Vertrags."
      : "Датата е изведена от законовата горна граница за потребителски договори, а не от Вашия договор. Моля, проверете я в договора."
  }

  return de
    ? "Es ist keine Kündigungsfrist und kein Vertragsende belegt. Die Kündigung ist daher offen formuliert („zum nächstmöglichen Zeitpunkt“). Bitte prüfen Sie Frist und Datum selbst im Vertrag; HORIZON erfindet hier nichts."
    : "Няма доказана срока за предизвестие или крайна дата на договора. Затова прекратяването е формулирано открито („при първа възможност“). Моля, проверете сами срока и датата в договора; HORIZON не измисля нищо тук."
}
