/**
 * Which notifications a user is due, from the user's own data.
 *
 * Pure and deterministic: the caller loads an `ActivitySnapshot`, this module
 * decides. Every notification carries a `dedupeKey`, and the database keeps one
 * row per (user, dedupeKey), so running the rules again never duplicates.
 *
 * Owner decisions (2026-10-11): reports and reminders bring people back to the
 * solutions they already have. Trial, paid plan and account-sharing checks are
 * deferred until 100 active users and are NOT part of these rules.
 */

export const DAY_MS = 86_400_000

export type NotificationKind =
  | "first_win"
  | "report_day14"
  | "report_monthly"
  | "inactive_nudge"
  | "deadline_30"
  | "deadline_7"

/** The main functions a report counts, in display order. */
export const FEATURE_CATALOG = [
  "documents",
  "contracts",
  "letter_explained",
  "cancellation",
  "tax",
  "benefits",
  "tariff_compare",
  "letter_sent",
] as const

export type FeatureId = (typeof FEATURE_CATALOG)[number]

export type SnapshotContract = { id: string; title: string; cancellationDeadline: string | null }
export type SnapshotSaving = { status: string; annualSavingCents: number; createdAt: string }

export type ActivitySnapshot = {
  accountCreatedAt: string
  contracts: SnapshotContract[]
  documentCount: number
  /** Case modules of the user's cases (one entry per case). */
  caseModules: string[]
  optimizeSessionCount: number
  /** Successfully sent letters (provider accepted), oldest first. */
  sentLetterDates: string[]
  savings: SnapshotSaving[]
}

export type Report = {
  featuresUsed: FeatureId[]
  featureTotal: number
  contracts: number
  documents: number
  cases: number
  sentLetters: number
  securedSavingsCents: number
  realizedSavingsCents: number
  upcomingDeadlines: number
}

export type NotificationDraft = {
  kind: NotificationKind
  dedupeKey: string
  payload: Record<string, unknown>
}

const caseModuleFeature: Record<string, FeatureId> = {
  unterlagen_erklaeren: "letter_explained",
  kuendigung: "cancellation",
  steuererklaerung: "tax",
  jobcenter: "benefits",
  agentur_fuer_arbeit: "benefits",
  contract_management: "contracts",
}

function day(value: string | Date): string {
  return (typeof value === "string" ? new Date(value) : value).toISOString().slice(0, 10)
}

function isIsoDay(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
}

export function accountAgeDays(snapshot: ActivitySnapshot, now: Date): number {
  const created = new Date(snapshot.accountCreatedAt).getTime()
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.floor((now.getTime() - created) / DAY_MS))
}

export function featuresUsed(snapshot: ActivitySnapshot): FeatureId[] {
  const used = new Set<FeatureId>()
  if (snapshot.documentCount > 0) used.add("documents")
  if (snapshot.contracts.length > 0) used.add("contracts")
  for (const caseModule of snapshot.caseModules) {
    const feature = caseModuleFeature[caseModule]
    if (feature) used.add(feature)
  }
  if (snapshot.optimizeSessionCount > 0) used.add("tariff_compare")
  if (snapshot.sentLetterDates.length > 0) used.add("letter_sent")
  return FEATURE_CATALOG.filter((feature) => used.has(feature))
}

/** Contracts whose cancellation deadline lies between today and `days` ahead. */
export function deadlinesWithin(snapshot: ActivitySnapshot, now: Date, days: number): Array<SnapshotContract & { date: string }> {
  const today = day(now)
  const limit = day(new Date(now.getTime() + days * DAY_MS))
  return snapshot.contracts
    .filter((contract) => isIsoDay(contract.cancellationDeadline))
    .map((contract) => ({ ...contract, date: (contract.cancellationDeadline as string).slice(0, 10) }))
    .filter((contract) => contract.date >= today && contract.date <= limit)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildReport(snapshot: ActivitySnapshot, now: Date): Report {
  let secured = 0
  let realized = 0
  for (const saving of snapshot.savings) {
    const cents = Number.isFinite(saving.annualSavingCents) ? saving.annualSavingCents : 0
    if (saving.status === "secured") secured += cents
    else if (saving.status === "realized") realized += cents
  }
  return {
    featuresUsed: featuresUsed(snapshot),
    featureTotal: FEATURE_CATALOG.length,
    contracts: snapshot.contracts.length,
    documents: snapshot.documentCount,
    cases: snapshot.caseModules.length,
    sentLetters: snapshot.sentLetterDates.length,
    securedSavingsCents: secured,
    realizedSavingsCents: realized,
    upcomingDeadlines: deadlinesWithin(snapshot, now, 30).length,
  }
}

/**
 * The first real benefit: an evidenced saving or a letter the mail system
 * accepted. Uploading or browsing alone is not a benefit.
 */
export function firstWinAt(snapshot: ActivitySnapshot): string | null {
  const dates = [
    ...snapshot.savings.filter((saving) => saving.status !== "cancelled").map((saving) => saving.createdAt),
    ...snapshot.sentLetterDates,
  ].filter((value) => Number.isFinite(new Date(value).getTime()))
  if (dates.length === 0) return null
  return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
}

export function hasAnyActivity(snapshot: ActivitySnapshot): boolean {
  return (
    snapshot.contracts.length > 0 ||
    snapshot.documentCount > 0 ||
    snapshot.caseModules.length > 0 ||
    snapshot.optimizeSessionCount > 0 ||
    snapshot.sentLetterDates.length > 0
  )
}

export function computeDueNotifications(snapshot: ActivitySnapshot, now: Date): NotificationDraft[] {
  const drafts: NotificationDraft[] = []
  const age = accountAgeDays(snapshot, now)

  const win = firstWinAt(snapshot)
  if (win && now.getTime() - new Date(win).getTime() >= DAY_MS) {
    drafts.push({ kind: "first_win", dedupeKey: "first_win", payload: { ...buildReport(snapshot, now), at: win } })
  }

  // Day 14 report for new accounts; after that one report per calendar month.
  if (age >= 14 && age < 44) {
    drafts.push({ kind: "report_day14", dedupeKey: "report_day14", payload: buildReport(snapshot, now) })
  } else if (age >= 44) {
    const month = day(now).slice(0, 7)
    drafts.push({ kind: "report_monthly", dedupeKey: `report_monthly:${month}`, payload: { ...buildReport(snapshot, now), month } })
  }

  if (age >= 25 && !hasAnyActivity(snapshot)) {
    drafts.push({ kind: "inactive_nudge", dedupeKey: "inactive_nudge", payload: { ageDays: age } })
  }

  for (const contract of deadlinesWithin(snapshot, now, 30)) {
    const daysLeft = Math.round((new Date(`${contract.date}T00:00:00Z`).getTime() - new Date(`${day(now)}T00:00:00Z`).getTime()) / DAY_MS)
    const kind: NotificationKind = daysLeft <= 7 ? "deadline_7" : "deadline_30"
    drafts.push({
      kind,
      dedupeKey: `${kind}:${contract.id}:${contract.date}`,
      payload: { contractId: contract.id, title: contract.title, date: contract.date, daysLeft },
    })
  }

  return drafts
}
