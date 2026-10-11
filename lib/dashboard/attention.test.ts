import { describe, expect, it } from "vitest"
import { buildAttentionItems, daysUntil, relativeDays, type AttentionInput } from "./attention"

const now = new Date(2026, 9, 11, 12, 0, 0)
const iso = (offsetDays: number) => {
  const date = new Date(2026, 9, 11 + offsetDays)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const base: AttentionInput = {
  locale: "bg",
  now,
  reminders: [],
  contracts: [],
  reviewCount: 0,
  profileCompleteness: 100,
  paths: { documents: "/bg/documents", contracts: "/bg/vertraege", profile: "/bg/profil" },
}

describe("daysUntil and relativeDays", () => {
  it("counts calendar days", () => {
    expect(daysUntil(iso(0), now)).toBe(0)
    expect(daysUntil(iso(3), now)).toBe(3)
    expect(daysUntil(iso(-2), now)).toBe(-2)
    expect(daysUntil("not a date", now)).toBeNull()
  })

  it("speaks both languages", () => {
    expect(relativeDays(0, "bg")).toBe("днес")
    expect(relativeDays(1, "de")).toBe("morgen")
    expect(relativeDays(5, "bg")).toBe("след 5 дни")
    expect(relativeDays(-3, "de")).toBe("seit 3 Tagen überfällig")
  })
})

describe("buildAttentionItems", () => {
  it("is empty when nothing needs the user", () => {
    expect(buildAttentionItems(base)).toEqual([])
  })

  it("puts overdue and near deadlines first, sorted by date", () => {
    const items = buildAttentionItems({
      ...base,
      reminders: [
        { id: "far", title: "Steuer", due_at: iso(20), status: "open" },
        { id: "late", title: "Jobcenter", due_at: iso(-2), status: "open" },
        { id: "soon", title: "Kita", due_at: iso(3), status: "open" },
      ],
    })
    expect(items.map((item) => item.id)).toEqual(["deadline-late", "deadline-soon", "deadline-far"])
    expect(items.map((item) => item.tone)).toEqual(["urgent", "urgent", "soon"])
    expect(items[0].detail).toBe("просрочено с 2 дни")
  })

  it("leaves out closed reminders and dates outside the window", () => {
    const items = buildAttentionItems({
      ...base,
      reminders: [
        { id: "done", title: "A", due_at: iso(1), status: "done" },
        { id: "later", title: "B", due_at: iso(45), status: "open" },
        { id: "ancient", title: "C", due_at: iso(-200), status: "open" },
        { id: "nodate", title: "D", due_at: null, status: "open" },
      ],
    })
    expect(items).toEqual([])
  })

  it("shows upcoming cancellation dates unless a reminder already covers them", () => {
    const items = buildAttentionItems({
      ...base,
      contracts: [
        { id: "c1", title: "Vodafone", monthly_amount: 30, cancellation_deadline: iso(10) },
        { id: "c2", title: "Strom", monthly_amount: 80, cancellation_deadline: iso(20) },
        { id: "c3", title: "Gym", monthly_amount: 20, cancellation_deadline: iso(5), status: "cancelled" },
        { id: "c4", title: "Old", monthly_amount: 10, cancellation_deadline: iso(-1) },
      ],
      reminders: [{ id: "r1", title: "Договор: Strom", due_at: `${iso(20)}T00:00:00.000Z`, status: "open" }],
    })
    expect(items.map((item) => item.id)).toEqual(["cancellation-c1", "deadline-r1"])
    expect(items[0]).toMatchObject({ title: "Срок за прекратяване: Vodafone", tone: "urgent", detail: "след 10 дни" })
  })

  it("adds review, missing amounts and an incomplete profile after the dated items", () => {
    const items = buildAttentionItems({
      ...base,
      locale: "de",
      reviewCount: 2,
      profileCompleteness: 40,
      contracts: [
        { id: "a", title: "Handy", monthly_amount: null },
        { id: "b", title: "Internet", monthly_amount: null },
      ],
      reminders: [{ id: "r", title: "Frist", due_at: iso(2), status: "open" }],
      paths: { documents: "/de/documents", contracts: "/de/vertraege", profile: "/de/profil" },
    })
    expect(items.map((item) => item.kind)).toEqual(["deadline", "review", "missing_amount", "profile"])
    expect(items[1]).toMatchObject({ title: "2 Dokumente warten auf Prüfung", href: "/de/documents" })
    expect(items[2].title).toBe("Bei 2 Verträgen fehlt der Monatsbetrag")
    expect(items[3]).toMatchObject({ detail: "Zu 40 % ausgefüllt", href: "/de/profil" })
  })

  it("uses the singular for one document or one missing amount", () => {
    const items = buildAttentionItems({ ...base, reviewCount: 1, contracts: [{ id: "a", title: "Telekom", monthly_amount: null }] })
    expect(items[0].title).toBe("1 документ чака проверка")
    expect(items[1].title).toBe("Липсва месечна сума: Telekom")
  })
})
