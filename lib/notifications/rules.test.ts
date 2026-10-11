import { describe, expect, it } from "vitest"
import { buildReport, computeDueNotifications, DAY_MS, featuresUsed, firstWinAt, type ActivitySnapshot } from "./rules"

const now = new Date("2026-10-11T08:00:00Z")
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString()
const base = (overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot => ({
  accountCreatedAt: daysAgo(3),
  contracts: [],
  documentCount: 0,
  caseModules: [],
  optimizeSessionCount: 0,
  sentLetterDates: [],
  savings: [],
  ...overrides,
})
const kinds = (snapshot: ActivitySnapshot) => computeDueNotifications(snapshot, now).map((draft) => draft.kind)

describe("notification rules", () => {
  it("sends nothing to a brand-new, inactive account", () => {
    expect(kinds(base())).toEqual([])
  })

  it("sends the day 14 report from day 14 to day 43, then one report per month", () => {
    expect(kinds(base({ accountCreatedAt: daysAgo(13) }))).toEqual([])
    expect(kinds(base({ accountCreatedAt: daysAgo(14) }))).toEqual(["report_day14"])
    const later = computeDueNotifications(base({ accountCreatedAt: daysAgo(60), documentCount: 1 }), now)
    expect(later.map((draft) => draft.dedupeKey)).toEqual(["report_monthly:2026-10"])
  })

  it("nudges an account with no activity at all from day 25, once", () => {
    const due = computeDueNotifications(base({ accountCreatedAt: daysAgo(25) }), now)
    expect(due.map((draft) => draft.dedupeKey)).toContain("inactive_nudge")
    expect(kinds(base({ accountCreatedAt: daysAgo(25), documentCount: 1 }))).not.toContain("inactive_nudge")
  })

  it("confirms the first win 24 hours after an evidenced saving or a sent letter", () => {
    const fresh = base({ savings: [{ status: "secured", annualSavingCents: 29400, createdAt: daysAgo(0.5) }] })
    expect(kinds(fresh)).not.toContain("first_win")
    const ready = base({ savings: [{ status: "secured", annualSavingCents: 29400, createdAt: daysAgo(1.5) }] })
    expect(kinds(ready)).toContain("first_win")
    expect(kinds(base({ sentLetterDates: [daysAgo(2)] }))).toContain("first_win")
    expect(firstWinAt(base({ savings: [{ status: "cancelled", annualSavingCents: 100, createdAt: daysAgo(5) }] }))).toBeNull()
  })

  it("reminds 30 and 7 days before a cancellation deadline, each once per deadline", () => {
    const in20 = new Date(now.getTime() + 20 * DAY_MS).toISOString().slice(0, 10)
    const in5 = new Date(now.getTime() + 5 * DAY_MS).toISOString().slice(0, 10)
    const past = new Date(now.getTime() - 2 * DAY_MS).toISOString().slice(0, 10)
    const due = computeDueNotifications(
      base({
        contracts: [
          { id: "a", title: "Strom", cancellationDeadline: in20 },
          { id: "b", title: "Handy", cancellationDeadline: in5 },
          { id: "c", title: "Alt", cancellationDeadline: past },
          { id: "d", title: "Ohne", cancellationDeadline: null },
        ],
      }),
      now,
    )
    expect(due.map((draft) => draft.dedupeKey)).toEqual([`deadline_7:b:${in5}`, `deadline_30:a:${in20}`])
    expect(due.find((draft) => draft.kind === "deadline_7")?.payload).toMatchObject({ title: "Handy", daysLeft: 5 })
  })

  it("counts used functions against the catalogue and only evidenced savings", () => {
    const snapshot = base({
      documentCount: 2,
      contracts: [{ id: "a", title: "Strom", cancellationDeadline: null }],
      caseModules: ["kuendigung", "jobcenter", "general"],
      optimizeSessionCount: 1,
      sentLetterDates: [daysAgo(3)],
      savings: [
        { status: "secured", annualSavingCents: 29400, createdAt: daysAgo(4) },
        { status: "realized", annualSavingCents: 12000, createdAt: daysAgo(30) },
        { status: "cancelled", annualSavingCents: 99900, createdAt: daysAgo(10) },
      ],
    })
    expect(featuresUsed(snapshot)).toEqual(["documents", "contracts", "cancellation", "benefits", "tariff_compare", "letter_sent"])
    expect(buildReport(snapshot, now)).toMatchObject({ featureTotal: 8, securedSavingsCents: 29400, realizedSavingsCents: 12000, sentLetters: 1 })
  })

  it("never produces two drafts with the same dedupe key", () => {
    const due = computeDueNotifications(base({ accountCreatedAt: daysAgo(30), sentLetterDates: [daysAgo(3)] }), now)
    expect(new Set(due.map((draft) => draft.dedupeKey)).size).toBe(due.length)
  })
})
