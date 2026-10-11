import { describe, expect, it } from "vitest"
import { summarizeUsers, type AdminSourceUser, type JourneyEvent } from "./journey-summary"

const now = new Date("2026-10-11T12:00:00.000Z")
const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString()
const user = (id: string, createdHoursAgo: number, extra: Partial<AdminSourceUser> = {}): AdminSourceUser => ({ id, email: `${id}@example.com`, created_at: ago(createdHoursAgo), ...extra })
const view = (userId: string, module: string, step: string | null, hoursAgo: number, session = "s1"): JourneyEvent => ({ user_id: userId, event: "page_view", module, step, code: null, session_id: session, created_at: ago(hoursAgo) })
const error = (userId: string, hoursAgo: number): JourneyEvent => ({ user_id: userId, event: "client_error", module: "steuer", step: "review", code: "TypeError", session_id: "s1", created_at: ago(hoursAgo) })
const completed = (id: string) => ({ id, onboarding_step: "completed" })
const accepted = (id: string) => ({ user_id: id, purpose: "terms_and_privacy", granted: true, text_version: "v1" })

function summarize(users: AdminSourceUser[], events: JourneyEvent[] = [], extra: { profiles?: Array<{ id: string; onboarding_step: string | null }>; consents?: Array<{ user_id: string; purpose: string; granted: boolean; text_version: string }> } = {}) {
  return summarizeUsers({
    users,
    events,
    profiles: extra.profiles ?? users.map((item) => completed(item.id)),
    consents: extra.consents ?? users.map((item) => accepted(item.id)),
    now,
    termsVersion: "v1",
  })
}

describe("summarizeUsers", () => {
  it("has no flags for an active user who finished onboarding and accepted the terms", () => {
    const [row] = summarize([user("a", 48)], [view("a", "steuer", null, 2)])
    expect(row.flags).toEqual([])
    expect(row.lastPlace).toEqual({ module: "steuer", step: null })
  })

  it("counts script errors of the last 7 days only", () => {
    const [row] = summarize([user("a", 500)], [error("a", 2), error("a", 30), error("a", 24 * 9)])
    expect(row.errors7d).toBe(2)
    expect(row.flags).toContain("errors")
  })

  it("spots the same screen opened three times in one visit, but not on the dashboard or across visits", () => {
    const stuck = summarize([user("a", 48)], [view("a", "steuer", "review", 3), view("a", "steuer", "review", 2), view("a", "steuer", "review", 1)])[0]
    expect(stuck.loop).toEqual({ module: "steuer", step: "review", count: 3 })
    expect(stuck.flags).toContain("loop")

    const hub = summarize([user("b", 48)], [view("b", "dashboard", null, 3), view("b", "dashboard", null, 2), view("b", "dashboard", null, 1)])[0]
    expect(hub.loop).toBeNull()

    const visits = summarize([user("c", 48)], [view("c", "steuer", "review", 3, "s1"), view("c", "steuer", "review", 2, "s2"), view("c", "steuer", "review", 1, "s3")])[0]
    expect(visits.loop).toBeNull()
  })

  it("flags unfinished onboarding after the first hour", () => {
    const [late] = summarize([user("a", 2)], [], { profiles: [{ id: "a", onboarding_step: "tour" }] })
    expect(late.flags).toContain("onboarding")
    const [fresh] = summarize([user("b", 0.2)], [], { profiles: [{ id: "b", onboarding_step: "profile" }] })
    expect(fresh.flags).not.toContain("onboarding")
  })

  it("flags a recent sign-up without activity for a week, unless recording is off", () => {
    const [quiet] = summarize([user("a", 24 * 10)], [view("a", "steuer", null, 24 * 8)])
    expect(quiet.flags).toContain("inactive")
    const [active] = summarize([user("b", 24 * 10)], [view("b", "steuer", null, 24)])
    expect(active.flags).not.toContain("inactive")
    const [off] = summarize([user("c", 24 * 10)], [], { consents: [accepted("c"), { user_id: "c", purpose: "product_journey", granted: false, text_version: "x" }] })
    expect(off.recordingOff).toBe(true)
    expect(off.flags).not.toContain("inactive")
    const [old] = summarize([user("d", 24 * 40)])
    expect(old.flags).not.toContain("inactive")
  })

  it("flags terms that were not accepted in the current version", () => {
    const [outdated] = summarize([user("a", 48)], [view("a", "steuer", null, 1)], { consents: [{ user_id: "a", purpose: "terms_and_privacy", granted: true, text_version: "v0" }] })
    expect(outdated.termsAccepted).toBe(false)
    expect(outdated.flags).toContain("terms")
  })

  it("lists people who need help first, then the most recently active", () => {
    const rows = summarize(
      [user("calm-old", 48), user("calm-new", 48), user("stuck", 48), user("broken", 48)],
      [
        view("calm-old", "steuer", null, 5),
        view("calm-new", "steuer", null, 1),
        view("stuck", "kindergeld", "antrag", 3), view("stuck", "kindergeld", "antrag", 2), view("stuck", "kindergeld", "antrag", 1),
        error("broken", 1),
      ],
    )
    expect(rows.map((row) => row.id)).toEqual(["broken", "stuck", "calm-new", "calm-old"])
  })

  it("uses the first name from the account metadata when there is one", () => {
    const [named] = summarize([user("a", 48, { user_metadata: { first_name: "  Мария " } })])
    expect(named.name).toBe("Мария")
    const [unnamed] = summarize([user("b", 48, { user_metadata: {} })])
    expect(unnamed.name).toBeNull()
  })
})
