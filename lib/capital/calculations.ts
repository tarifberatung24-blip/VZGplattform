/**
 * Deterministic Capital Engine calculations.
 *
 * All monetary arithmetic uses integer minor units (cents). There is no
 * investment return, inflation, market price, allocation, or product logic —
 * only neutral household cash-flow and reserve arithmetic. Every function is a
 * pure function of its arguments: no clock, no randomness, no I/O.
 */

export type TraceOperation = "income" | "minus" | "equals" | "ratio" | "target" | "gap" | "required" | "remaining"

/** One auditable step of the calculation. */
export type CalculationTraceEntry = {
  operation: TraceOperation
  label: string
  inputKeys: readonly string[]
  inputValues: readonly (number | null)[]
  result: number
  /** "EUR" for money, otherwise a count such as "months". */
  unit: string
  /** True when the value is monetary and expressed in integer minor units. */
  isMoney: boolean
}

/** Sums integer minor-unit amounts; null/undefined are treated as zero. */
export function sumMinorUnits(values: readonly (number | null | undefined)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

export type SurplusInput = {
  /** Monthly net income in minor units. */
  income: number | null
  essentialExpenses: number | null
  debtPayments: number | null
  insuranceCosts: number | null
  existingSavings: number | null
  currency: string
}

export type SurplusResult = {
  income: number
  essentialExpenses: number
  debtPayments: number
  insuranceCosts: number
  existingSavings: number
  availableSurplus: number
  trace: CalculationTraceEntry[]
}

const SURPLUS_LABELS: readonly { key: keyof Omit<SurplusInput, "currency">; label: string }[] = [
  { key: "income", label: "monthly net income" },
  { key: "essentialExpenses", label: "monthly essential expenses" },
  { key: "debtPayments", label: "monthly debt payments" },
  { key: "insuranceCosts", label: "monthly insurance costs" },
  { key: "existingSavings", label: "existing monthly savings" },
]

/**
 * availableSurplus = income - essentialExpenses - debtPayments
 *                  - insuranceCosts - existingSavings
 */
export function calculateMonthlySurplus(input: SurplusInput): SurplusResult {
  const income = input.income ?? 0
  const essentialExpenses = input.essentialExpenses ?? 0
  const debtPayments = input.debtPayments ?? 0
  const insuranceCosts = input.insuranceCosts ?? 0
  const existingSavings = input.existingSavings ?? 0

  const trace: CalculationTraceEntry[] = [
    {
      operation: "income",
      label: SURPLUS_LABELS[0].label,
      inputKeys: ["income"],
      inputValues: [input.income],
      result: income,
      unit: input.currency,
      isMoney: true,
    },
  ]

  let running = income
  for (const { key, label } of SURPLUS_LABELS.slice(1)) {
    const value = input[key] ?? 0
    running -= value
    trace.push({
      operation: "minus",
      label,
      inputKeys: [key],
      inputValues: [input[key]],
      result: running,
      unit: input.currency,
      isMoney: true,
    })
  }

  const availableSurplus = running
  trace.push({
    operation: "equals",
    label: "monthly available surplus",
    inputKeys: SURPLUS_LABELS.map((entry) => entry.key),
    inputValues: SURPLUS_LABELS.map((entry) => input[entry.key]),
    result: availableSurplus,
    unit: input.currency,
    isMoney: true,
  })

  return { income, essentialExpenses, debtPayments, insuranceCosts, existingSavings, availableSurplus, trace }
}

/** Monthly essential outflow = essential expenses + debt payments + insurance costs. */
export function calculateMonthlyEssentialOutflow(input: {
  essentialExpenses: number
  debtPayments: number
  insuranceCosts: number
}): number {
  return input.essentialExpenses + input.debtPayments + input.insuranceCosts
}

export type ReserveInput = {
  essentialExpenses: number
  debtPayments: number
  insuranceCosts: number
  /** Confirmed liquid reserve in minor units. */
  liquidReserve: number
  /** Explicit scenario assumption; never chosen by the engine. */
  reserveMonths: number
  currency: string
}

export type ReserveResult = {
  monthlyEssentialOutflow: number
  reserveTarget: number
  liquidReserve: number
  reserveGap: number
  trace: CalculationTraceEntry[]
}

/** reserveTarget = monthlyEssentialOutflow * reserveMonths; reserveGap = max(0, target - reserve). */
export function calculateReserve(input: ReserveInput): ReserveResult {
  const monthlyEssentialOutflow = calculateMonthlyEssentialOutflow(input)
  const reserveTarget = monthlyEssentialOutflow * input.reserveMonths
  const reserveGap = Math.max(0, reserveTarget - input.liquidReserve)

  const trace: CalculationTraceEntry[] = [
    {
      operation: "equals",
      label: "monthly essential outflow",
      inputKeys: ["essentialExpenses", "debtPayments", "insuranceCosts"],
      inputValues: [input.essentialExpenses, input.debtPayments, input.insuranceCosts],
      result: monthlyEssentialOutflow,
      unit: input.currency,
      isMoney: true,
    },
    {
      operation: "target",
      label: `reserve target (${input.reserveMonths} months)`,
      inputKeys: ["monthlyEssentialOutflow", "reserveMonths"],
      inputValues: [monthlyEssentialOutflow, input.reserveMonths],
      result: reserveTarget,
      unit: input.currency,
      isMoney: true,
    },
    {
      operation: "gap",
      label: "reserve gap",
      inputKeys: ["reserveTarget", "liquidReserve"],
      inputValues: [reserveTarget, input.liquidReserve],
      result: reserveGap,
      unit: input.currency,
      isMoney: true,
    },
  ]

  return { monthlyEssentialOutflow, reserveTarget, liquidReserve: input.liquidReserve, reserveGap, trace }
}

export type GoalInput = {
  targetAmount: number
  fundedAmount: number
  remainingMonths: number
  currency: string
}

export type GoalFeasibility = "feasible" | "not_feasible"

export type GoalResult = {
  targetAmount: number
  fundedAmount: number
  remainingAmount: number
  remainingMonths: number
  requiredMonthlyContribution: number
  /** Surplus left after funding the goal; null when there is no surplus input. */
  surplusAfterContribution: number | null
  feasibility: GoalFeasibility
  trace: CalculationTraceEntry[]
}

/**
 * Goal arithmetic with no returns, inflation, or market assumptions.
 * `requiredMonthlyContribution` rounds up so a goal is never underfunded by
 * rounding. A goal whose remaining amount cannot be covered by the available
 * surplus is `not_feasible`.
 */
export function calculateGoal(input: GoalInput & { availableSurplus?: number | null }): GoalResult {
  const remainingAmount = Math.max(0, input.targetAmount - input.fundedAmount)
  const requiredMonthlyContribution = input.remainingMonths > 0 ? Math.ceil(remainingAmount / input.remainingMonths) : remainingAmount

  const trace: CalculationTraceEntry[] = [
    {
      operation: "remaining",
      label: "remaining amount",
      inputKeys: ["targetAmount", "fundedAmount"],
      inputValues: [input.targetAmount, input.fundedAmount],
      result: remainingAmount,
      unit: input.currency,
      isMoney: true,
    },
    {
      operation: "required",
      label: "required monthly contribution",
      inputKeys: ["remainingAmount", "remainingMonths"],
      inputValues: [remainingAmount, input.remainingMonths],
      result: requiredMonthlyContribution,
      unit: input.currency,
      isMoney: true,
    },
  ]

  const availableSurplus = input.availableSurplus ?? null
  const surplusAfterContribution = availableSurplus === null ? null : availableSurplus - requiredMonthlyContribution

  if (surplusAfterContribution !== null) {
    trace.push({
      operation: "minus",
      label: "surplus after goal contribution",
      inputKeys: ["availableSurplus", "requiredMonthlyContribution"],
      inputValues: [availableSurplus, requiredMonthlyContribution],
      result: surplusAfterContribution,
      unit: input.currency,
      isMoney: true,
    })
  }

  const feasibility: GoalFeasibility = surplusAfterContribution === null || surplusAfterContribution < 0 ? "not_feasible" : "feasible"

  return {
    targetAmount: input.targetAmount,
    fundedAmount: input.fundedAmount,
    remainingAmount,
    remainingMonths: input.remainingMonths,
    requiredMonthlyContribution,
    surplusAfterContribution,
    feasibility,
    trace,
  }
}
