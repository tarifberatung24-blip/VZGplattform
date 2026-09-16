import { describe, expect, it } from "vitest"
import { isGermanMobile, normalizeGermanMobile } from "./phone-auth"

describe("phone auth", () => {
  it("normalizes German mobile numbers to E.164", () => {
    expect(normalizeGermanMobile("151 12345678")).toBe("+4915112345678")
    expect(normalizeGermanMobile("0151 12345678")).toBe("+4915112345678")
    expect(normalizeGermanMobile("0049 151 12345678")).toBe("+4915112345678")
    expect(normalizeGermanMobile("+49 151 12345678")).toBe("+4915112345678")
  })

  it("accepts only German mobile numbers", () => {
    expect(isGermanMobile("+4915112345678")).toBe(true)
    expect(isGermanMobile("+493012345678")).toBe(false)
    expect(isGermanMobile("+359881234567")).toBe(false)
  })
})
