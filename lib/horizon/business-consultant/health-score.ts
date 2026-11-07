/**
 * HORIZON Business Consultant — deterministic Business Health Score.
 *
 * This module is arithmetic, not inference. Given one evidence snapshot it
 * returns the same score, the same components, the same reason codes and the
 * same snapshot id, every time. No model is called here; the model may only
 * explain a result this file already produced.
 *
 * Three rules are structural:
 * - Every component carries the source references it was computed from, the
 *   period it covers and its freshness. A number without a source is not shown.
 * - Coverage, not optimism, decides whether a score may be shown at all. Below
 *   the evidence threshold the result is `insufficient_evidence` and blocked,
 *   with a refusal code — never a low score presented as a measurement.
 * - Self-reported entries are never labelled verified. The evidence class is
 *   carried through from the entry, and the document share is reported next to
 *   the total so a manual figure is never shown as if a document proved it.
 */

import type { RunReference } from "./contract"

/** Bump when the rubric changes meaning; a stored score names its version. */
export const BUSINESS_HEALTH_SCORE_VERSION = "business-health-v1" as const
/** Bump when the formulas or thresholds change; independent of the score version. */
export const BUSINESS_HEALTH_RUBRIC_VERSION = "rubric-2026-11-07" as const

/** Below this weighted coverage the score is refused, not shown as low. */
export const MIN_COVERAGE_FOR_SCORE = 0.5
/** Evidence older than this (in days) is flagged stale and lowers confidence. */
export const STALE_EVIDENCE_DAYS = 120
/** Months of finance history that make the liquidity component fully covered. */
export const LIQUIDITY_FULL_COVERAGE_MONTHS = 6

export const HEALTH_BANDS = [
  "insufficient_evidence",
  "critical",
  "weak",
  "moderate",
  "solid",
  "strong",
] as const
export type HealthBand = (typeof HEALTH_BANDS)[number]

export const HEALTH_COMPONENT_KEYS = [
  "profile_completeness",
  "documentation",
  "bookkeeping",
  "liquidity",
  "compliance",
] as const
export type HealthComponentKey = (typeof HEALTH_COMPONENT_KEYS)[number]

export type HealthEvidenceProfile = {
  activityDescription: string | null
  employeeCount: number | null
  annualRevenueBand: string | null
  bookkeepingMethod: string | null
  eInvoiceStatus: string | null
  foundedOn: string | null
  businessGoals: string[]
  businessChallenges: string[]
  businessServices: string[]
  businessTools: string[]
}

export type HealthEvidenceDocument = {
  id: string
  category: string
  summary: string | null
  expiresOn: string | null
}

export type HealthEvidenceFinanceEntry = {
  id: string
  kind: string
  category: string
  amountCents: number
  periodMonth: string
  source: string
  evidenceClass: string
}

export type HealthEvidenceInput = {
  profile: HealthEvidenceProfile
  documents: readonly HealthEvidenceDocument[]
  financeEntries: readonly HealthEvidenceFinanceEntry[]
  /** The instant the score is computed against, for freshness. ISO date/time. */
  asOf: string
}

export type HealthFreshness = {
  asOf: string
  /** The most recent period month or document date seen, or null when none. */
  latestEvidenceAt: string | null
  staleDays: number | null
  stale: boolean
}

export type HealthScoreComponent = {
  key: HealthComponentKey
  /** 0..100 for the evidence that exists. */
  score: number
  /** Rubric weight; weights across all components sum to 1. */
  weight: number
  /** 0..1: how much of the component's required evidence is present. */
  coverage: number
  /** Stable machine reason, never free prose. */
  reasonCode: string
  sourceRefs: RunReference[]
  /** The period the component measured, when it is period-bound. */
  period: { from: string; to: string } | null
  freshness: HealthFreshness
}

export type HealthContradiction = {
  code: string
  detail: string
  sourceRefs: RunReference[]
}

export type BusinessHealthScore = {
  scoreVersion: string
  rubricVersion: string
  /** Weighted score over the covered components, 0..100. Null when blocked. */
  score: number | null
  band: HealthBand
  /** 0..1: weighted coverage of the rubric. */
  coverage: number
  /** 0..1: coverage adjusted down for stale evidence. */
  confidence: number
  components: HealthScoreComponent[]
  missingEvidence: string[]
  contradictions: HealthContradiction[]
  riskFlags: string[]
  reasonCodes: string[]
  recommendedNextAction: string | null
  /** True when the evidence is too thin to show a score. */
  blocked: boolean
  refusalCode: string | null
  computedAt: string
  /** Deterministic hash of the evidence snapshot; identical inputs -> identical id. */
  evidenceSnapshotId: string
}

const WEIGHTS: Record<HealthComponentKey, number> = {
  profile_completeness: 0.15,
  documentation: 0.2,
  bookkeeping: 0.25,
  liquidity: 0.25,
  compliance: 0.15,
}

const REQUIRED_PROFILE_FIELDS: (keyof HealthEvidenceProfile)[] = [
  "activityDescription",
  "employeeCount",
  "annualRevenueBand",
  "bookkeepingMethod",
  "eInvoiceStatus",
  "foundedOn",
]

/** The document categories that count toward the documentation component. */
const DOCUMENTATION_CATEGORIES = ["gewerbeanmeldung", "tax", "contract", "insurance", "invoice", "e_invoice"]

function isIsoDate(value: string | null): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
}

/** `2026-03-15` -> `2026-03-01`. Returns null for anything not an ISO month. */
function periodMonthOf(value: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(value)
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return `${match[1]}-${match[2]}-01`
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.round((to - from) / 86_400_000)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * A stable hash of the evidence snapshot. Deterministic across runs and
 * processes: the same evidence always yields the same id, so two scores can be
 * compared without trusting timestamps. Uses a small FNV-1a over canonical JSON.
 */
export function evidenceSnapshotId(input: HealthEvidenceInput): string {
  const canonical = JSON.stringify({
    profile: {
      activityDescription: input.profile.activityDescription,
      employeeCount: input.profile.employeeCount,
      annualRevenueBand: input.profile.annualRevenueBand,
      bookkeepingMethod: input.profile.bookkeepingMethod,
      eInvoiceStatus: input.profile.eInvoiceStatus,
      foundedOn: input.profile.foundedOn,
      businessGoals: [...input.profile.businessGoals].sort(),
      businessChallenges: [...input.profile.businessChallenges].sort(),
      businessServices: [...input.profile.businessServices].sort(),
      businessTools: [...input.profile.businessTools].sort(),
    },
    documents: [...input.documents]
      .map((document) => [document.id, document.category, document.expiresOn])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    financeEntries: [...input.financeEntries]
      .map((entry) => [entry.id, entry.kind, entry.category, entry.amountCents, entry.periodMonth, entry.source, entry.evidenceClass])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  })
  let hash = 0x811c9dc5
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `snap-${(hash >>> 0).toString(16).padStart(8, "0")}-${canonical.length.toString(16)}`
}

function freshnessOf(input: HealthEvidenceInput): HealthFreshness {
  const dates: string[] = []
  for (const entry of input.financeEntries) {
    const month = periodMonthOf(entry.periodMonth)
    if (month) dates.push(month)
  }
  for (const document of input.documents) {
    if (isIsoDate(document.expiresOn)) dates.push(document.expiresOn as string)
  }
  const latestEvidenceAt = dates.length ? dates.sort().at(-1) ?? null : null
  const staleDays = latestEvidenceAt ? daysBetween(latestEvidenceAt, input.asOf) : null
  return {
    asOf: input.asOf,
    latestEvidenceAt,
    staleDays,
    stale: staleDays != null && staleDays > STALE_EVIDENCE_DAYS,
  }
}

function profileComponent(input: HealthEvidenceInput, freshness: HealthFreshness): HealthScoreComponent {
  const present = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = input.profile[field]
    if (Array.isArray(value)) return value.length > 0
    if (field === "annualRevenueBand") return typeof value === "string" && value !== "unknown"
    if (field === "bookkeepingMethod") return typeof value === "string" && value !== "unknown"
    if (field === "eInvoiceStatus") return typeof value === "string" && value !== "not_sure"
    return value != null && value !== ""
  })
  const coverage = present.length / REQUIRED_PROFILE_FIELDS.length
  return {
    key: "profile_completeness",
    score: round1(coverage * 100),
    weight: WEIGHTS.profile_completeness,
    coverage: round1(coverage * 1000) / 1000,
    reasonCode: coverage === 1 ? "PROFILE_COMPLETE" : "PROFILE_INCOMPLETE",
    sourceRefs: [],
    period: null,
    freshness,
  }
}

function documentationComponent(input: HealthEvidenceInput, freshness: HealthFreshness): HealthScoreComponent {
  const seen = new Set(input.documents.map((document) => document.category))
  const present = DOCUMENTATION_CATEGORIES.filter((category) => seen.has(category))
  const coverage = present.length / DOCUMENTATION_CATEGORIES.length
  const sourceRefs = input.documents
    .filter((document) => DOCUMENTATION_CATEGORIES.includes(document.category))
    .map((document) => ({ kind: "document" as const, id: document.id }))
  return {
    key: "documentation",
    score: round1(coverage * 100),
    weight: WEIGHTS.documentation,
    coverage: round1(coverage * 1000) / 1000,
    reasonCode: present.length === 0 ? "NO_BUSINESS_DOCUMENTS" : coverage === 1 ? "DOCUMENTATION_COMPLETE" : "DOCUMENTATION_PARTIAL",
    sourceRefs,
    period: null,
    freshness,
  }
}

function bookkeepingComponent(input: HealthEvidenceInput, freshness: HealthFreshness): HealthScoreComponent {
  const methodKnown = typeof input.profile.bookkeepingMethod === "string" && input.profile.bookkeepingMethod !== "unknown"
  const entries = input.financeEntries
  const documentBacked = entries.filter((entry) => entry.evidenceClass === "verified_fact" || entry.source !== "manual")
  const documentShare = entries.length ? documentBacked.length / entries.length : 0
  // Half the component is "a method is declared", half is "the figures rest on documents".
  const coverage = (methodKnown ? 0.5 : 0) + (entries.length ? 0.5 : 0)
  const score = round1((methodKnown ? 50 : 0) + documentShare * 50)
  return {
    key: "bookkeeping",
    score,
    weight: WEIGHTS.bookkeeping,
    coverage: round1(coverage * 1000) / 1000,
    reasonCode: !entries.length
      ? "NO_FINANCE_ENTRIES"
      : documentShare >= 0.8
        ? "BOOKKEEPING_DOCUMENT_BACKED"
        : "BOOKKEEPING_MOSTLY_MANUAL",
    sourceRefs: documentBacked.map((entry) => ({ kind: "finance_entry" as const, id: entry.id })),
    period: null,
    freshness,
  }
}

function liquidityComponent(input: HealthEvidenceInput, freshness: HealthFreshness): HealthScoreComponent {
  const byMonth = new Map<string, { revenue: number; expense: number }>()
  for (const entry of input.financeEntries) {
    const month = periodMonthOf(entry.periodMonth)
    if (!month) continue
    const row = byMonth.get(month) ?? { revenue: 0, expense: 0 }
    if (entry.kind === "revenue") row.revenue += entry.amountCents
    if (entry.kind === "expense") row.expense += entry.amountCents
    byMonth.set(month, row)
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const monthCount = months.length
  const coverage = clamp01(monthCount / LIQUIDITY_FULL_COVERAGE_MONTHS)
  if (!monthCount) {
    return {
      key: "liquidity",
      score: 0,
      weight: WEIGHTS.liquidity,
      coverage: 0,
      reasonCode: "NO_FINANCE_HISTORY",
      sourceRefs: [],
      period: null,
      freshness,
    }
  }
  const netCents = months.reduce((total, [, row]) => total + (row.revenue - row.expense), 0)
  // Positive net over the whole window scores high; the score scales with how much
  // of the window is covered, so one good month is not a full score.
  const netRatio = netCents / (months.reduce((total, [, row]) => total + row.revenue + row.expense, 0) || 1)
  const base = netCents >= 0 ? 60 + clamp01(netRatio) * 40 : clamp01(1 + netRatio) * 60
  const from = months[0][0]
  const to = months[months.length - 1][0]
  return {
    key: "liquidity",
    score: round1(base),
    weight: WEIGHTS.liquidity,
    coverage: round1(coverage * 1000) / 1000,
    reasonCode: netCents >= 0 ? "NET_POSITIVE" : "NET_NEGATIVE",
    sourceRefs: input.financeEntries.map((entry) => ({ kind: "finance_entry" as const, id: entry.id })),
    period: { from, to },
    freshness,
  }
}

function complianceComponent(input: HealthEvidenceInput, freshness: HealthFreshness): HealthScoreComponent {
  const eInvoice = input.profile.eInvoiceStatus
  const eInvoiceReady = eInvoice === "ready" || eInvoice === "active"
  const eInvoicePreparing = eInvoice === "preparing"
  const hasTaxDocument = input.documents.some((document) => document.category === "tax")
  const expiringSoon = input.documents.filter(
    (document) => isIsoDate(document.expiresOn) && (daysBetween(freshness.asOf, document.expiresOn as string) <= 30),
  )
  const checks = [eInvoiceReady || eInvoicePreparing, hasTaxDocument]
  const coverage = checks.filter(Boolean).length / checks.length
  const score = (eInvoiceReady ? 50 : eInvoicePreparing ? 30 : 0) + (hasTaxDocument ? 50 : 0)
  return {
    key: "compliance",
    score: round1(score),
    weight: WEIGHTS.compliance,
    coverage: round1(coverage * 1000) / 1000,
    reasonCode: expiringSoon.length
      ? "DOCUMENTS_EXPIRING_SOON"
      : eInvoiceReady
        ? "EINVOICE_READY"
        : eInvoicePreparing
          ? "EINVOICE_PREPARING"
          : "EINVOICE_NOT_READY",
    sourceRefs: [
      ...input.documents.filter((document) => document.category === "tax").map((document) => ({ kind: "document" as const, id: document.id })),
      ...expiringSoon.map((document) => ({ kind: "document" as const, id: document.id })),
    ],
    period: null,
    freshness,
  }
}

/** Deterministic cross-checks that a set of figures is internally consistent. */
function findContradictions(input: HealthEvidenceInput, asOf: string): HealthContradiction[] {
  const out: HealthContradiction[] = []
  const hasInvoiceDocument = input.documents.some((document) => document.category === "invoice" || document.category === "e_invoice")
  if (hasInvoiceDocument && input.financeEntries.length === 0) {
    out.push({
      code: "INVOICE_WITHOUT_FINANCE_ENTRY",
      detail: "An invoice document is linked but no finance entry was derived from it.",
      sourceRefs: input.documents
        .filter((document) => document.category === "invoice" || document.category === "e_invoice")
        .map((document) => ({ kind: "document" as const, id: document.id })),
    })
  }
  const futureEntries = input.financeEntries.filter((entry) => {
    const month = periodMonthOf(entry.periodMonth)
    return month != null && month > asOf.slice(0, 7) + "-01"
  })
  if (futureEntries.length) {
    out.push({
      code: "FINANCE_ENTRY_IN_FUTURE",
      detail: "A finance entry is dated after the current period.",
      sourceRefs: futureEntries.map((entry) => ({ kind: "finance_entry" as const, id: entry.id })),
    })
  }
  const documentBackedWithoutLink = input.financeEntries.filter(
    (entry) => entry.source !== "manual" && entry.evidenceClass !== "verified_fact",
  )
  if (documentBackedWithoutLink.length) {
    out.push({
      code: "DOCUMENT_SOURCE_WITHOUT_VERIFIED_CLASS",
      detail: "A finance entry claims a document source but is not classified as verified.",
      sourceRefs: documentBackedWithoutLink.map((entry) => ({ kind: "finance_entry" as const, id: entry.id })),
    })
  }
  return out
}

function bandFor(score: number | null, blocked: boolean): HealthBand {
  if (blocked || score == null) return "insufficient_evidence"
  if (score < 25) return "critical"
  if (score < 45) return "weak"
  if (score < 65) return "moderate"
  if (score < 85) return "solid"
  return "strong"
}

const MISSING_EVIDENCE_LABELS: Record<HealthComponentKey, string> = {
  profile_completeness: "profile_fields",
  documentation: "business_documents",
  bookkeeping: "bookkeeping_method_or_entries",
  liquidity: "finance_history",
  compliance: "e_invoice_status_or_tax_document",
}

/**
 * Computes the Business Health Score for one evidence snapshot.
 *
 * Pure and total. A component with no evidence is excluded from the weighted
 * average and listed as missing evidence, so an absent input lowers coverage
 * instead of contributing a zero that would look like a measured failure.
 */
export function computeBusinessHealthScore(input: HealthEvidenceInput): BusinessHealthScore {
  const asOf = input.asOf
  const freshness = freshnessOf(input)
  const components: HealthScoreComponent[] = [
    profileComponent(input, freshness),
    documentationComponent(input, freshness),
    bookkeepingComponent(input, freshness),
    liquidityComponent(input, freshness),
    complianceComponent(input, freshness),
  ]

  const covered = components.filter((component) => component.coverage > 0)
  const totalWeight = covered.reduce((total, component) => total + component.weight, 0)
  const weightedCoverage = components.reduce((total, component) => total + component.weight * component.coverage, 0)
  const coverage = round1(weightedCoverage * 1000) / 1000
  const blocked = coverage < MIN_COVERAGE_FOR_SCORE || covered.length === 0

  const score = blocked
    ? null
    : round1(covered.reduce((total, component) => total + component.score * component.weight, 0) / (totalWeight || 1))

  const missingEvidence = components
    .filter((component) => component.coverage === 0)
    .map((component) => MISSING_EVIDENCE_LABELS[component.key])

  const contradictions = findContradictions(input, asOf)

  const riskFlags: string[] = []
  if (freshness.stale) riskFlags.push("STALE_EVIDENCE")
  const netNegative = components.some((component) => component.key === "liquidity" && component.reasonCode === "NET_NEGATIVE")
  if (netNegative) riskFlags.push("NEGATIVE_NET")
  if (components.some((component) => component.key === "compliance" && component.reasonCode === "DOCUMENTS_EXPIRING_SOON")) {
    riskFlags.push("DOCUMENT_EXPIRING")
  }
  if (contradictions.length) riskFlags.push("CONTRADICTORY_EVIDENCE")

  const confidence = round1(clamp01(coverage * (freshness.stale ? 0.7 : 1)) * 1000) / 1000

  const reasonCodes = components.map((component) => `${component.key}:${component.reasonCode}`)

  let recommendedNextAction: string | null = null
  if (blocked) recommendedNextAction = "provide_evidence"
  else if (riskFlags.includes("DOCUMENT_EXPIRING")) recommendedNextAction = "review_expiring_documents"
  else if (netNegative) recommendedNextAction = "review_expenses"
  else if (coverage < 0.8) recommendedNextAction = "complete_profile_and_documents"
  else recommendedNextAction = "maintain_current_processes"

  return {
    scoreVersion: BUSINESS_HEALTH_SCORE_VERSION,
    rubricVersion: BUSINESS_HEALTH_RUBRIC_VERSION,
    score,
    band: bandFor(score, blocked),
    coverage,
    confidence,
    components,
    missingEvidence,
    contradictions,
    riskFlags,
    reasonCodes,
    recommendedNextAction,
    blocked,
    refusalCode: blocked ? "INSUFFICIENT_EVIDENCE" : null,
    computedAt: asOf,
    evidenceSnapshotId: evidenceSnapshotId(input),
  }
}

/** Maps a stored finance row (snake_case) to the evidence shape this module reads. */
export function toHealthFinanceEntry(row: {
  id: string
  kind: string
  category: string
  amount_cents: number
  period_month: string
  source: string
  evidence_class: string
}): HealthEvidenceFinanceEntry {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    amountCents: Number(row.amount_cents),
    periodMonth: row.period_month,
    source: row.source,
    evidenceClass: row.evidence_class,
  }
}
