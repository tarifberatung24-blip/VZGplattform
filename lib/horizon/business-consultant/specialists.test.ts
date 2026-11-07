import { describe, expect, it } from "vitest"
import {
  BUSINESS_SPECIALISTS,
  SPECIALIST_REGISTRY,
  listBusinessSpecialists,
  resolveSpecialist,
  specialistObjective,
  specialistReferences,
} from "./specialists"
import { evaluateHorizonAgentOperation } from "../agent/safety"

/**
 * The specialist registry is the permission table. These tests prove each entry
 * resolves against the real Alpha Team registry and the real safety gate, and
 * that no specialist — however the registry is edited — can hold an operation the
 * gate denies. That is the "clearly separated permissions" claim, made checkable.
 */

describe("resolveSpecialist", () => {
  it("resolves every registered specialist", () => {
    for (const id of BUSINESS_SPECIALISTS) {
      const result = resolveSpecialist(id)
      expect(result.error, `specialist ${id}`).toBeNull()
      expect(result.data?.id).toBe(id)
    }
  })

  it("fails closed for an unknown specialist", () => {
    expect(resolveSpecialist("does-not-exist").code).toBe("UNKNOWN_SPECIALIST")
  })

  it("binds each specialist to a real Alpha Team agent and its SOP contract", () => {
    for (const id of BUSINESS_SPECIALISTS) {
      const resolved = resolveSpecialist(id)
      expect(resolved.data?.alphaAgent.id).toBe(resolved.data?.alphaAgentId)
      expect(resolved.data?.contractVersion).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it("grants no specialist an operation the safety gate denies", () => {
    const denied = ["send_external", "sign_or_accept_contract", "access_authenticated_account"] as const
    for (const specialist of SPECIALIST_REGISTRY) {
      for (const operation of specialist.operations) {
        expect(denied as readonly string[]).not.toContain(operation)
        expect(evaluateHorizonAgentOperation({ operation }).allowed).toBe(true)
      }
    }
  })

  it("grants no specialist the external-handoff operation without review evidence", () => {
    // `prepare_external_handoff` is denied by the gate unless review + approval
    // evidence is supplied, so a specialist must not hold it as a standing right.
    for (const specialist of SPECIALIST_REGISTRY) {
      expect(specialist.operations as readonly string[]).not.toContain("prepare_external_handoff")
    }
  })

  it("keeps every operation inside the bound agent's own SOP", () => {
    for (const id of BUSINESS_SPECIALISTS) {
      const resolved = resolveSpecialist(id)
      if (!resolved.data) continue
      for (const operation of resolved.data.operations) {
        expect(resolved.data.alphaAgent.operations).toContain(operation)
      }
    }
  })
})

describe("listBusinessSpecialists", () => {
  it("returns the whole roster with permissions and refusals", () => {
    const roster = listBusinessSpecialists()
    expect(roster).toHaveLength(BUSINESS_SPECIALISTS.length)
    for (const entry of roster) {
      expect(entry.operations.length).toBeGreaterThan(0)
      expect(entry.refusals.length).toBeGreaterThan(0)
    }
  })
})

describe("specialistObjective and specialistReferences", () => {
  it("builds a deterministic objective", () => {
    const objective = specialistObjective({ specialist: "finance-operations", businessName: "Betrieb Test" })
    expect(objective).toContain("finance-operations")
    expect(objective).toContain("Betrieb Test")
  })

  it("references the profile and any documents, and nothing else", () => {
    const references = specialistReferences({ profileId: "p1", documentIds: ["d1", "d2"] })
    expect(references).toEqual([
      { kind: "business_profile", id: "p1" },
      { kind: "document", id: "d1" },
      { kind: "document", id: "d2" },
    ])
  })
})
