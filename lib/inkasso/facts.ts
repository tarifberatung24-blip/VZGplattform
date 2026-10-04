import type { Claim, Dates, Evidence } from "./rule-pack"

export interface CaseParties {
  creditor: string
  former_creditor: string
  original_supplier: string
  debtor: string
  court: string
  case_no: string
  creditor_ref: string
}

export interface CaseGroups {
  parties: CaseParties
  claim: Claim
  dates: Dates
  evidence: Evidence
}

export const CASE_TYPES = new Set(["mahnbescheid", "inkasso", "utility_dispute"])
export const CASE_STATUSES = new Set([
  "intake",
  "extracted",
  "evaluated",
  "drafted",
  "in_review",
  "closed",
])
export const LOCALES = new Set(["bg", "de"])

const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0

const str = (value: unknown): string => (typeof value === "string" ? value.slice(0, 200) : "")

const bool = (value: unknown): boolean => value === true

/**
 * Everything arriving from the client is untrusted: the wizard writes these
 * objects directly and a manipulation must not be able to inject a negative
 * amount or a non-string into the rule pack.
 */
export function sanitizeGroups(body: Record<string, unknown>): CaseGroups {
  const parties = (body.parties ?? {}) as Record<string, unknown>
  const claim = (body.claim ?? {}) as Record<string, unknown>
  const dates = (body.dates ?? {}) as Record<string, unknown>
  const evidence = (body.evidence ?? {}) as Record<string, unknown>

  return {
    parties: {
      creditor: str(parties.creditor),
      former_creditor: str(parties.former_creditor),
      original_supplier: str(parties.original_supplier),
      debtor: str(parties.debtor),
      court: str(parties.court),
      case_no: str(parties.case_no),
      creditor_ref: str(parties.creditor_ref),
    },
    claim: {
      hauptforderung: num(claim.hauptforderung),
      verfahrenskosten: num(claim.verfahrenskosten),
      inkassokosten: num(claim.inkassokosten),
      zinsen: num(claim.zinsen),
      total: num(claim.total),
      currency: "EUR",
    },
    dates: {
      mahnbescheid: str(dates.mahnbescheid) || null,
      service_date: str(dates.service_date) || null,
      widerspruch_deadline: str(dates.widerspruch_deadline) || null,
    },
    evidence: {
      supplier: str(evidence.supplier),
      meter_no: str(evidence.meter_no),
      period: str(evidence.period),
      consumption_kwh: num(evidence.consumption_kwh),
      amount: num(evidence.amount),
      parallel_billing: bool(evidence.parallel_billing),
      data_exchange_delay_admitted: bool(evidence.data_exchange_delay_admitted),
    },
  }
}
