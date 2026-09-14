import { describe, expect, it } from "vitest"
import project from "../../supabase/project.json"
import { isCanonicalSupabase } from "./validation"

const canonicalUrl = `https://${project.projectRef}.supabase.co`

describe("canonical Supabase upload guard", () => {
  it("accepts the configured project URL", () => {
    expect(isCanonicalSupabase(canonicalUrl)).toBe(true)
  })

  it("accepts the configured project URL with a trailing slash", () => {
    expect(isCanonicalSupabase(`${canonicalUrl}/`)).toBe(true)
  })

  it("rejects a different Supabase project URL", () => {
    expect(isCanonicalSupabase("https://sophzmteuemggqlstebw.supabase.co")).toBe(false)
  })

  it("rejects a missing URL", () => {
    expect(isCanonicalSupabase(undefined)).toBe(false)
  })
})
