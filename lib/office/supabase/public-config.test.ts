import { afterEach, describe, expect, it } from "vitest"
import { resolveOfficeSupabaseConfig } from "./public-config"

const originalEnv = { ...process.env }
const url = "https://mteguzgbiuexmdcrqajj.supabase.co"

afterEach(() => {
  process.env = { ...originalEnv }
})

// These clients feed every P12–P17 module surface. When only
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY was read, a deployment configured with
// the documented primary NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.example) silently
// fell back to the preview repository: real writes returned
// `503 Supabase is not configured` while reads looked fine.
describe("office Supabase public config", () => {
  it("accepts the documented ANON key name", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"

    expect(resolveOfficeSupabaseConfig()).toEqual({ url, key: "anon-test-key" })
  })

  it("accepts the publishable key name", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test"

    expect(resolveOfficeSupabaseConfig()).toEqual({ url, key: "sb_publishable_test" })
  })

  it("prefers the publishable key when both are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test"

    expect(resolveOfficeSupabaseConfig()?.key).toBe("sb_publishable_test")
  })

  it("returns null when no key or URL is present", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = url

    expect(resolveOfficeSupabaseConfig()).toBeNull()
  })

  it("returns null for a malformed URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"

    expect(resolveOfficeSupabaseConfig()).toBeNull()
  })
})
