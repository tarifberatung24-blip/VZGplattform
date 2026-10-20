import { describe, expect, it, vi } from "vitest"

const insert = vi.fn().mockResolvedValue({ error: null })
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ insert }) }),
}))

import { POST } from "./route"

function request(body: unknown, ip = crypto.randomUUID()) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
}

const validLead = {
  name: "Ivan Petrov",
  email: "ivan@example.com",
  message: "Моля, свържете се с мен.",
  locale: "bg",
  origin: "https://horizon.test/bg/contact",
}

describe("public lead intake", () => {
  it("stores a valid, bounded lead", async () => {
    const response = await POST(request(validLead))
    expect(response.status).toBe(201)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email: validLead.email, message: validLead.message }))
  })

  it("rejects oversized and unexpected fields", async () => {
    const oversized = await POST(request({ ...validLead, message: "x".repeat(5001) }))
    const unexpected = await POST(request({ ...validLead, role: "admin" }))
    expect(oversized.status).toBe(400)
    expect(unexpected.status).toBe(400)
  })

  it("rate-limits repeated submissions from the same source", async () => {
    const ip = crypto.randomUUID()
    for (let index = 0; index < 5; index += 1) {
      expect((await POST(request(validLead, ip))).status).toBe(201)
    }
    const blocked = await POST(request(validLead, ip))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()
    expect((await blocked.json()).code).toBe("LEAD_RATE_LIMITED")
  })
})
