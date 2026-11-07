import { describe, expect, it } from "vitest"
import { PLAYBOOK_RULES, buildPlaybook } from "./playbook"
import { MAX_ACTIONS_PER_HORIZON, type BusinessDiagnosisContent } from "./contract"

/**
 * The playbook is deterministic: the same diagnosis always yields the same plan.
 * These tests prove it produces an action only for a section the diagnosis
 * actually contains, that it carries the finding's evidence class onto the
 * action, and that it is bounded.
 */

function diagnosis(findings: BusinessDiagnosisContent["findings"]): BusinessDiagnosisContent {
  return { findings, inputReferences: [], missingInformation: [] }
}

describe("buildPlaybook", () => {
  it("produces no action for an empty diagnosis", () => {
    expect(buildPlaybook(diagnosis([]))).toEqual([])
  })

  it("produces an action only for a section that is present", () => {
    const actions = buildPlaybook(
      diagnosis([{ section: "cost_opportunities", statement: "x", evidenceClass: "user_provided", references: [] }]),
    )
    expect(actions.map((action) => action.actionKey)).toEqual(["review-recurring-costs"])
  })

  it("never produces an action for an overview-only diagnosis", () => {
    const actions = buildPlaybook(
      diagnosis([{ section: "overview", statement: "Kleiner Betrieb", evidenceClass: "user_provided", references: [] }]),
    )
    expect(actions).toEqual([])
  })

  it("carries the finding's evidence class onto the action", () => {
    const actions = buildPlaybook(
      diagnosis([{ section: "bottlenecks", statement: "x", evidenceClass: "ai_assumption", references: [] }]),
    )
    expect(actions[0].evidenceClass).toBe("ai_assumption")
  })

  it("maps sections to the documented horizons", () => {
    const actions = buildPlaybook(
      diagnosis([
        { section: "missing_information", statement: "x", evidenceClass: "user_provided", references: [] },
        { section: "bottlenecks", statement: "y", evidenceClass: "user_provided", references: [] },
        { section: "revenue_opportunities", statement: "z", evidenceClass: "recommendation", references: [] },
      ]),
    )
    const byKey = Object.fromEntries(actions.map((action) => [action.actionKey, action.horizon]))
    expect(byKey["collect-missing-information"]).toBe(30)
    expect(byKey["remove-bottleneck"]).toBe(60)
    expect(byKey["pursue-revenue-opportunity"]).toBe(90)
  })

  it("marks the risk action as requiring approval and a partner", () => {
    const actions = buildPlaybook(
      diagnosis([{ section: "risks", statement: "x", evidenceClass: "requires_external_verification", references: [] }]),
    )
    expect(actions[0].approvalRequired).toBe(true)
    expect(actions[0].responsible).toBe("partner")
  })

  it("is deterministic for the same input", () => {
    const input = diagnosis([
      { section: "weaknesses", statement: "a", evidenceClass: "user_provided", references: [] },
      { section: "digitalization", statement: "b", evidenceClass: "ai_assumption", references: [] },
    ])
    expect(buildPlaybook(input)).toEqual(buildPlaybook(input))
  })

  it("bounds actions per horizon", () => {
    // A diagnosis containing every section the rules cover.
    const findings = PLAYBOOK_RULES.map((rule) => ({
      section: rule.section,
      statement: "x",
      evidenceClass: "recommendation" as const,
      references: [],
    }))
    const actions = buildPlaybook(diagnosis(findings))
    for (const horizon of [30, 60, 90] as const) {
      expect(actions.filter((action) => action.horizon === horizon).length).toBeLessThanOrEqual(MAX_ACTIONS_PER_HORIZON)
    }
  })

  it("uses the first finding's evidence class for a section with several findings", () => {
    const actions = buildPlaybook(
      diagnosis([
        { section: "weaknesses", statement: "first", evidenceClass: "verified_fact", references: [] },
        { section: "weaknesses", statement: "second", evidenceClass: "ai_assumption", references: [] },
      ]),
    )
    expect(actions).toHaveLength(1)
    expect(actions[0].evidenceClass).toBe("verified_fact")
  })
})
