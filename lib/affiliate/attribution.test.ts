import { describe, expect, it } from "vitest"
import { buildPartnerUrl, isUuid, optimizeGoPath, optimizeSessionFromRequest } from "./attribution"

const sessionId = "11111111-2222-4333-8444-555555555555"

describe("affiliate attribution helpers", () => {
  it("routes a confirmed Optimize session through /go with its session id", () => {
    expect(optimizeGoPath("energy", sessionId)).toBe(`/go/energy?s=${sessionId}`)
  })

  it("reads only a well-formed session id from the request", () => {
    expect(optimizeSessionFromRequest(new Request(`http://localhost/go/energy?s=${sessionId}`))).toBe(sessionId)
    expect(optimizeSessionFromRequest(new Request("http://localhost/go/energy?s=1;drop"))).toBeNull()
    expect(optimizeSessionFromRequest(new Request("http://localhost/go/energy"))).toBeNull()
  })

  it("keeps the exact deeplink without a documented sub-ID parameter or click id", () => {
    const deeplink = "https://partner.example/t?id=abc&aff=42"
    expect(buildPartnerUrl(deeplink, undefined, sessionId)).toBe(deeplink)
    expect(buildPartnerUrl(deeplink, "subid", null)).toBe(deeplink)
  })

  it("appends the click id under the documented parameter, keeping existing ones", () => {
    expect(buildPartnerUrl("https://partner.example/t?aff=42", "clickref", sessionId)).toBe(
      `https://partner.example/t?aff=42&clickref=${sessionId}`,
    )
  })

  it("recognises uuids only", () => {
    expect(isUuid(sessionId)).toBe(true)
    expect(isUuid("hz_123")).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})
