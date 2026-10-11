import { describe, expect, it } from "vitest"
import { journeyEventSchema } from "./events"

describe("journeyEventSchema", () => {
  it("accepts a page view and a client error", () => {
    expect(journeyEventSchema.safeParse({ event: "page_view", path: "/de/steuer" }).success).toBe(true)
    expect(journeyEventSchema.safeParse({ event: "client_error", path: "/de/steuer", code: "TypeError", sessionId: "abc12345-def" }).success).toBe(true)
  })

  it("rejects unknown events", () => {
    expect(journeyEventSchema.safeParse({ event: "click", path: "/de" }).success).toBe(false)
  })

  it("has no field for free text", () => {
    expect(journeyEventSchema.safeParse({ event: "page_view", path: "/de", message: "typed text" }).success).toBe(false)
    expect(journeyEventSchema.safeParse({ event: "client_error", path: "/de", code: "has spaces and text" }).success).toBe(false)
  })

  it("rejects an oversized path", () => {
    expect(journeyEventSchema.safeParse({ event: "page_view", path: "/" + "a".repeat(250) }).success).toBe(false)
  })
})
