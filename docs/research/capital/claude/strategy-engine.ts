import {
  CAPITAL_ENGINE_VERSION,
  type CapitalInputs,
  type CapitalScenario,
  type CapitalStrategy,
  type StrategyAssumptions,
} from "./types"

const SCENARIO_ALLOCATION = {
  conservative: { liquidity: 0.65, protection: 0.3, growth: 0.05 },
  balanced: { liquidity: 0.35, protection: 0.25, growth: 0.4 },
  growth: { liquidity: 0.2, protection: 0.15, growth: 0.65 },
} as const

const SCENARIO_RETURN_RATE = {
  conservative: 0.02,
  balanced: 0.045,
  growth: 0.07,
} as const

function money(amount: number | null) {
  return amount == null || !Number.isFinite(amount) ? null : { amount: Math.round(amount * 100) / 100, currency: "EUR" as const }
}

function positiveOrNull(value: number | null) {
  return value != null && Number.isFinite(value) ? Math.max(0, value) : null
}

function monthsUntil(targetDate: string | null, now: Date): number | null {
  if (!targetDate) return null
  const target = new Date(`${targetDate}T00:00:00Z`)
  if (Number.isNaN(target.getTime())) return null
  const months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + target.getUTCMonth() - now.getUTCMonth()
  return Math.max(0, months)
}

function monthlySurplus(inputs: CapitalInputs): number | null {
  const income = inputs.monthlyIncome?.amount
  const fixed = inputs.monthlyFixedCosts?.amount
  if (income == null || fixed == null) return null
  return income - fixed - (inputs.monthlyVariableCosts?.amount ?? 0) - (inputs.monthlyDebtPayments?.amount ?? 0) - (inputs.monthlyInsuranceCosts?.amount ?? 0)
}

function scenario(inputs: CapitalInputs, assumptions: StrategyAssumptions, key: keyof typeof SCENARIO_ALLOCATION, now: Date): CapitalScenario {
  const surplus = monthlySurplus(inputs)
  const currentSavings = positiveOrNull(inputs.currentSavings?.amount ?? null)
  const fixedCosts = positiveOrNull(inputs.monthlyFixedCosts?.amount ?? null)
  const emergencyMonths = inputs.emergencyReserveMonths ?? assumptions.emergencyReserveMonths
  const reserveTarget = fixedCosts == null ? null : fixedCosts * emergencyMonths
  const primaryGoal = [...inputs.goals].sort((a, b) => a.priority - b.priority)[0]
  const months = monthsUntil(primaryGoal?.targetDate ?? null, now)
  const goalAmount = positiveOrNull(primaryGoal?.targetAmount?.amount ?? null)
  const requiredContribution = goalAmount != null && months != null && months > 0 ? Math.max(0, (goalAmount - (currentSavings ?? 0)) / months) : null
  const buffer = assumptions.minimumMonthlyBuffer
  const missingInputs: string[] = []

  if (surplus == null) missingInputs.push("monthly_income_or_expenses")
  if (currentSavings == null) missingInputs.push("current_savings")
  if (primaryGoal && goalAmount == null) missingInputs.push("goal_amount")
  if (primaryGoal && months == null) missingInputs.push("goal_date")
  if (fixedCosts == null) missingInputs.push("monthly_fixed_costs")

  let feasibility: CapitalScenario["feasibility"] = missingInputs.length > 0 ? "needs_data" : "feasible"
  if (surplus != null && surplus < buffer) feasibility = "not_feasible"
  if (surplus != null && requiredContribution != null && surplus - requiredContribution < buffer) feasibility = "review_required"

  const projected = goalAmount != null && months != null ? (currentSavings ?? 0) * Math.pow(1 + SCENARIO_RETURN_RATE[key] / 12, months) + Math.max(0, surplus ?? 0) * ((Math.pow(1 + SCENARIO_RETURN_RATE[key] / 12, months) - 1) / (SCENARIO_RETURN_RATE[key] / 12 || 1)) : null

  return {
    key,
    monthlySurplus: money(surplus),
    emergencyReserveTarget: money(reserveTarget),
    projectedGoalAmount: money(projected),
    monthlyGoalContribution: money(requiredContribution),
    allocation: SCENARIO_ALLOCATION[key],
    feasibility,
    missingInputs,
    explanation: feasibility === "needs_data" ? "Weitere bestätigte Finanzdaten werden benötigt." : feasibility === "not_feasible" ? "Der aktuelle Überschuss liegt unter dem Mindestpuffer." : feasibility === "review_required" ? "Das Ziel ist mit dem aktuellen Überschuss nur unter zusätzlichen Annahmen erreichbar." : "Die Variante erfüllt die definierten Eingangsdaten und Annahmen.",
  }
}

export function generateCapitalStrategy(inputs: CapitalInputs, assumptions: StrategyAssumptions, now = new Date()): CapitalStrategy {
  return {
    engineVersion: CAPITAL_ENGINE_VERSION,
    generatedAt: now.toISOString(),
    inputs,
    assumptions,
    scenarios: (Object.keys(SCENARIO_ALLOCATION) as Array<keyof typeof SCENARIO_ALLOCATION>).map((key) => scenario(inputs, assumptions, key, now)),
  }
}
