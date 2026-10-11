/**
 * "Your value" summary for the dashboard: what HORIZON keeps under control for
 * the user, from confirmed data only. Savings come exclusively from the
 * evidenced `household_savings` ledger; nothing here is estimated.
 */

export type ValueContract = {
  monthly_amount: number | string | null
  cancellation_deadline: string | null
  end_date: string | null
}

export type ValueSaving = { status: string; annual_saving_cents: number }

export type YourValue = {
  trackedContracts: number
  monthlyUnderControl: number
  /** Contracts whose next cancellation deadline or end date lies within the horizon. */
  upcomingDeadlines: number
  nextDeadline: string | null
  securedAnnualSavings: number
  realizedAnnualSavings: number
}

export const DEADLINE_HORIZON_DAYS = 90

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toAmount(value: number | string | null): number {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

export function computeYourValue(
  contracts: ValueContract[],
  savings: ValueSaving[],
  now: Date = new Date(),
  horizonDays = DEADLINE_HORIZON_DAYS,
): YourValue {
  const today = isoDay(now)
  const limit = isoDay(new Date(now.getTime() + horizonDays * 86_400_000))
  let upcomingDeadlines = 0
  let nextDeadline: string | null = null
  let monthly = 0
  for (const contract of contracts) {
    monthly += toAmount(contract.monthly_amount)
    // The earliest evidenced date that still lies ahead is the one that matters.
    const first = [contract.cancellation_deadline, contract.end_date]
      .map((value) => value?.slice(0, 10) ?? null)
      .filter((value): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today))
      .sort()[0]
    if (!first) continue
    if (first <= limit) upcomingDeadlines += 1
    if (!nextDeadline || first < nextDeadline) nextDeadline = first
  }
  let securedCents = 0
  let realizedCents = 0
  for (const saving of savings) {
    const cents = Number.isFinite(saving.annual_saving_cents) ? saving.annual_saving_cents : 0
    if (saving.status === "secured") securedCents += cents
    else if (saving.status === "realized") realizedCents += cents
  }
  return {
    trackedContracts: contracts.length,
    monthlyUnderControl: Math.round(monthly * 100) / 100,
    upcomingDeadlines,
    nextDeadline,
    securedAnnualSavings: securedCents / 100,
    realizedAnnualSavings: realizedCents / 100,
  }
}
