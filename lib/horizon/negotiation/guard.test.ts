import { describe, expect, it } from "vitest"
import {
  canSendProviderMessage,
  findForbiddenFields,
  isForbiddenFieldName,
  redactNegotiationMetadata,
} from "./guard"
import { AUTOMATED_EXECUTION_ENABLED, canExecuteAutomatically, NULL_PROVIDER_ADAPTER } from "./execution"

describe("credential refusal", () => {
  it("recognises forbidden field names in German and English", () => {
    for (const field of [
      "password",
      "passwort",
      "pin",
      "tan",
      "otp",
      "einmalcode",
      "api_key",
      "iban",
      "kartennummer",
    ]) {
      expect(isForbiddenFieldName(field)).toBe(true)
    }
  })

  it("does not flag ordinary negotiation fields", () => {
    for (const field of ["customerNumber", "monthlyCost", "provider", "services"]) {
      expect(isForbiddenFieldName(field)).toBe(false)
    }
  })

  it("finds a nested forbidden field and reports its path without its value", () => {
    const found = findForbiddenFields({
      provider: "Telekom",
      auth: { password: "hunter2" },
      items: [{ pin: "1234" }],
    })
    expect(found).toEqual(["auth.password", "items[0].pin"])
  })

  it("redacts a forbidden field before it reaches an audit row", () => {
    const redacted = redactNegotiationMetadata({
      provider: "Telekom",
      nested: { passwort: "geheim", amount: 34.99 },
    })
    expect(redacted).toEqual({
      provider: "Telekom",
      nested: { passwort: "[redacted]", amount: 34.99 },
    })
  })
})

describe("send gating", () => {
  it("requires an explicit user action or a granted authorization", () => {
    expect(canSendProviderMessage({ explicitUserAction: true, authorizationStatus: "not_required" })).toBe(true)
    expect(canSendProviderMessage({ explicitUserAction: false, authorizationStatus: "granted" })).toBe(true)
    expect(canSendProviderMessage({ explicitUserAction: false, authorizationStatus: "pending" })).toBe(false)
    expect(canSendProviderMessage({ explicitUserAction: false, authorizationStatus: "not_required" })).toBe(false)
    expect(canSendProviderMessage({ explicitUserAction: false, authorizationStatus: "revoked" })).toBe(false)
  })
})

describe("automated execution stays disabled", () => {
  it("is hard-disabled and not reachable through any adapter", () => {
    expect(AUTOMATED_EXECUTION_ENABLED).toBe(false)
    expect(NULL_PROVIDER_ADAPTER.isDelegatedAccessAvailable()).toBe(false)
    expect(canExecuteAutomatically(NULL_PROVIDER_ADAPTER)).toBe(false)
    expect(canExecuteAutomatically(null)).toBe(false)
  })
})
