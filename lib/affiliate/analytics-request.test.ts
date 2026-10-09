import { describe, expect, it } from "vitest"
import { affiliateLocaleFromPath, affiliatePathFromRequest } from "./analytics-request"

describe("affiliatePathFromRequest", () => {
  it("returns the pathname for a localized offer route", () => {
    const request = new Request("https://www.finanzberaterbg.de/de/go/kfz")
    expect(affiliatePathFromRequest(request)).toBe("/de/go/kfz")
  })

  it("returns the pathname for the unprefixed offer route", () => {
    const request = new Request("http://localhost/go/energy")
    expect(affiliatePathFromRequest(request)).toBe("/go/energy")
  })

  it("returns null for an unparseable URL", () => {
    expect(affiliatePathFromRequest({ url: "not a url" } as unknown as Request)).toBeNull()
  })
})

describe("affiliateLocaleFromPath", () => {
  it("reads the locale from a localized path", () => {
    expect(affiliateLocaleFromPath("/de/go/kfz")).toBe("de")
    expect(affiliateLocaleFromPath("/bg/go/energy")).toBe("bg")
  })

  it("returns null when there is no recognized locale prefix", () => {
    expect(affiliateLocaleFromPath("/go/kfz")).toBeNull()
    expect(affiliateLocaleFromPath("/en/go/kfz")).toBeNull()
    expect(affiliateLocaleFromPath(null)).toBeNull()
    expect(affiliateLocaleFromPath("")).toBeNull()
  })
})
