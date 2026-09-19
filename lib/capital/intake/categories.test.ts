import { describe, expect, it } from "vitest"

import { CAPITAL_FACT_KEYS } from "../engine"
import {
  CAPITAL_INTAKE_CATEGORIES,
  CAPITAL_INTAKE_ITEMS,
  findIntakeGaps,
  intakeItemsForCategory,
  requiredIntakeKeys,
  type CapitalIntakeAnswer,
} from "./categories"

describe("HORIZON P0 intake model", () => {
  it("declares the neutral P0 categories", () => {
    expect(CAPITAL_INTAKE_CATEGORIES).toContain("household")
    expect(CAPITAL_INTAKE_CATEGORIES).toContain("income")
    expect(CAPITAL_INTAKE_CATEGORIES).toContain("missing_information")
    expect(CAPITAL_INTAKE_CATEGORIES).toHaveLength(11)
  })

  it("maps required items to the canonical engine keys", () => {
    const required = requiredIntakeKeys()
    expect(required).toContain(CAPITAL_FACT_KEYS.income)
    expect(required).toContain(CAPITAL_FACT_KEYS.liquidReserve)
    expect(required).toHaveLength(6)
  })

  it("scopes items by category", () => {
    expect(intakeItemsForCategory("income")).toHaveLength(1)
    expect(intakeItemsForCategory("priorities")).toHaveLength(1)
    expect(intakeItemsForCategory("household").length).toBeGreaterThan(0)
  })

  it("marks monetary items as currency-bearing and others as not", () => {
    for (const item of CAPITAL_INTAKE_ITEMS) {
      if (item.valueKind === "money") expect(item.currencyRequired).toBe(true)
      if (item.valueKind === "boolean" || item.valueKind === "enum") expect(item.currencyRequired).toBe(false)
    }
  })

  it("contains no thresholds, weights, or scoring fields", () => {
    for (const item of CAPITAL_INTAKE_ITEMS) {
      expect(Object.keys(item).sort()).toEqual(
        ["category", "currencyRequired", "key", "required", "valueKind"].sort(),
      )
    }
  })

  it("reports every required item as absent when nothing is answered", () => {
    const gaps = findIntakeGaps([])
    expect(gaps).toHaveLength(requiredIntakeKeys().length)
    expect(gaps.every((gap) => gap.reason === "absent")).toBe(true)
  })

  it("reports an unconfirmed answer as a gap", () => {
    const answers: CapitalIntakeAnswer[] = requiredIntakeKeys().map((key) => ({
      category: "income",
      key,
      value: 1000,
      valueKind: "money",
      currency: "EUR",
      evidenceReference: null,
      confirmed: false,
    }))
    const gaps = findIntakeGaps(answers)
    expect(gaps.every((gap) => gap.reason === "unconfirmed")).toBe(true)
  })

  it("reports no gaps once every required answer is confirmed", () => {
    const answers: CapitalIntakeAnswer[] = requiredIntakeKeys().map((key) => ({
      category: "income",
      key,
      value: 1000,
      valueKind: "money",
      currency: "EUR",
      evidenceReference: "ui",
      confirmed: true,
    }))
    expect(findIntakeGaps(answers)).toHaveLength(0)
  })

  it("sorts gaps deterministically by key", () => {
    const first = findIntakeGaps([]).map((gap) => gap.key)
    const second = findIntakeGaps([]).map((gap) => gap.key)
    expect(first).toEqual(second)
    expect(first).toEqual([...first].sort())
  })
})
