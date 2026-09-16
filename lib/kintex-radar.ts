export type RadarContract = {
  id: string
  title: string
  category: string
  monthly_amount: number | null
  status: string | null
  end_date: string | null
}

export type RadarSignal = { id: string; title: string; detail: string; tone: "attention" | "info" }

export function getKintexRadarSignals(contracts: RadarContract[], now = new Date()): RadarSignal[] {
  const signals: RadarSignal[] = []
  const soon = new Date(now)
  soon.setDate(soon.getDate() + 90)
  for (const contract of contracts) {
    if (contract.monthly_amount == null) signals.push({ id: `${contract.id}-amount`, title: `${contract.title}: липсва месечна сума`, detail: "Въведи сумата, за да се включи в реалния преглед.", tone: "attention" })
    if (contract.status === "draft" || contract.status === "needs_review") signals.push({ id: `${contract.id}-review`, title: `${contract.title}: чака потвърждение`, detail: "Провери данните преди да разчиташ на тях.", tone: "attention" })
    if (contract.end_date) {
      const end = new Date(contract.end_date)
      if (end >= now && end <= soon) signals.push({ id: `${contract.id}-end`, title: `${contract.title}: срокът наближава`, detail: `Крайна дата: ${end.toLocaleDateString("bg-BG")}.`, tone: "info" })
    }
  }
  return signals.slice(0, 6)
}
