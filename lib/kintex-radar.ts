export type RadarContract = {
  id: string
  title: string
  category: string
  monthly_amount: number | null
  status: string | null
  end_date: string | null
  cancellation_deadline?: string | null
  review_status?: string | null
}

export type RadarSignal = { id: string; title: string; detail: string; tone: "attention" | "info" }

// Contracts contain calendar dates, not instants. Compare them with today's
// calendar date in Germany so a deadline remains visible throughout that day.
function berlinDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: string) => parts.find((value) => value.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

function calendarDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

export function getKintexRadarSignals(contracts: RadarContract[], now = new Date()): RadarSignal[] {
  const signals: RadarSignal[] = []
  const today = berlinDate(now)
  const soon = new Date(`${today}T00:00:00Z`)
  soon.setUTCDate(soon.getUTCDate() + 90)
  const lastDay = soon.toISOString().slice(0, 10)
  for (const contract of contracts) {
    if (contract.monthly_amount == null) signals.push({ id: `${contract.id}-amount`, title: `${contract.title}: липсва месечна сума`, detail: "Въведи сумата, за да се включи в реалния преглед.", tone: "attention" })
    const needsReview = contract.review_status != null
      ? contract.review_status !== "confirmed"
      : contract.status === "draft" || contract.status === "needs_review"
    if (needsReview) signals.push({ id: `${contract.id}-review`, title: `${contract.title}: чака потвърждение`, detail: "Провери данните преди да разчиташ на тях.", tone: "attention" })
    const cancellation = calendarDate(contract.cancellation_deadline)
    if (cancellation && cancellation >= today && cancellation <= lastDay) signals.push({ id: `${contract.id}-cancellation`, title: `${contract.title}: срок за Kündigung`, detail: `Записан срок за прекратяване: ${cancellation.split("-").reverse().join(".")}.${needsReview ? " Датата чака потвърждение." : ""}`, tone: "attention" })
    const end = calendarDate(contract.end_date)
    if (end && end >= today && end <= lastDay) signals.push({ id: `${contract.id}-end`, title: `${contract.title}: срокът наближава`, detail: `Крайна дата: ${end.split("-").reverse().join(".")}.`, tone: "info" })
  }
  // Do not drop deadlines before the API can persist them. Presentation layers
  // may paginate the complete set of signals.
  return Array.from(new Map(signals.map((signal) => [signal.id, signal])).values())
}
