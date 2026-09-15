import { describe, expect, it } from "vitest"
import {
  BENEFIT_ELIGIBILITY_RULE_VERSION,
  actionableBenefitResults,
  evaluateBenefitEligibility,
} from "./eligibility-engine"
import type { BenefitAnswers } from "./types"

const base: BenefitAnswers = {
  lives_in_germany: true,
  has_children: false,
  children_in_household: false,
  pays_rent: false,
  income_tight_vs_costs: false,
  has_earned_income: false,
  little_or_no_work_income: false,
  receives_buergergeld: false,
  is_single_parent: false,
  pregnancy_or_infant: false,
}

describe("evaluateBenefitEligibility", () => {
  it("marks Kindergeld as potentially relevant when children live in a Germany household", () => {
    const results = evaluateBenefitEligibility({
      ...base,
      has_children: true,
      children_in_household: true,
    })
    const kindergeld = results.find((item) => item.benefitId === "kindergeld")
    expect(kindergeld?.state).toBe("POTENTIALLY_ELIGIBLE")
    expect(kindergeld?.reasonCode).toBe("children_in_germany_household")
  })

  it("never invents euro amounts and always returns versioned results for all benefits", () => {
    const results = evaluateBenefitEligibility(base)
    expect(BENEFIT_ELIGIBILITY_RULE_VERSION).toMatch(/^be-/)
    expect(results).toHaveLength(6)
    for (const item of results) {
      expect(item.explanationDe.length).toBeGreaterThan(10)
      expect(item.explanationDe).not.toMatch(/\d+\s*€/)
      expect(item.officialInfoUrl.startsWith("https://")).toBe(true)
    }
  })

  it("screens Wohngeld as likely not fitting when Bürgergeld is already received", () => {
    const results = evaluateBenefitEligibility({
      ...base,
      pays_rent: true,
      income_tight_vs_costs: true,
      receives_buergergeld: true,
    })
    expect(results.find((item) => item.benefitId === "wohngeld")?.state).toBe("LIKELY_NOT_ELIGIBLE")
  })

  it("filters actionable results for the dashboard", () => {
    const results = evaluateBenefitEligibility({
      ...base,
      has_children: true,
      children_in_household: true,
      pregnancy_or_infant: true,
    })
    const actionable = actionableBenefitResults(results)
    expect(actionable.every((item) => item.state === "POTENTIALLY_ELIGIBLE" || item.state === "MORE_INFORMATION_REQUIRED")).toBe(true)
    expect(actionable.some((item) => item.benefitId === "kindergeld")).toBe(true)
    expect(actionable.some((item) => item.benefitId === "elterngeld")).toBe(true)
  })
})
