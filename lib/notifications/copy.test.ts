import { describe, expect, it } from "vitest"
import { inboxCopy, renderNotification, renderNotificationEmail } from "./copy"
import type { NotificationKind } from "./rules"

const report = { featuresUsed: ["documents", "contracts"], featureTotal: 8, contracts: 1, documents: 2, cases: 0, sentLetters: 0, securedSavingsCents: 29400, realizedSavingsCents: 0, upcomingDeadlines: 1 }
const payloads: Record<NotificationKind, Record<string, unknown>> = {
  first_win: { ...report, at: "2026-10-09T10:00:00Z" },
  report_monthly: { ...report, month: "2026-10" },
  inactive_nudge: { ageDays: 25 },
  deadline_30: { contractId: "a", title: "Strom", date: "2026-11-05", daysLeft: 25 },
  deadline_7: { contractId: "b", title: "Handy", date: "2026-10-15", daysLeft: 1 },
}

describe("notification copy", () => {
  for (const locale of ["bg", "de"] as const) {
    for (const kind of Object.keys(payloads) as NotificationKind[]) {
      it(`${locale} ${kind}: complete, linked, Humanizer-clean`, () => {
        const item = renderNotification(kind, payloads[kind], locale)
        expect(item.title.trim().length).toBeGreaterThan(0)
        expect(item.body.trim().length).toBeGreaterThan(0)
        expect(item.href.startsWith(`/${locale}/`)).toBe(true)
        expect(`${item.title}\n${item.body}\n${item.cta}`).not.toMatch(/[—–!]/)
      })
    }
  }

  it("shows the evidenced saving, never an estimate", () => {
    expect(renderNotification("report_monthly", report, "bg").body).toMatch(/294,00\s€ годишно/)
    expect(renderNotification("report_monthly", { ...report, securedSavingsCents: 0 }, "bg").body).toMatch(/Още няма доказано спестяване/)
    expect(renderNotification("report_monthly", report, "de").body).toMatch(/Genutzt: 2 von 8/)
  })

  it("handles the last day of a deadline", () => {
    expect(renderNotification("deadline_7", { ...payloads.deadline_7, daysLeft: 0 }, "bg").body).toMatch(/изтича днес/)
    expect(renderNotification("deadline_7", payloads.deadline_7, "de").body).toMatch(/Noch 1 Tag/)
  })

  it("e-mails carry an absolute link and how to switch e-mails off", () => {
    const mail = renderNotificationEmail("deadline_30", payloads.deadline_30, "bg", "https://example.de")
    expect(mail.body).toContain("https://example.de/bg/vertraege")
    expect(mail.body).toContain(inboxCopy.bg.emailFooter)
    expect(mail.subject).toBe(renderNotification("deadline_30", payloads.deadline_30, "bg").title)
  })

  it("survives a malformed payload", () => {
    expect(() => renderNotification("report_monthly", { featuresUsed: "x", contracts: "y" }, "de")).not.toThrow()
    expect(() => renderNotification("deadline_30", {}, "bg")).not.toThrow()
  })
})
