export type AttentionTone = "urgent" | "soon" | "info"
export type AttentionKind = "deadline" | "cancellation" | "review" | "missing_amount" | "profile"
export type AttentionItem = { id: string; kind: AttentionKind; title: string; detail: string; href: string; tone: AttentionTone }

type Locale = "bg" | "de"

export type AttentionInput = {
  locale: Locale
  now: Date
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
  contracts: Array<{ id: string; title: string; monthly_amount: number | null; cancellation_deadline?: string | null; status?: string | null }>
  reviewCount: number
  profileCompleteness: number | null | undefined
  /** Localized hrefs, resolved by the caller. */
  paths: { documents: string; contracts: string; profile: string }
}

const DAY_MS = 86_400_000
const DEADLINE_WINDOW_DAYS = 30
const OVERDUE_WINDOW_DAYS = 90
const CANCELLATION_WINDOW_DAYS = 60
const URGENT_DAYS = 7
const PROFILE_THRESHOLD = 60
const CLOSED_REMINDER = new Set(["done", "completed", "dismissed", "cancelled", "canceled", "closed"])
const ENDED_CONTRACT = /cancel|kündig|ended|terminated|beendet/i

/** Whole calendar days from `now` to the date in `iso`; negative when it has passed. Null for an invalid date. */
export function daysUntil(iso: string, now: Date): number | null {
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return null
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  return Math.round((day(due) - day(now)) / DAY_MS)
}

export function relativeDays(days: number, locale: Locale): string {
  if (locale === "de") {
    if (days === 0) return "heute"
    if (days === 1) return "morgen"
    if (days > 1) return `in ${days} Tagen`
    return days === -1 ? "seit gestern überfällig" : `seit ${-days} Tagen überfällig`
  }
  if (days === 0) return "днес"
  if (days === 1) return "утре"
  if (days > 1) return `след ${days} дни`
  return days === -1 ? "просрочено от вчера" : `просрочено с ${-days} дни`
}

const toneFor = (days: number): AttentionTone => (days <= URGENT_DAYS ? "urgent" : "soon")
const TONE_RANK: Record<AttentionTone, number> = { urgent: 0, soon: 1, info: 2 }

/**
 * Everything on the dashboard that needs the user, most urgent first: overdue and near deadlines,
 * upcoming cancellation dates, documents waiting for review, contracts without a monthly amount and
 * an incomplete profile. Built only from data the dashboard already loads.
 */
export function buildAttentionItems(input: AttentionInput): AttentionItem[] {
  const { locale, now, paths } = input
  const de = locale === "de"
  const dated: Array<AttentionItem & { days: number }> = []

  const reminderKeys = new Set<string>()
  for (const reminder of input.reminders) {
    if (!reminder.due_at || CLOSED_REMINDER.has((reminder.status ?? "").toLowerCase())) continue
    const days = daysUntil(reminder.due_at, now)
    if (days === null || days > DEADLINE_WINDOW_DAYS || days < -OVERDUE_WINDOW_DAYS) continue
    reminderKeys.add(`${reminder.due_at.slice(0, 10)}|${reminder.title.toLowerCase()}`)
    dated.push({ id: `deadline-${reminder.id}`, kind: "deadline", title: reminder.title, detail: relativeDays(days, locale), href: paths.contracts, tone: toneFor(days), days })
  }

  for (const contract of input.contracts) {
    if (!contract.cancellation_deadline || ENDED_CONTRACT.test(contract.status ?? "")) continue
    const days = daysUntil(contract.cancellation_deadline, now)
    if (days === null || days < 0 || days > CANCELLATION_WINDOW_DAYS) continue
    // A reminder created from this contract already covers the same date.
    const date = contract.cancellation_deadline.slice(0, 10)
    const covered = [...reminderKeys].some((key) => key.startsWith(`${date}|`) && key.includes(contract.title.toLowerCase()))
    if (covered) continue
    dated.push({
      id: `cancellation-${contract.id}`,
      kind: "cancellation",
      title: de ? `Kündigungsfrist: ${contract.title}` : `Срок за прекратяване: ${contract.title}`,
      detail: relativeDays(days, locale),
      href: paths.contracts,
      tone: days <= 14 ? "urgent" : "soon",
      days,
    })
  }

  const rest: AttentionItem[] = []
  if (input.reviewCount > 0) {
    const n = input.reviewCount
    rest.push({
      id: "review",
      kind: "review",
      title: de ? (n === 1 ? "1 Dokument wartet auf Prüfung" : `${n} Dokumente warten auf Prüfung`) : (n === 1 ? "1 документ чака проверка" : `${n} документа чакат проверка`),
      detail: de ? "Erkannte Angaben prüfen" : "Провери разчетените данни",
      href: paths.documents,
      tone: "soon",
    })
  }

  const missing = input.contracts.filter((contract) => contract.monthly_amount == null)
  if (missing.length > 0) {
    const n = missing.length
    rest.push({
      id: "missing-amount",
      kind: "missing_amount",
      title: n === 1
        ? (de ? `Monatlicher Betrag fehlt: ${missing[0].title}` : `Липсва месечна сума: ${missing[0].title}`)
        : (de ? `Bei ${n} Verträgen fehlt der Monatsbetrag` : `Липсват месечни суми за ${n} договора`),
      detail: de ? "Ohne ihn sind die Kosten unvollständig" : "Без нея разходите не са пълни",
      href: paths.contracts,
      tone: "info",
    })
  }

  const completeness = input.profileCompleteness ?? 0
  if (completeness < PROFILE_THRESHOLD) {
    rest.push({
      id: "profile",
      kind: "profile",
      title: de ? "Profil vervollständigen" : "Попълни профила си",
      detail: de ? `Zu ${completeness} % ausgefüllt` : `Попълнен на ${completeness}%`,
      href: paths.profile,
      tone: "info",
    })
  }

  dated.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || a.days - b.days)
  const ordered: AttentionItem[] = dated.map(({ id, kind, title, detail, href, tone }) => ({ id, kind, title, detail, href, tone }))
  return [...ordered, ...rest].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
}
