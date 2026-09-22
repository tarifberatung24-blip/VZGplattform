/**
 * P17 — contract-to-case linkage.
 *
 * Contract management is distinct from Kündigung (P14): this module owns the
 * archive, the provider and cost view, and the Radar, while the termination
 * letter itself belongs to P14. The seam between them is here — a contract
 * becomes a canonical case, and the contract's *evidenced* fields become that
 * case's facts so the Kündigung workflow starts from what the archive actually
 * holds rather than asking the user to retype it.
 *
 * The governing rule is that a field is copied only when it is evidenced:
 *
 * - `provider_name`, `contract_number`, dates and cost come from the contract row,
 *   which was itself written from a document or by the user.
 * - A date is marked **verified** only when the contract's `review_status` is
 *   `confirmed`. A contract still at `needs_review` has a date that was read but
 *   not checked, and it is carried across as *unconfirmed* so P14's timing logic
 *   refuses to rely on it.
 *
 * Nothing is inferred: no notice period is derived from a contract type, no
 * termination date is computed here, and no cost is estimated. Where the archive
 * has no value, the case simply does not have that fact, and the normal
 * missing-information path asks for it.
 */

import type { CaseModule } from "../case/contract"

/** The contract fields this module reads. Mirrors the `contracts` row. */
export type LinkableContract = {
  id: string
  title: string
  category: string
  provider: string | null
  contractNumber: string | null
  monthlyAmount: number | null
  startDate: string | null
  endDate: string | null
  cancellationDeadline: string | null
  reviewStatus: "needs_review" | "confirmed" | null
  documentId: string | null
}

export type ContractFactSeed = {
  key: string
  value: string
  /** Evidence quoted from the source document, when the contract had one. */
  evidence: string | null
  /**
   * True only for values the archive itself marks confirmed. An unconfirmed
   * value is still seeded — it is real data the user entered or that was read
   * from a document — but the case records that it is not yet relied upon.
   */
  verified: boolean
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * A date is carried only if it is a well-formed calendar date. A malformed or
 * free-text value is dropped rather than passed on as a string P14 would have to
 * interpret, because interpreting it is how an invented deadline appears.
 */
function validIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null
}

/** A positive cost is real data; zero and null are not a cost. */
function validAmount(value: number | null): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value.toFixed(2)
}

export function isContractVerified(contract: LinkableContract): boolean {
  return contract.reviewStatus === "confirmed"
}

/**
 * The facts a contract contributes to a Kündigung case.
 *
 * Only keys the P14 workflow already reads are produced, so the two modules
 * cannot drift into two different fact vocabularies. A value the archive does not
 * hold is absent from the result, not present-and-empty, so
 * `deriveMissingInformation` reports it as missing and the user is asked.
 */
export function contractFactSeeds(contract: LinkableContract): readonly ContractFactSeed[] {
  const verified = isContractVerified(contract)
  const evidence = contract.documentId ? `Vertragsarchiv: ${contract.title}` : null
  const seeds: ContractFactSeed[] = []

  const push = (key: string, value: string | null) => {
    if (value) seeds.push({ key, value, evidence, verified })
  }

  push("contract_provider", contract.provider?.trim() || null)
  push("contract_reference", contract.contractNumber?.trim() || null)
  push("contract_type", contract.title.trim() || null)
  push("contract_start_date", validIsoDate(contract.startDate))
  push("contract_end_date", validIsoDate(contract.endDate))
  // The archive's `cancellation_deadline` is deliberately *not* seeded. P14 has
  // no fact for a cancel-by date, and mapping it onto `contract_end_date` would
  // present a deadline as a termination date — the two are different, and the
  // conflation is exactly how an invented date reaches a letter. The archive
  // still displays the deadline; it simply does not become a Kündigung input.

  return seeds
}

/** The cost, kept separate because it is informational and never a Kündigung input. */
export function contractMonthlyCost(contract: LinkableContract): string | null {
  return validAmount(contract.monthlyAmount)
}

/**
 * The case a contract opens.
 *
 * Always the `kuendigung` module with the `cancellation` intent, because the only
 * case action this archive drives is a termination. The title names the provider
 * so the case list is readable, and falls back to the contract title when the
 * provider is unknown rather than inventing one.
 */
export function kuendigungCaseForContract(contract: LinkableContract): {
  title: string
  module: CaseModule
  intent: string
} {
  const provider = contract.provider?.trim()
  return {
    title: provider ? `Kündigung: ${provider}` : `Kündigung: ${contract.title}`,
    module: "kuendigung",
    intent: "cancellation",
  }
}
