import { describe, expect, it } from "vitest"
import { checkRateLimit } from "./rate-limit"

describe("rate limiter", () => {
  it("allows the configured number of requests and blocks the next one", () => {
    const key = `test-${crypto.randomUUID()}`
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true)
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true)
    const blocked = checkRateLimit(key, { limit: 2, windowMs: 60_000 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })
})
