import { describe, expect, it } from "vitest"
import { normalizeJourneyPath } from "./paths"

describe("normalizeJourneyPath", () => {
  it("reduces a localized path to module and step", () => {
    expect(normalizeJourneyPath("/de/steuer/review")).toEqual({ module: "steuer", step: "review", locale: "de" })
    expect(normalizeJourneyPath("/bg/dashboard")).toEqual({ module: "dashboard", step: null, locale: "bg" })
  })

  it("names the locale root home and handles unlocalized paths", () => {
    expect(normalizeJourneyPath("/de")).toEqual({ module: "home", step: null, locale: "de" })
    expect(normalizeJourneyPath("/vertraege")).toEqual({ module: "vertraege", step: null, locale: null })
  })

  it("drops query strings and fragments", () => {
    expect(normalizeJourneyPath("/de/kindergeld?token=abc#x")).toEqual({ module: "kindergeld", step: null, locale: "de" })
  })

  it("never lets an id-like segment through", () => {
    expect(normalizeJourneyPath("/de/vertraege/3f2b8c1e-aaaa-4bbb-8ccc-123456789abc")).toEqual({ module: "vertraege", step: null, locale: "de" })
    expect(normalizeJourneyPath("/de/documents/12345")).toEqual({ module: "documents", step: null, locale: "de" })
    expect(normalizeJourneyPath("/de/123")).toBeNull()
  })

  it("ignores segments beyond the second", () => {
    expect(normalizeJourneyPath("/de/steuer/providers/extra")).toEqual({ module: "steuer", step: "providers", locale: "de" })
  })

  it("rejects characters outside the allowed alphabet", () => {
    expect(normalizeJourneyPath("/de/Steuer")).toBeNull()
    expect(normalizeJourneyPath("/de/a%20b")).toBeNull()
  })
})
