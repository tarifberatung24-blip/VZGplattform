import { describe, expect, it } from "vitest"
import { isNegotiationEnabled } from "./flag"

describe("HORIZON_NEGOTIATION_ENABLED feature flag", () => {
  const env = (value?: string): NodeJS.ProcessEnv =>
    (value === undefined ? {} : { HORIZON_NEGOTIATION_ENABLED: value }) as unknown as NodeJS.ProcessEnv

  it("defaults to false when unset", () => {
    expect(isNegotiationEnabled(env())).toBe(false)
  })

  it("accepts the documented truthy values", () => {
    for (const value of ["1", "true", "TRUE", "yes", "on", " true "]) {
      expect(isNegotiationEnabled(env(value))).toBe(true)
    }
  })

  it("treats anything else as disabled", () => {
    for (const value of ["0", "false", "no", "off", "", "enabled", "2"]) {
      expect(isNegotiationEnabled(env(value))).toBe(false)
    }
  })
})
