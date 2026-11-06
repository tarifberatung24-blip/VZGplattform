import { describe, expect, it } from "vitest"
import { assertRegisteredAgents, planRun } from "./registry"
import { HORIZON_AGENT_OPERATIONS } from "../agent/safety"
import { listAlphaAgents } from "../agent/team"
import { MAX_OBJECTIVE_LENGTH } from "./contract"
import { MAX_STEPS_PER_RUN } from "./executor"

/**
 * The registry is the seam between the engine and Alpha Team. These tests use the
 * real Conductor and the real safety policy — there is no fixture agent here,
 * because the property under test is precisely that the engine can only execute
 * what the existing Conductor and the existing policy already allow.
 */

describe("agent runs registry", () => {
  it("only emits operations the safety policy already names", () => {
    const planned = planRun({ objective: "подготви отговор до jobcenter", contextValidated: true })
    expect(planned.steps.length).toBeGreaterThan(0)
    for (const step of planned.steps) {
      expect(HORIZON_AGENT_OPERATIONS).toContain(step.operation)
    }
  })

  it("refuses to emit an approval-gated operation and records it as a blocker", () => {
    // `prepare_external_handoff` is allowed by the policy only with human review and
    // customer approval. With neither, the engine must not run it and must not
    // silently drop it either.
    const planned = planRun({ objective: "draft a reply to the landlord", contextValidated: true })
    const operations = planned.steps.map((s) => s.operation)
    expect(operations).not.toContain("prepare_external_handoff")
    expect(operations).not.toContain("request_human_review")
    expect(operations).not.toContain("send_external")
    expect(operations).not.toContain("sign_or_accept_contract")
    expect(operations).not.toContain("access_authenticated_account")
    // The gate is reported, not dropped: an operator must see why the run waits.
    expect(planned.blockers).toContain("HUMAN_REVIEW_REQUIRED")
  })

  it("never emits an operation that could send, sign or use an account", () => {
    const objectives = [
      "подготви отговор до jobcenter",
      "изпрати писмото до landlord",
      "sign the contract for me",
      "log into my bank account and check the balance",
      "check the deadline for the case",
      "explain the document I uploaded",
    ]
    for (const objective of objectives) {
      const planned = planRun({ objective, contextValidated: true })
      for (const step of planned.steps) {
        expect(step.operation).not.toBe("send_external")
        expect(step.operation).not.toBe("sign_or_accept_contract")
        expect(step.operation).not.toBe("access_authenticated_account")
      }
    }
  })

  it("always requires approval, matching the Conductor's own rule", () => {
    const planned = planRun({ objective: "подготви отговор", contextValidated: true })
    expect(planned.approvalRequired).toBe(true)
  })

  it("reports a blocker when the case context was not validated", () => {
    const planned = planRun({ objective: "подготви отговор до jobcenter", contextValidated: false })
    expect(planned.blockers).toContain("CASE_OR_DOCUMENT_CONTEXT_REQUIRED_BEFORE_EXECUTION")
    // A blocker makes the approval requirement concrete rather than advisory.
    expect(planned.approvalRequired).toBe(true)
  })

  it("keeps the step list within the executor's bound", () => {
    const planned = planRun({ objective: "подготви отговор до jobcenter", contextValidated: true })
    expect(planned.steps.length).toBeLessThanOrEqual(MAX_STEPS_PER_RUN)
  })

  it("deduplicates a step that the lead and a supporting agent both declare", () => {
    const planned = planRun({ objective: "подготви отговор до jobcenter", contextValidated: true })
    const keys = planned.steps.map((s) => s.stepKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("routes the plan through the existing Conductor", () => {
    const planned = planRun({ objective: "подготви отговор до jobcenter", contextValidated: true })
    expect(planned.plan.leadAgent.id).toBe("social-benefits")
    expect(planned.skillVersion).toBeTruthy()
  })

  it("rejects an empty or oversized objective", () => {
    expect(() => planRun({ objective: "   ", contextValidated: true })).toThrow("OBJECTIVE_REQUIRED")
    expect(() =>
      planRun({ objective: "x".repeat(MAX_OBJECTIVE_LENGTH + 1), contextValidated: true }),
    ).toThrow("OBJECTIVE_TOO_LONG")
  })

  it("refuses an agent that is not registered with the Alpha Team", () => {
    expect(() => assertRegisteredAgents(["finance-tax"])).not.toThrow()
    expect(() => assertRegisteredAgents(["not-a-real-agent"])).toThrow("AGENT_NOT_REGISTERED")
  })

  it("accepts every agent the Conductor can actually route to", () => {
    // Guards against the registry and the roster drifting apart.
    const registered = listAlphaAgents().map((agent) => agent.id)
    expect(() => assertRegisteredAgents(registered)).not.toThrow()
  })
})
