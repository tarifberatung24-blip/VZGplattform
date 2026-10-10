import { describe, expect, it } from "vitest"
import { publicOrigin, publicUrl } from "@/lib/http/public-origin"

const req = (headers: Record<string, string>) => new Request("http://localhost:10000/auth/logout", { headers })

describe("publicOrigin", () => {
  it("uses the forwarded host and protocol behind a proxy", () => {
    expect(publicOrigin(req({ "x-forwarded-host": "horizon.example.de", "x-forwarded-proto": "https" }))).toBe("https://horizon.example.de")
  })
  it("never returns the internal port when a public host is forwarded", () => {
    expect(publicUrl("/", req({ "x-forwarded-host": "horizon.example.de" })).href).toBe("https://horizon.example.de/")
  })
  it("keeps http for a local development host", () => {
    expect(publicOrigin(req({ host: "localhost:3000" }))).toBe("http://localhost:3000")
  })
})
