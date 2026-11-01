import { describe, expect, it } from "vitest"
import { serviceRequestKinds } from "@/lib/service-request"
import { getHorizonServiceRequest, horizonServiceRequests, isHorizonServiceRequestKind } from "./catalog"

describe("Tarifberater24 Alpha Team service catalog", () => {
  it("registers eight free Horizon services", () => {
    expect(horizonServiceRequests).toHaveLength(8)
    for (const service of horizonServiceRequests) {
      expect(serviceRequestKinds).toContain(service.kind)
      expect(isHorizonServiceRequestKind(service.kind)).toBe(true)
      expect(service.requiredEvidence.length).toBeGreaterThan(0)
      expect(service.objectiveBg.length).toBeGreaterThan(20)
      expect(service.objectiveDe.length).toBeGreaterThan(20)
    }
  })

  it("keeps higher-risk actions behind the quality or document gate", () => {
    expect(getHorizonServiceRequest("steuererklaerung").alphaAgent).toBe("finance-tax")
    expect(getHorizonServiceRequest("aufenthaltstitel").alphaAgent).toBe("quality-safety")
    expect(getHorizonServiceRequest("krankenkassenwechsel").alphaAgent).toBe("quality-safety")
    expect(getHorizonServiceRequest("beglaubigungen_uebersetzungen").requiredEvidence).toContain("source_documents")
  })
})
