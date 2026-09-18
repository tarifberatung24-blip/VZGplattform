import { describe, expect, it } from "vitest"

import {
  calculateGoal,
  calculateMonthlyEssentialOutflow,
  calculateMonthlySurplus,
  calculateReserve,
  sumMinorUnits,
} from "./calculations"

const EUR = "EUR"

describe("calculateMonthlySurplus", () => {
  it("subtracts every outflow from income deterministically", () => {
    const result = calculateMonthlySurplus({
      income: 320_000,
      essentialExpenses: 120_000,
      debtPayments: 50_000,
      insuranceCosts: 20_000,
      existingSavings: 30_000,
      currency: EUR,
    })
    expect(result.availableSurplus).toBe(100_000)
    expect(result.income).toBe(320_000)
    expect(result.essentialExpenses).toBe(120_000)
    expect(result.debtPayments).toBe(50_000)
    expect(result.insuranceCosts).toBe(20_000)
    expect(result.existingSavings).toBe(30_000)
  })

  it("produces a negative surplus when outflows exceed income", () => {
    const result = calculateMonthlySurplus({
      income: 100_000,
      essentialExpenses: 90_000,
      debtPayments: 30_000,
      insuranceCosts: 10_000,
      existingSavings: 5_000,
      currency: EUR,
    })
    expect(result.availableSurplus).toBe(-35_000)
  })

  it("treats null inputs as zero without inventing values", () => {
    const result = calculateMonthlySurplus({
      income: 200_000,
      essentialExpenses: null,
      debtPayments: null,
      insuranceCosts: null,
      existingSavings: null,
      currency: EUR,
    })
    expect(result.availableSurplus).toBe(200_000)
    expect(result.essentialExpenses).toBe(0)
  })

  it("keeps money in integer minor units", () => {
    const result = calculateMonthlySurplus({
      income: 320_001,
      essentialExpenses: 120_000,
      debtPayments: 0,
      insuranceCosts: 0,
      existingSavings: 1,
      currency: EUR,
    })
    expect(Number.isInteger(result.availableSurplus)).toBe(true)
    expect(result.availableSurplus).toBe(200_000)
  })

  it("emits an explainable trace ending in the surplus", () => {
    const result = calculateMonthlySurplus({
      income: 300_000,
      essentialExpenses: 100_000,
      debtPayments: 50_000,
      insuranceCosts: 25_000,
      existingSavings: 25_000,
      currency: EUR,
    })
    expect(result.trace.map((entry) => entry.operation)).toEqual(["income", "minus", "minus", "minus", "minus", "equals"])
    expect(result.trace[0].label).toContain("income")
    expect(result.trace.at(-1)?.result).toBe(100_000)
    for (const entry of result.trace) {
      expect(entry.unit).toBe(EUR)
      expect(entry.isMoney).toBe(true)
      expect(entry.inputKeys.length).toBe(entry.inputValues.length)
    }
  })

  it("is deterministic across repeated calls", () => {
    const input = { income: 300_000, essentialExpenses: 100_000, debtPayments: 0, insuranceCosts: 0, existingSavings: 0, currency: EUR }
    expect(calculateMonthlySurplus(input)).toEqual(calculateMonthlySurplus(input))
  })
})

describe("sumMinorUnits and essential outflow", () => {
  it("sums minor units and ignores nulls", () => {
    expect(sumMinorUnits([1, 2, null, undefined, 3])).toBe(6)
    expect(sumMinorUnits([])).toBe(0)
  })

  it("computes monthly essential outflow", () => {
    expect(calculateMonthlyEssentialOutflow({ essentialExpenses: 100_000, debtPayments: 50_000, insuranceCosts: 25_000 })).toBe(175_000)
  })
})

describe("calculateReserve", () => {
  it("computes the reserve target from the explicit reserveMonths assumption", () => {
    const result = calculateReserve({
      essentialExpenses: 100_000,
      debtPayments: 50_000,
      insuranceCosts: 25_000,
      liquidReserve: 0,
      reserveMonths: 6,
      currency: EUR,
    })
    expect(result.monthlyEssentialOutflow).toBe(175_000)
    expect(result.reserveTarget).toBe(1_050_000)
  })

  it("computes the reserve gap", () => {
    const result = calculateReserve({
      essentialExpenses: 100_000,
      debtPayments: 50_000,
      insuranceCosts: 25_000,
      liquidReserve: 400_000,
      reserveMonths: 6,
      currency: EUR,
    })
    expect(result.reserveTarget).toBe(1_050_000)
    expect(result.reserveGap).toBe(650_000)
  })

  it("clamps the reserve gap at zero when the reserve is sufficient", () => {
    const result = calculateReserve({
      essentialExpenses: 100_000,
      debtPayments: 50_000,
      insuranceCosts: 25_000,
      liquidReserve: 2_000_000,
      reserveMonths: 6,
      currency: EUR,
    })
    expect(result.reserveGap).toBe(0)
  })

  it("produces a zero gap at exact coverage and keeps integer minor units", () => {
    const result = calculateReserve({
      essentialExpenses: 175_000,
      debtPayments: 0,
      insuranceCosts: 0,
      liquidReserve: 1_050_000,
      reserveMonths: 6,
      currency: EUR,
    })
    expect(result.reserveGap).toBe(0)
    expect(Number.isInteger(result.reserveTarget)).toBe(true)
  })

  it("scales linearly with reserveMonths", () => {
    const base = { essentialExpenses: 100_000, debtPayments: 0, insuranceCosts: 0, liquidReserve: 0, currency: EUR }
    expect(calculateReserve({ ...base, reserveMonths: 3 }).reserveTarget).toBe(300_000)
    expect(calculateReserve({ ...base, reserveMonths: 9 }).reserveTarget).toBe(900_000)
  })

  it("traces outflow, target, and gap", () => {
    const result = calculateReserve({
      essentialExpenses: 100_000,
      debtPayments: 0,
      insuranceCosts: 0,
      liquidReserve: 0,
      reserveMonths: 6,
      currency: EUR,
    })
    expect(result.trace.map((entry) => entry.operation)).toEqual(["equals", "target", "gap"])
  })
})

describe("calculateGoal", () => {
  it("computes the remaining amount and required monthly contribution", () => {
    const result = calculateGoal({
      targetAmount: 1_200_000,
      fundedAmount: 200_000,
      remainingMonths: 24,
      currency: EUR,
      availableSurplus: 100_000,
    })
    expect(result.remainingAmount).toBe(1_000_000)
    expect(result.requiredMonthlyContribution).toBe(41_667)
  })

  it("rounds the required contribution up so a goal is never underfunded", () => {
    const result = calculateGoal({
      targetAmount: 100_000,
      fundedAmount: 0,
      remainingMonths: 3,
      currency: EUR,
      availableSurplus: 100_000,
    })
    expect(result.requiredMonthlyContribution).toBe(33_334)
  })

  it("marks a goal feasible when the surplus covers the contribution", () => {
    const result = calculateGoal({
      targetAmount: 1_200_000,
      fundedAmount: 0,
      remainingMonths: 24,
      currency: EUR,
      availableSurplus: 100_000,
    })
    expect(result.requiredMonthlyContribution).toBe(50_000)
    expect(result.surplusAfterContribution).toBe(50_000)
    expect(result.feasibility).toBe("feasible")
  })

  it("marks a goal not_feasible when the contribution exceeds the surplus", () => {
    const result = calculateGoal({
      targetAmount: 1_200_000,
      fundedAmount: 0,
      remainingMonths: 12,
      currency: EUR,
      availableSurplus: 50_000,
    })
    expect(result.requiredMonthlyContribution).toBe(100_000)
    expect(result.surplusAfterContribution).toBe(-50_000)
    expect(result.feasibility).toBe("not_feasible")
  })

  it("treats an exactly covered goal as feasible", () => {
    const result = calculateGoal({
      targetAmount: 600_000,
      fundedAmount: 0,
      remainingMonths: 12,
      currency: EUR,
      availableSurplus: 50_000,
    })
    expect(result.surplusAfterContribution).toBe(0)
    expect(result.feasibility).toBe("feasible")
  })

  it("is not_feasible without an available surplus rather than assuming one", () => {
    const result = calculateGoal({ targetAmount: 100_000, fundedAmount: 0, remainingMonths: 10, currency: EUR })
    expect(result.surplusAfterContribution).toBeNull()
    expect(result.feasibility).toBe("not_feasible")
  })

  it("never reports a negative remaining amount for an overfunded goal", () => {
    const result = calculateGoal({
      targetAmount: 100_000,
      fundedAmount: 150_000,
      remainingMonths: 10,
      currency: EUR,
      availableSurplus: 50_000,
    })
    expect(result.remainingAmount).toBe(0)
    expect(result.requiredMonthlyContribution).toBe(0)
    expect(result.feasibility).toBe("feasible")
  })

  it("requires the full remaining amount when no months remain", () => {
    const result = calculateGoal({
      targetAmount: 100_000,
      fundedAmount: 40_000,
      remainingMonths: 0,
      currency: EUR,
      availableSurplus: 50_000,
    })
    expect(result.requiredMonthlyContribution).toBe(60_000)
  })

  it("traces remaining and required contribution", () => {
    const result = calculateGoal({
      targetAmount: 100_000,
      fundedAmount: 0,
      remainingMonths: 10,
      currency: EUR,
      availableSurplus: 50_000,
    })
    expect(result.trace.map((entry) => entry.operation)).toEqual(["remaining", "required", "minus"])
  })
})
