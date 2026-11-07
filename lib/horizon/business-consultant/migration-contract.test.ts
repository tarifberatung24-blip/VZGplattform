import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Contract for the HORIZON Business Consultant persistence.
 *
 * `supabase/migrations/20261108120000_horizon_business_consultant.sql` is a 444-line
 * additive migration that the owner applies by hand, so nothing else in the test
 * suite would notice a later edit that dropped a policy, weakened a foreign key or
 * granted anon access. These assertions hold it to the same rules as the applied
 * Agent Runs Engine migration. The agent-runs sibling has an identical contract
 * test; this migration had none.
 *
 * This is a static contract test. It does not prove RLS behaviour; that is what
 * `supabase/tests/rls/horizon_business_consultant_isolation.sql` is for, and it is
 * only valid when run against a disposable database.
 */

const root = process.cwd()
const migration = readFileSync(
  join(root, "supabase/migrations/20261108120000_horizon_business_consultant.sql"),
  "utf8",
)

/**
 * Strips `--` line comments so security assertions inspect executable SQL rather
 * than prose. Without this, a comment quoting a forbidden pattern would fail the
 * test and a comment hiding one would pass it.
 */
const stripSqlComments = (sql: string) =>
  sql
    .split("\n")
    .map((line) => line.replace(/--[\s\S]*$/, ""))
    .join("\n")

const executable = stripSqlComments(migration).toLowerCase()

const newTables = [
  "business_diagnoses",
  "business_playbook_actions",
  "business_documents",
  "business_finance_entries",
] as const

describe("business consultant: an additive, re-runnable migration", () => {
  it("lives in supabase/migrations as an additive migration", () => {
    expect(migration).toContain("HORIZON Business Consultant")
  })

  it("is idempotent and safe to re-run", () => {
    for (const table of newTables) {
      expect(migration).toContain(`create table if not exists public.${table}`)
    }
    expect(migration).toContain("add column if not exists business_services")
    expect(migration).toContain("add column if not exists business_tools")
    expect(executable).not.toMatch(/create table (?!if not exists)/)
    expect(executable).not.toMatch(/create index (?!if not exists)/)
    expect(executable).not.toMatch(/create unique index (?!if not exists)/)
  })

  it("contains no destructive statement", () => {
    expect(executable).not.toMatch(/drop\s+table/)
    expect(executable).not.toMatch(/drop\s+column/)
    expect(executable).not.toMatch(/drop\s+policy/)
    expect(executable).not.toMatch(/drop\s+constraint/)
    expect(executable).not.toMatch(/drop\s+index/)
    expect(executable).not.toMatch(/drop\s+trigger/)
    expect(executable).not.toMatch(/delete\s+from/)
    expect(executable).not.toMatch(/truncate/)
    expect(executable).not.toMatch(/alter\s+column[^;]*rename/)
    expect(executable).not.toMatch(/rename\s+to/)
    expect(executable).not.toMatch(/disable\s+row\s+level\s+security/)
  })

  it("leaves the legacy platform_* schema untouched", () => {
    expect(migration).not.toContain("platform_cases")
    expect(migration).not.toContain("platform_tasks")
    expect(migration).not.toContain("platform_audit_events")
  })

  it("only alters existing tables additively", () => {
    // The two `alter table` targets are additive: new columns on business_profiles
    // and a unique key on source_documents. No canonical table is rewritten.
    expect(executable).toMatch(/alter table public\.business_profiles\s+add column if not exists/)
    expect(executable).toContain("add constraint business_profiles_id_owner unique (id, owner_id)")
    expect(executable).toContain("add constraint source_documents_id_owner unique (id, owner_id)")
    expect(executable).not.toMatch(/alter table public\.(cases|audit_events|source_documents)\s+drop/)
  })

  it("does not introduce a second source of truth", () => {
    // No case, document, fact or draft table is created; every row references an
    // existing HORIZON entity by id.
    const created = [...executable.matchAll(/create table if not exists public\.(\w+)/g)].map((match) => match[1])
    expect(created).toEqual([...newTables])
    expect(migration).toContain("references public.business_profiles(id, owner_id)")
    expect(migration).toContain("references public.source_documents(id, owner_id)")
    expect(migration).toContain("references public.cases(id)")
  })

  it("stores no document content and no secret", () => {
    // The document link stores only ids and dates; the file stays in source_documents.
    expect(executable).not.toMatch(/\bbytea\b/)
    expect(executable).not.toMatch(/\bpgcrypto\b/)
    expect(executable).not.toMatch(/storage\.objects/)
    expect(executable).not.toMatch(/(secret|password|api_key|token)\s*(text|varchar)/)
  })
})

describe("business consultant: cross-owner attachment is impossible in the database", () => {
  it("binds every child row to its owner with a composite foreign key", () => {
    // A foreign profile/document id can never attach, because the FK matches the
    // pair (id, owner_id), not the id alone.
    expect(migration).toContain("constraint business_diagnoses_profile_owner_fk")
    expect(migration).toContain("constraint business_playbook_actions_profile_owner_fk")
    expect(migration).toContain("constraint business_documents_profile_owner_fk")
    expect(migration).toContain("constraint business_documents_document_owner_fk")
    expect(migration).toContain("constraint business_finance_entries_profile_owner_fk")
  })

  it("adds the unique pair the composite foreign keys require", () => {
    expect(migration).toContain("unique (id, owner_id)")
  })

  it("qualifies every unique key with the owner so it cannot leak tenant existence", () => {
    // A bare (profile_id) index would collide across tenants and report another
    // owner's row existence. Every uniqueness rule is owner-qualified.
    expect(migration).toContain("unique (owner_id, profile_id, horizon, action_key)")
    expect(migration).toContain("unique (owner_id, profile_id, document_id)")
    expect(migration).toContain("on public.business_diagnoses(owner_id, profile_id) where status = 'ready'")
    expect(executable).not.toMatch(/unique\s*\(profile_id[,)]/)
  })

  it("links the optional parent rows with a plain single-column FK", () => {
    // A nullable parent link with a NOT NULL owner column cannot use a composite
    // `set null` FK; ownership is still enforced server-side before the write.
    expect(migration).toContain("foreign key (run_id) references public.agent_runs(id) on delete set null")
    expect(migration).toContain("foreign key (diagnosis_id) references public.business_diagnoses(id) on delete set null")
    expect(migration).toContain("foreign key (case_id) references public.cases(id) on delete set null")
    expect(migration).toContain("foreign key (document_id) references public.source_documents(id) on delete set null")
  })

  it("guards the agent_runs link so the migration works without the engine", () => {
    expect(executable).toContain("to_regclass('public.agent_runs')")
  })
})

describe("business consultant: owner isolation is structural", () => {
  it("enables RLS on every new table", () => {
    for (const table of newTables) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it("scopes every policy to auth.uid() and to authenticated only", () => {
    expect(executable).not.toContain("using (true)")
    expect(executable).not.toContain("with check (true)")
    expect(executable).not.toContain("for all to authenticated")
    expect(executable).toContain("for select to authenticated using ((select auth.uid()) = owner_id)")
    expect(executable).toContain("for insert to authenticated with check ((select auth.uid()) = owner_id)")
    expect(executable).toContain(
      "for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)",
    )
  })

  it("creates a select, insert and update policy for each new table", () => {
    for (const table of newTables) {
      for (const kind of ["select", "insert", "update"] as const) {
        expect(migration).toContain(`'${table}_owner_${kind}'`)
      }
    }
  })

  it("never grants anything to anon or to a role wider than authenticated", () => {
    expect(executable).not.toMatch(/to\s+anon\b/)
    expect(executable).not.toMatch(/to\s+public\b/)
    expect(executable).not.toMatch(/grant\s+all\b/)
    // Every grant names `authenticated`.
    const grants = executable.match(/grant [^;]+;/g) ?? []
    expect(grants.length).toBeGreaterThan(0)
    for (const grant of grants) expect(grant).toContain("to authenticated")
  })

  it("keeps the generated id out of the insert grants", () => {
    // `id` is server-generated and never client-writable. `owner_id` *is* granted,
    // but the insert policy's `with check ((select auth.uid()) = owner_id)` pins it
    // to the session, so a client cannot choose an owner — the grant is what lets a
    // legitimate insert satisfy that check.
    const insertGrants = executable.match(/grant insert \([^)]+\)/g) ?? []
    expect(insertGrants.length).toBeGreaterThan(0)
    for (const grant of insertGrants) {
      const columns = grant.slice(grant.indexOf("(") + 1, grant.lastIndexOf(")")).split(",").map((c) => c.trim())
      expect(columns).not.toContain("id")
    }
  })

  it("has no delete policy and no delete grant", () => {
    // Deletion is an owner-side action, not a client capability.
    expect(executable).not.toMatch(/for delete/)
    expect(executable).not.toMatch(/grant delete/)
  })
})
