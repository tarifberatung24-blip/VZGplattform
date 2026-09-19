import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CASE_MODULES, HORIZON_CASE_STATUSES } from "./contract"
import { LEGACY_CASE_STATUSES } from "./lifecycle"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

const engineMigration = read("supabase/migrations/20260919150000_horizon_case_engine.sql")
const spineMigration = read("supabase/migrations/20260909112037_kintex_assistant_baseline.sql")
const isolationTest = read("supabase/tests/rls/horizon_case_engine_isolation.sql")
const repository = read("lib/horizon/case/repository.ts")

const canonicalTables = [
  "cases",
  "source_documents",
  "document_pages",
  "extracted_facts",
  "case_messages",
  "correspondence_drafts",
  "approvals",
  "tasks",
  "audit_events",
]

describe("canonical spine is owner-scoped in the database", () => {
  it("enables RLS on every canonical table", () => {
    for (const table of canonicalTables) {
      expect(spineMigration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it("keeps the read policies scoped to auth.uid()", () => {
    // approvals and audit_events key on a differently named owner column.
    expect(spineMigration).toContain("public.cases for select to authenticated using ((select auth.uid())=owner_id)")
    expect(spineMigration).toContain("public.extracted_facts for select to authenticated using ((select auth.uid())=owner_id)")
    expect(spineMigration).toContain("public.correspondence_drafts for select to authenticated using ((select auth.uid())=owner_id)")
    expect(spineMigration).toContain("public.approvals for select to authenticated using ((select auth.uid())=user_id)")
    expect(spineMigration).toContain("public.audit_events for select to authenticated using ((select auth.uid())=actor_id)")
  })

  it("never grants select to anon on the canonical spine", () => {
    expect(spineMigration).not.toMatch(/grant\s+[^;]*\bon public\.cases to anon/)
    expect(engineMigration).not.toMatch(/to anon/)
    expect(engineMigration).not.toMatch(/to public/)
  })
})

describe("P5 migration is additive and does not weaken security", () => {
  it("adds the canonical columns without touching legacy ones", () => {
    expect(engineMigration).toContain("add column if not exists horizon_status text")
    expect(engineMigration).toContain("add column if not exists horizon_module text")
  })

  it("drops nothing, renames nothing, and deletes no policy", () => {
    expect(engineMigration).not.toMatch(/drop\s+table/i)
    expect(engineMigration).not.toMatch(/drop\s+column/i)
    expect(engineMigration).not.toMatch(/drop\s+policy/i)
    expect(engineMigration).not.toMatch(/alter\s+column[^;]*rename/i)
    expect(engineMigration).not.toMatch(/rename\s+to/i)
    expect(engineMigration).not.toMatch(/delete\s+from/i)
    expect(engineMigration).not.toMatch(/truncate/i)
  })

  it("grants only column-scoped privileges, never a table-wide grant", () => {
    // `grant all` or a bare `grant select on t to authenticated` would widen access.
    expect(engineMigration).not.toMatch(/grant\s+all/i)
    expect(engineMigration).not.toMatch(/grant\s+select\s+on\s+public\.\w+\s+to\s+authenticated/i)
    expect(engineMigration).not.toMatch(/grant\s+delete/i)
    expect(engineMigration).not.toMatch(/service_role/)
  })

  it("constrains the new columns to the canonical vocabularies", () => {
    for (const status of HORIZON_CASE_STATUSES) {
      expect(engineMigration).toContain(`'${status}'`)
    }
    for (const caseModule of CASE_MODULES) {
      expect(engineMigration).toContain(`'${caseModule}'`)
    }
  })

  it("keeps the legacy status vocabulary consistent with the live CHECK constraint", () => {
    for (const status of LEGACY_CASE_STATUSES) {
      expect(spineMigration).toContain(`'${status}'`)
    }
  })

  it("leaves the platform compatibility family untouched", () => {
    expect(engineMigration).not.toContain("platform_cases")
    expect(engineMigration).not.toContain("platform_tasks")
    expect(engineMigration).not.toContain("platform_audit_events")
  })
})

describe("repository enforces ownership in every operation", () => {
  const sourceScopedTables = [
    "cases",
    "source_documents",
    "extracted_facts",
    "case_messages",
    "correspondence_drafts",
    "tasks",
    "audit_events",
  ]

  it("filters reads by the owning user", () => {
    // Every canonical read must carry either the owner_id or the acting-user filter.
    expect(repository).toContain('.eq("owner_id", this.userId)')
    expect(repository).toContain('.eq("actor_id", this.userId)')
    expect(repository).toContain('.eq("user_id", this.userId)')
    const ownerFilters = repository.match(/\.eq\("owner_id", this\.userId\)/g) ?? []
    expect(ownerFilters.length).toBeGreaterThanOrEqual(sourceScopedTables.length)
  })

  it("never uses a service-role client, so RLS is always in force", () => {
    expect(repository).not.toContain("createAdminClient")
    expect(repository).not.toContain("service_role")
    expect(repository).not.toContain("SERVICE_ROLE")
  })

  it("does not let a caller supply the owner id", () => {
    // Owner is always taken from the session; no public input carries it.
    expect(repository).not.toMatch(/input\.ownerId/)
    expect(repository).not.toMatch(/ownerId:\s*input/)
  })

  it("routes state changes through the transition table rather than free-form status writes", () => {
    expect(repository).toContain("nextCaseStatus(")
    expect(repository).toContain("is not allowed from")
  })
})

describe("isolation test covers every canonical table", () => {
  it("asserts per-table isolation for A and B", () => {
    for (const table of canonicalTables) {
      expect(isolationTest).toContain(`from public.${table}`)
    }
  })

  it("rolls back its fixtures and never commits", () => {
    expect(isolationTest.trimStart().startsWith("--")).toBe(true)
    expect(isolationTest).toContain("begin;")
    expect(isolationTest.trimEnd().endsWith("rollback;")).toBe(true)
  })

  it("checks read, cross-case write, ownership reassignment, and anon access", () => {
    expect(isolationTest).toContain("set local role authenticated")
    expect(isolationTest).toContain("set local role anon")
    expect(isolationTest).toContain("reassigned ownership")
    expect(isolationTest).toContain("approved B draft")
    expect(isolationTest).toContain("could not confirm own fact")
  })
})