import { afterEach, describe, expect, it } from "vitest"
import { getSupabaseConfig } from "./config"
import project from "../../supabase/project.json"

const originalEnv = { ...process.env }
const projectUrl = `https://${project.projectRef}.supabase.co`

function publishableKey(value = "sb_publishable_test") {
  return value
}

function legacyAnonKey(ref = project.projectRef) {
  const payload = Buffer.from(JSON.stringify({ role: "anon", ref }), "utf8").toString("base64url")
  return `header.${payload}.signature`
}

function invalidNonAnonKey(ref = project.projectRef) {
  const payload = Buffer.from(JSON.stringify({ role: "service_role", ref }), "utf8").toString("base64url")
  return `header.${payload}.signature`
}

function malformedKey() {
  return `not-valid-base64`
}

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("Supabase config guard", () => {
  it("accepts the configured Supabase URL with a publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey()
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(getSupabaseConfig()).toEqual({
      url: projectUrl,
      key: publishableKey(),
    })
  })

  it("accepts a valid legacy anon key from any project", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = legacyAnonKey("kclbzuvdtlphpxtsxwou")
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    expect(getSupabaseConfig()).toEqual({
      url: projectUrl,
      key: legacyAnonKey("kclbzuvdtlphpxtsxwou"),
    })
  })

  it("accepts a valid legacy anon key from the configured project", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = legacyAnonKey(project.projectRef)
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    expect(getSupabaseConfig()).toEqual({
      url: projectUrl,
      key: legacyAnonKey(project.projectRef),
    })
  })

  it("rejects a legacy key that is not an anon role", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalidNonAnonKey(project.projectRef)
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    expect(() => getSupabaseConfig()).toThrow(
      /not a valid anon\/publishable key/i,
    )
  })

  it("rejects a malformed legacy key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = malformedKey()
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    expect(() => getSupabaseConfig()).toThrow(
      /not a valid anon\/publishable key/i,
    )
  })

  it("rejects server-only keys in public config", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_test"

    expect(() => getSupabaseConfig()).toThrow("server-only")
  })

  it("requires both Supabase URL and a public key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = projectUrl
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => getSupabaseConfig()).toThrow(/not configured/i)
  })
})
