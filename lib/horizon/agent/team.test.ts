import { describe, expect, it } from "vitest"
import { getAlphaTeamManifest, listAlphaAgents, planAlphaTask } from "./team"

describe("Horizon Alpha Team", () => {
  it("exposes the Conductor hierarchy and specialist registry", () => {
    const manifest = getAlphaTeamManifest()
    expect(manifest.version).toBe("alpha-team-v1")
    expect(manifest.model).toContain("Conductor")
    expect(manifest.agents.map((item) => item.id)).toEqual([
      "conductor",
      "document-intake",
      "finance-tax",
      "social-benefits",
      "correspondence",
      "deadline-monitor",
      "quality-safety",
    ])
    expect(listAlphaAgents().every((item) => item.sopId && item.skillFile)).toBe(true)
    expect(manifest.skills).toHaveLength(7)
    expect(manifest.skills.every((skill) => skill.version !== "unknown")).toBe(true)
    expect(manifest.skills.every((skill) => skill.refusalConditions.length > 0)).toBe(true)
  })

  it("routes German tax work to the finance specialist", () => {
    const plan = planAlphaTask({ objective: "Обясни писмото от Finanzamt", caseId: "case-1", contextValidated: true })
    expect(plan.department).toBe("finance")
    expect(plan.leadAgent.id).toBe("finance-tax")
    expect(plan.approvalRequired).toBe(true)
    expect(plan.externalActionBlocked).toBe(true)
    expect(plan.execution).toEqual({
      mode: "existing-case-assistant",
      route: "/api/horizon/cases/case-1/assistant",
      externalActions: "blocked",
    })
    expect(plan.blockers).toEqual([])
  })

  it("routes social-benefit work to the social specialist", () => {
    const plan = planAlphaTask({ objective: "Какво липсва за Kindergeld?", documentIds: ["doc-1"] })
    expect(plan.department).toBe("social")
    expect(plan.leadAgent.id).toBe("social-benefits")
  })

  it("requires case or document context before execution", () => {
    const plan = planAlphaTask({ objective: "Прочети този документ" })
    expect(plan.blockers).toContain("CASE_OR_DOCUMENT_CONTEXT_REQUIRED_BEFORE_EXECUTION")
  })

  it("rejects empty objectives", () => {
    expect(() => planAlphaTask({ objective: " " })).toThrow("OBJECTIVE_REQUIRED")
  })
})
