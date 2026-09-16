import { describe, expect, it } from "vitest"
import { getSmartDashboardNextAction, getSmartDashboardProblems, smartDashboardAgents, smartDashboardRules } from "./kintex-smart-dashboard"

describe("Kintex Smart Dashboard", () => {
  it("requires profile completion first", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 20, contracts: 3, documents: 2 }, "bg")).toMatchObject({ id: "profile", reason: "PROFILE_INCOMPLETE" })
  })

  it("requires contracts before documents when profile is usable", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 0, documents: 2 }, "bg")).toMatchObject({ id: "contracts", reason: "NO_CONTRACTS" })
  })

  it("starts AI review only when core data exists", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 1, documents: 1 }, "de")).toMatchObject({ id: "assistant", reason: "READY_FOR_AI_REVIEW" })
  })

  it("keeps human confirmation and anti-fake-data rules enabled", () => {
    expect(smartDashboardRules).toMatchObject({ noMockFinancialData: true, noFakeTariffOffers: true, userConfirmationRequired: true })
  })

  it("defines agentic roadmap from intake to workflow layer", () => {
    expect(smartDashboardAgents.map((agent) => agent.id)).toEqual(["intake-agent", "analysis-agent", "review-agent", "radar-agent", "workflow-agent"])
  })

  it("reports missing data problems", () => {
    expect(getSmartDashboardProblems({ profileCompleteness: 10, contracts: 0, documents: 0 }).map((problem) => problem.code)).toEqual(["PROFILE_INCOMPLETE", "NO_CONTRACTS", "NO_DOCUMENTS"])
  })
})
