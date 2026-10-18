import { describe, expect, it } from "vitest"
import { deriveServiceRequestReadiness } from "./readiness"

describe("deriveServiceRequestReadiness", () => {
  it("asks only for tariff data that cannot be supplied by an uploaded document", () => {
    const readiness = deriveServiceRequestReadiness({
      serviceType: "energy_cost_check",
      documentCount: 1,
      facts: [{ key: "postcode", value: "10115" }],
    })

    expect(readiness).toEqual({
      missingFactKeys: [],
      urgent: false,
      nextStatus: "processing",
    })
  })

  it("keeps a document-free request waiting for the key comparison inputs", () => {
    const readiness = deriveServiceRequestReadiness({
      serviceType: "energy_cost_check",
      documentCount: 0,
      facts: [{ key: "postcode", value: "" }],
    })

    expect(readiness.missingFactKeys).toEqual([
      "postcode",
      "current_provider",
      "annual_consumption_kwh",
      "monthly_payment_eur",
    ])
    expect(readiness.nextStatus).toBe("waiting_for_user")
  })

  it("prioritizes a flagged interruption warning for processing", () => {
    const readiness = deriveServiceRequestReadiness({
      serviceType: "energy_cost_check",
      documentCount: 0,
      facts: [{ key: "energy_urgency", value: "urgent" }],
    })

    expect(readiness.urgent).toBe(true)
    expect(readiness.nextStatus).toBe("processing")
  })
})
