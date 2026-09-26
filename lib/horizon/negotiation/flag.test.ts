import { describe, expect, it } from "vitest"
import { isNegotiationEnabled } from "./flag"

describe("HORIZON_NEGOTIATION_ENABLED feature flag", () => {
  it("defaults to false when unset", () => {
    expect(isNegotiationEnabled({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it("accepts the documented truthy values", () => {
    for (const value of ["1", "true", "TRUE", "yes", "on", " true "]) {
      expect(isNegotiationEnabled({ HORIZON_NEGOTIATION_ENABLED: value } as NodeJS.ProcessEnv)).toBe(true)
    }
  })

  it("treats anything else as disabled", () => {
    for (const value of ["0", "false", "no", "off", "", "enabled", "2"]) {
      expect(isNegotiationEnabled({ HORIZON_NEGOTIATION_ENABLED: value } as NodeJS.ProcessEnv)).toBe(false)
    }
  })
})
