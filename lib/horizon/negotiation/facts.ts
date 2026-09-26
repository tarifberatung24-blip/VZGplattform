/**
 * HORIZON NEGOTIATION — contract facts and eligibility.
 *
 * This module turns a `contracts` row into the deterministic fact set the
 * opportunity engine reasons over, and decides whether that contract may be
 * negotiated at all.
 *
 * The governing rule is the same one the rest of HORIZON uses: a value is
 * carried only when it is evidenced, and an absent value stays absent. Nothing
 * is estimated, back-filled, or inferred — a missing monthly cost does not become
 * zero, and an absent cancellation deadline does not become "open".
 */

import {
  getCategoryConfig,
  isCategoryNegotiable,
  isNegotiationCategory,
  type NegotiationCategory,
} from "./categories"

/** The `contracts` fields this engine reads. Mirrors the row, plus the added columns. */
export type NegotiationContract = {
  id: string
  title: string
  category: string
  provider: string | null
  customerNumber: string | null
  contractNumber: string | null
  monthlyAmount: number | null
  startDate: string | null
  endDate: string | null
  cancellationDeadline: string | null
  promotionExpiry: string | null
  services: string[]
  priceHistory: PricePoint[]
  reviewStatus: "needs_review" | "confirmed" | null
  documentId: string | null
}

export type PricePoint = {
  /** ISO date the price took effect, when the evidence states one. */
  effectiveDate: string | null
  monthlyAmount: number
  /** Where the point came from, so a later reader can weigh it. */
  source: "document" | "user"
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** A well-formed calendar date, or null. A malformed value is dropped, not interpreted. */
export function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value || !ISO_DATE.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

/** A positive finite amount, or null. Zero is not a cost and neither is a negative. */
export function normalizeAmount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

function normalizeServices(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizePriceHistory(value: unknown): PricePoint[] {
  if (!Array.isArray(value)) return []
  const points: PricePoint[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const amount = normalizeAmount(typeof record.monthlyAmount === "number" ? record.monthlyAmount : null)
    if (amount == null) continue
    const source = record.source === "document" ? "document" : "user"
    points.push({
      effectiveDate: normalizeIsoDate(typeof record.effectiveDate === "string" ? record.effectiveDate : null),
      monthlyAmount: amount,
      source,
    })
  }
  return points
}

export type ContractFacts = {
  contractId: string
  category: NegotiationCategory
  provider: string | null
  customerNumber: string | null
  title: string
  currentMonthlyCost: number | null
  startDate: string | null
  endDate: string | null
  cancellationDeadline: string | null
  promotionExpiry: string | null
  services: string[]
  priceHistory: PricePoint[]
  verified: boolean
  hasDocument: boolean
}

/** Builds the fact set. Every field is either evidenced or null — never guessed. */
export function buildContractFacts(contract: NegotiationContract): ContractFacts {
  const category: NegotiationCategory = isNegotiationCategory(contract.category)
    ? contract.category
    : "other"
  return {
    contractId: contract.id,
    category,
    provider: contract.provider?.trim() || null,
    customerNumber: contract.customerNumber?.trim() || null,
    title: contract.title,
    currentMonthlyCost: normalizeAmount(contract.monthlyAmount),
    startDate: normalizeIsoDate(contract.startDate),
    endDate: normalizeIsoDate(contract.endDate),
    cancellationDeadline: normalizeIsoDate(contract.cancellationDeadline),
    promotionExpiry: normalizeIsoDate(contract.promotionExpiry),
    services: normalizeServices(contract.services),
    priceHistory: normalizePriceHistory(contract.priceHistory),
    verified: contract.reviewStatus === "confirmed",
    hasDocument: Boolean(contract.documentId),
  }
}

export type EligibilityReason =
  | "CATEGORY_NOT_ENABLED"
  | "CATEGORY_REGULATED"
  | "NOT_ELIGIBLE_CATEGORY"

export type Eligibility = {
  eligible: boolean
  reason: EligibilityReason | null
}

/**
 * Whether this contract may enter the negotiation workflow.
 *
 * Eligibility depends on the category only. Missing facts do not make a contract
 * ineligible — they become `missing_information` the engine reports and the user
 * supplies — because refusing to analyse an incomplete contract would hide the
 * analysis that tells the user what is missing.
 */
export function contractEligibility(contract: NegotiationContract): Eligibility {
  if (!isNegotiationCategory(contract.category)) {
    return { eligible: false, reason: "NOT_ELIGIBLE_CATEGORY" }
  }
  const config = getCategoryConfig(contract.category)
  if (config.regulated && !config.complianceApproved) {
    return { eligible: false, reason: "CATEGORY_REGULATED" }
  }
  if (!isCategoryNegotiable(config.id)) {
    return { eligible: false, reason: "CATEGORY_NOT_ENABLED" }
  }
  return { eligible: true, reason: null }
}
