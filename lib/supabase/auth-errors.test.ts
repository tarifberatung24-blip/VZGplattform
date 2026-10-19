import { describe, expect, it } from "vitest"
import { classifyAuthError } from "./auth-errors"

describe("classifyAuthError", () => {
  it("recognizes provider rate limits without exposing raw provider copy", () => {
    expect(classifyAuthError({ status: 429, message: "anything" })).toBe("rate_limited")
    expect(classifyAuthError({ message: "over_email_send_rate_limit" })).toBe("rate_limited")
    expect(classifyAuthError({ message: "Too many requests" })).toBe("rate_limited")
  })

  it("separates actionable account errors", () => {
    expect(classifyAuthError({ message: "email_address_invalid" })).toBe("invalid_email")
    expect(classifyAuthError({ message: "Password should be at least 8 characters" })).toBe("weak_password")
    expect(classifyAuthError({ message: "Email not confirmed" })).toBe("email_unconfirmed")
  })

  it("fails to a stable generic code", () => {
    expect(classifyAuthError(null)).toBe("generic")
    expect(classifyAuthError({ message: "provider unavailable" })).toBe("generic")
  })
})
