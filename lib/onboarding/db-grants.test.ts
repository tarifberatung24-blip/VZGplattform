import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

const fix = read("supabase/migrations/20260925013000_profiles_onboarding_insert_grant.sql")

describe("P2 onboarding profile insert grant", () => {
  it("grants only INSERT on onboarding_step to authenticated", () => {
    expect(fix).toContain("grant insert (onboarding_step) on public.profiles to authenticated")
    expect(fix).not.toMatch(/grant\s+all/i)
    expect(fix).not.toMatch(/grant\s+insert\s+on\s+public\.profiles/i)
    expect(fix).not.toMatch(/to\s+anon/i)
    expect(fix).not.toMatch(/to\s+public\b/i)
  })

  it("does not modify RLS or perform destructive schema changes", () => {
    expect(fix).not.toMatch(/create\s+policy/i)
    expect(fix).not.toMatch(/alter\s+policy/i)
    expect(fix).not.toMatch(/drop\s+policy/i)
    expect(fix).not.toMatch(/drop\s+table/i)
    expect(fix).not.toMatch(/drop\s+column/i)
    expect(fix).not.toMatch(/delete\s+from/i)
    expect(fix).not.toMatch(/truncate/i)
  })
})
