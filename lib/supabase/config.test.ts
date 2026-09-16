import { afterEach, describe, expect, it } from "vitest"
import { getSupabaseConfig } from "./config"

const originalEnv = { ...process.env }
const projectUrl = "https://numyqalfphyrnedlfzfs.supabase.co"

function legacyAnonKey(ref = "numyqalfphyrnedlfzfs") {
  const payload = Buffer.from(JSON.stringify({ role: "anon", ref }), "utf8").toString("base64url")
  return `header.${payload}.signature`
}

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("Supabase config guard", () => {
  it("accepts the canonical project URL with a publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test"
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(getSupabaseConfig()).toEqual({
      url: projectUrl,
      key: "sb_publishable_test",
    })
  })

  it("rejects a legacy anon key from a different Supabase project", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = legacyAnonKey("kclbzuvdtlphpxtsxwou")
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    expect(() => getSupabaseConfig()).toThrow("canonical project")
  })

  it("rejects server-only keys in public config", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_test"

    expect(() => getSupabaseConfig()).toThrow("server-only")
  })
})
