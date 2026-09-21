/**
 * P14 — Kündigung generation provenance.
 *
 * A generated letter is a consequential artifact: it carries a date and a
 * contract identifier, and the user may sign and post it. So it needs the same
 * provenance discipline as a generated official form, without a second approval
 * system.
 *
 * The mechanism reuses P8 exactly as the PDF form engine does: the draft *body*
 * is a deterministic provenance block, so an approval of that draft is an
 * approval of these exact inputs. `correspondence_drafts.content_hash` therefore
 * covers the letter, the facts it used, the timing decision and the output
 * artifact's hash. Edit any input, regenerate, and the earlier approval stops
 * matching on its own — no new table, no new hash rule.
 *
 * The output hash is recorded as a line inside the body. The body is written
 * before the artifact hash is known (the artifact is produced from the letter),
 * so the writer computes the letter hash first and passes it in; the signature
 * engine then reads it back out of the body with `readLetterOutputSha`, the same
 * way it reads a form's output hash.
 */

import type { KuendigungFacts, KuendigungTiming } from "./facts"

export const LETTER_OUTPUT_SHA_PREFIX = "Brief-SHA-256:"

export type KuendigungManifest = {
  caseId: string
  generatedAt: string
  /** The exact facts used, so the manifest is reconstructable from itself. */
  facts: KuendigungFacts
  timing: KuendigungTiming
  /** SHA-256 of the generated PDF bytes. */
  outputSha256: string
  /** Rule that produced a calculated timing, when one did. */
  timingRule: string | null
}

export function renderLetterSubject(facts: KuendigungFacts): string {
  return facts.reference
    ? `Kündigung ${facts.reference}`
    : facts.provider
      ? `Kündigung bei ${facts.provider}`
      : "Kündigung"
}

/**
 * Deterministic provenance and letter text, used as the draft body.
 *
 * The letter text comes first because it is what the user must read and approve
 * verbatim. The provenance block follows so the user sees what the approval
 * covers. Field order is fixed and the facts are listed explicitly rather than
 * iterated from an object, so the same inputs always produce identical text.
 */
export function renderLetterBody(input: {
  letterBody: string
  manifest: KuendigungManifest
}): string {
  const { manifest } = input
  const facts = manifest.facts

  const factLines = [
    `Anbieter: ${facts.provider ?? "(nicht bestätigt)"}`,
    `Vertragsnummer: ${facts.reference ?? "(nicht bestätigt)"}`,
    `Vertragsart: ${facts.contractType ?? "(nicht bestätigt)"}`,
    `Vertragsbeginn: ${facts.startDate ?? "(nicht bestätigt)"}`,
    `Mindestlaufzeit: ${facts.minimumTerm ?? "(nicht bestätigt)"}`,
    `Kündigungsfrist: ${facts.noticePeriod ?? "(nicht bestätigt)"}`,
    `Vertragsende (dokumentiert): ${facts.documentedEndDate ?? "(nicht bestätigt)"}`,
    `Nächstmöglicher Zeitpunkt gewünscht: ${facts.terminateSoonest ? "ja" : "nein"}`,
  ]

  return [
    input.letterBody,
    "",
    "---",
    "Angaben zur Kündigung (Grundlage der Freigabe)",
    "",
    ...factLines,
    "",
    `Fristgrundlage: ${manifest.timing.kind}`,
    `Fristregel: ${manifest.timingRule ?? "(keine Berechnung)"}`,
    `Wirksamkeitsdatum: ${manifest.timing.date ?? "(nicht belegt)"}`,
    `Prüfung durch dich nötig: ${manifest.timing.requiresUserVerification ? "ja" : "nein"}`,
    "",
    `Vorgang: ${manifest.caseId}`,
    `Erstellt am: ${manifest.generatedAt}`,
    `${LETTER_OUTPUT_SHA_PREFIX} ${manifest.outputSha256}`,
    "",
    "Hinweis: Es wurden ausschließlich bestätigte Angaben verwendet. Nicht bestätigte Angaben bleiben leer und werden nicht abgeleitet. Es wird keine Kündigungsfrist, kein Vertragsende und keine Empfängeradresse erfunden.",
  ].join("\n")
}

/**
 * Reads the output hash back out of a stored draft body.
 *
 * Used by the signature step to find the artifact a draft approved. Returns null
 * for a body that carries no hash, so a form draft and a letter draft are
 * distinguishable rather than confusable.
 */
export function readLetterOutputSha(body: string): string | null {
  const match = new RegExp(`${LETTER_OUTPUT_SHA_PREFIX} ([0-9a-f]{64})`).exec(body)
  return match ? match[1] : null
}