import type { ExtractedFact, MissingInformation } from "./contract"

/**
 * Required fact keys per module. A key is "required" only in the sense that the
 * module's workflow cannot produce a correct deliverable without it; an absent
 * key is reported as missing rather than invented.
 */
export const REQUIRED_FACT_KEYS: Record<string, readonly string[]> = {
  agentur_fuer_arbeit: ["recipient_institution", "claim_type"],
  jobcenter: ["recipient_institution", "claim_type"],
  kuendigung: ["contract_provider", "contract_reference"],
  steuererklaerung: ["tax_year"],
  unterlagen_erklaeren: [],
  contract_management: ["contract_provider"],
  general: [],
}

/**
 * Derives missing-information state from the facts on a case.
 *
 * A fact counts as confirmed only when `confirmed_at` is set; critical facts
 * that are present but unconfirmed are surfaced separately so the UI can ask
 * the user to confirm rather than to type.
 */
export function deriveMissingInformation(
  facts: readonly Pick<ExtractedFact, "key" | "critical" | "confirmedAt">[],
  module: string,
): MissingInformation {
  const presentKeys = new Set(facts.map((fact) => fact.key))
  const required = REQUIRED_FACT_KEYS[module] ?? []

  const missingFactKeys = required.filter((key) => !presentKeys.has(key))

  const unconfirmedCriticalFactKeys = facts
    .filter((fact) => fact.critical && !fact.confirmedAt)
    .map((fact) => fact.key)

  return {
    missingFactKeys,
    unconfirmedCriticalFactKeys,
    complete: missingFactKeys.length === 0 && unconfirmedCriticalFactKeys.length === 0,
  }
}