export const CAPITAL_ENGINE_VERSION = "capital-engine-2026.09.18"
export const CAPITAL_DISCLAIMER_VERSION = "capital-disclaimer-1"

export type CapitalRiskProfile = "conservative" | "balanced" | "growth"
export type CapitalScenarioKey = "conservative" | "balanced" | "growth"

export type Money = {
  amount: number
  currency: "EUR"
}

export type CapitalGoal = {
  id: string
  title: string
  goalType: string
  targetAmount: Money | null
  targetDate: string | null
  priority: number
}

export type CapitalInputs = {
  monthlyIncome: Money | null
  monthlyFixedCosts: Money | null
  monthlyVariableCosts: Money | null
  currentSavings: Money | null
  monthlyDebtPayments: Money | null
  monthlyInsuranceCosts: Money | null
  goals: CapitalGoal[]
  riskProfile: CapitalRiskProfile | null
  emergencyReserveMonths: number | null
}

export type StrategyAssumptions = {
  annualInflationRate: number
  annualReturnRate: number
  emergencyReserveMonths: number
  minimumMonthlyBuffer: number
  currency: "EUR"
}

export type CapitalScenario = {
  key: CapitalScenarioKey
  monthlySurplus: Money | null
  emergencyReserveTarget: Money | null
  projectedGoalAmount: Money | null
  monthlyGoalContribution: Money | null
  allocation: {
    liquidity: number
    protection: number
    growth: number
  }
  feasibility: "needs_data" | "not_feasible" | "feasible" | "review_required"
  missingInputs: string[]
  explanation: string
}

export type CapitalStrategy = {
  engineVersion: string
  generatedAt: string
  inputs: CapitalInputs
  assumptions: StrategyAssumptions
  scenarios: CapitalScenario[]
}

export type PublishCapitalPackage = {
  schemaVersion: "capital-publish-v1"
  advisorClientId: string
  targetHouseholdId: string
  analysisId: string
  analysisVersion: number
  strategyId: string
  strategyVersion: number
  goals: CapitalGoal[]
  approvedContracts: Array<{
    id: string
    title: string
    provider: string | null
    monthlyAmount: Money | null
    status: string
  }>
  scenarios: CapitalScenario[]
  roadmap: Array<{
    title: string
    metric: string
    targetValue: number | null
    targetDate: string | null
  }>
  assumptions: StrategyAssumptions
  sourceRefs: string[]
  disclaimerVersion: string
  payloadHash: string
  idempotencyKey: string
}
