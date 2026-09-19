import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CASE_MODULES, HORIZON_CASE_STATUSES } from "./contract"
import { LEGACY_CASE_STATUSES } from "./lifecycle"

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

const engineMigration = read("supabase/migrations/20260919150000_horizon_case_engine.sql")
const auditReconcile = read("supabase/migrations/20260920090000_horizon_audit_events_reconcile.sql")
const rlsReconcile = read("supabase/migrations/20260920090100_horizon_case_engine_rls_policies.sql")
const draftFix = read("supabase/migrations/20260920090200_horizon_draft_review_status_fix.sql")
const spineMigration = read("supabase/migrations/20260909112037_kintex_assistant_baseline.sql")
const isolationTest = read("supabase/tests/rls/horizon_case_engine_isolation.sql")
const repository = read("lib/horizon/case/repository.ts")

const reconciliationMigrations = [auditReconcile, rlsReconcile, draftFix]

/**
 * Strips `--` line comments so security assertions test executable SQL rather
 * than prose. Without this, a comment that merely quotes a forbidden pattern
 * would fail the test and a comment that hides one would pass it.
 */
const stripSqlComments = (sql: string) =>
  sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")

const executableRls = stripSqlComments(rlsReconcile)

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
    for (const migration of reconciliationMigrations) {
      expect(migration).not.toMatch(/to anon/)
      expect(migration).not.toMatch(/\bto public\b(?!\s+\.)/)
    }
  })
})

describe("reconciliation migrates live-production corrections into the repo", () => {
  it("declares neither a policy nor a grant that is already covered", () => {
    // The reconciliation must be idempotent so it can run against both a fresh
    // database and the already-reconciled production project.
    expect(auditReconcile).toContain("create table if not exists public.audit_events")
    expect(auditReconcile).toContain("if not exists")
    expect(rlsReconcile).toContain("if not exists")
    expect(rlsReconcile).toContain("pg_policies")
  })

  it("creates the write policies production needed rather than only granting columns", () => {
    for (const policy of [
      "source_documents_insert_own",
      "extracted_facts_insert_own",
      "extracted_facts_update_own",
      "case_messages_insert_own",
      "correspondence_drafts_insert_own",
      "correspondence_drafts_update_own",
      "approvals_insert_own",
      "tasks_insert_own",
      "tasks_update_own",
      "audit_events_insert_own",
    ]) {
      expect(rlsReconcile).toContain(policy)
    }
  })

  it("scopes every reconciliation policy to auth.uid() and authenticated only", () => {
    expect(executableRls).not.toContain("using (true)")
    expect(executableRls).not.toContain("with check (true)")
    expect(executableRls).not.toContain("for all to authenticated")

    // Policies are created via `execute format(..)`, so the count comes from the
    // values lists rather than from literal `create policy` statements.
    const policyNames = executableRls.match(/'[a-z_]+_own'/g) ?? []
    expect(policyNames).toHaveLength(11)

    // Both generated statements must pin the role and the owner predicate.
    expect(executableRls).toContain("for insert to authenticated with check ((select auth.uid())")
    expect(executableRls).toContain(
      "for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)",
    )
  })

  it("never builds a predicate from caller-supplied input", () => {
    // The owner column is a fixed literal per table, so format() cannot
    // interpolate anything attacker-controlled into the policy.
    const ownerColumns = rlsReconcile.match(/'owner_id'|'user_id'|'actor_id'/g) ?? []
    expect(ownerColumns.length).toBeGreaterThanOrEqual(11)
    expect(rlsReconcile).not.toMatch(/target\.\w+\s*=/)
  })

  it("keeps the forbidden-pattern check meaningful on real SQL", () => {
    // Sanity-check the comment stripper itself: a genuine `using (true)` policy
    // must still be detected, so the assertion above is not vacuously true.
    expect(stripSqlComments("create policy x on t for select using (true);")).toContain("using (true)")
    expect(stripSqlComments("-- using (true)")).not.toContain("using (true)")
  })

  it("adds the case write grants the engine needs for institution and deadline", () => {
    expect(rlsReconcile).toContain("grant insert (institution, deadline, horizon_status, horizon_module)")
    expect(rlsReconcile).toContain("grant update (")
    expect(rlsReconcile).toContain("institution, deadline")
  })

  it("keeps draft content immutable while allowing review_status to change", () => {
    expect(draftFix).toContain("create or replace function public.reject_draft_update()")
    expect(draftFix).toContain("- 'review_status'")
    expect(draftFix).toContain("is distinct from")
    // The trigger itself must not be recreated, which would risk duplicate firing.
    expect(draftFix).not.toContain("create trigger")
    expect(draftFix).not.toContain("drop trigger")
  })

  it("only ever removes review_status from the compared row", () => {
    // Guards against a rewrite that strips a content field and silently allows
    // approved bodies to be edited in place.
    const stripped = draftFix.match(/- '([a-z_]+)'/g) ?? []
    expect(stripped).toEqual(["- 'review_status'", "- 'review_status'"])
  })

  it("contains no destructive statement in any reconciliation", () => {
    for (const migration of reconciliationMigrations) {
      expect(migration).not.toMatch(/drop\s+table/i)
      expect(migration).not.toMatch(/drop\s+column/i)
      expect(migration).not.toMatch(/drop\s+policy/i)
      expect(migration).not.toMatch(/drop\s+trigger/i)
      expect(migration).not.toMatch(/delete\s+from/i)
      expect(migration).not.toMatch(/truncate/i)
      expect(migration).not.toMatch(/alter\s+column[^;]*rename/i)
      expect(migration).not.toMatch(/grant\s+all\s+on\s+public\.\w+\s+to\s+authenticated/i)
      expect(migration).not.toMatch(/grant\s+delete/i)
    }
  })

  it("keeps the platform compatibility family untouched in every migration", () => {
    for (const migration of [engineMigration, ...reconciliationMigrations]) {
      expect(migration).not.toContain("platform_cases")
      expect(migration).not.toContain("platform_tasks")
      expect(migration).not.toContain("platform_audit_events")
    }
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

  it("uses FOUND only inside a PL/pgSQL block", () => {
    // A top-level `if not found` is a SQL syntax error, not an RLS failure, so it
    // would abort the whole script before any assertion ran. Only an unindented
    // occurrence is top-level; an indented one is inside a block.
    expect(isolationTest).not.toMatch(/^if not found/m)

    const blocks = isolationTest.split(/do\s*\$\$/).slice(1)
    const blocksUsingFound = blocks.filter((block) => /if not found/.test(block.split("$$;")[0]))
    expect(blocksUsingFound).toHaveLength(1)
  })
})