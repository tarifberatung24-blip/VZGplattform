import { describe, expect, it } from "vitest"
import { getSmartDashboardNextAction, getSmartDashboardProblems, smartDashboardAgents, smartDashboardRules } from "./kintex-smart-dashboard"

describe("Kintex Smart Dashboard", () => {
  it("requires profile completion first", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 20, contracts: 3, documents: 2 }, "bg")).toMatchObject({ id: "profile", reason: "PROFILE_INCOMPLETE" })
  })

  it("requires contracts before documents when profile is usable", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 0, documents: 2 }, "bg")).toMatchObject({ id: "contracts", reason: "NO_CONTRACTS" })
  })

  it("starts manual offer request when core data exists", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 1, documents: 1 }, "de")).toMatchObject({ id: "offer_request", reason: "READY_FOR_MANUAL_OFFER_REQUEST" })
  })

  it("routes document review before onboarding or offer request", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 2, documents: 3, documentsNeedingReview: 1 }, "bg")).toMatchObject({ id: "document_review", reason: "DOCUMENTS_NEED_REVIEW" })
  })

  it("routes missing contract facts before an offer request", () => {
    expect(getSmartDashboardNextAction({ profileCompleteness: 80, contracts: 2, documents: 2, contractsNeedingInfo: 1 }, "de")).toMatchObject({ id: "contract_info", reason: "CONTRACTS_NEED_INFO" })
  })

  it("keeps human confirmation and anti-fake-data rules enabled", () => {
    expect(smartDashboardRules).toMatchObject({ noMockFinancialData: true, noFakeTariffOffers: true, userConfirmationRequired: true })
  })

  it("defines agentic roadmap from intake to workflow layer", () => {
    expect(smartDashboardAgents.map((agent) => agent.id)).toEqual(["intake-agent", "workflow-router", "review-agent", "radar-agent", "workflow-agent"])
  })

  it("reports missing data problems", () => {
    expect(getSmartDashboardProblems({ profileCompleteness: 10, contracts: 0, documents: 0 }).map((problem) => problem.code)).toEqual(["PROFILE_INCOMPLETE", "NO_CONTRACTS", "NO_DOCUMENTS"])
  })
})
