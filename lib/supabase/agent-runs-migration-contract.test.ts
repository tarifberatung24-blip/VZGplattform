import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Contract for the HORIZON Agent Runs Engine persistence.
 *
 * The schema is a normal additive migration in `supabase/migrations/`, because the
 * owner approved the engine schema and RLS (`docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md`
 * §C, `docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md` §7). These assertions hold
 * it to the security and additivity rules the other applied migrations follow, so a
 * later edit cannot silently ship a weaker schema.
 *
 * This is a static contract test. It does not prove RLS behaviour; that is what
 * `supabase/tests/rls/horizon_agent_runs_engine_isolation.sql`,
 * `horizon_agent_runs_engine_claim_scope.sql` and
 * `horizon_agent_runs_engine_worker_recovery.sql` are for, and they are only valid
 * when run against a disposable database.
 */

const root = process.cwd()
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8")

const migration = read("supabase/migrations/20261107000000_horizon_agent_runs_engine.sql")
const isolationTest = read("supabase/tests/rls/horizon_agent_runs_engine_isolation.sql")
const claimScopeTest = read("supabase/tests/rls/horizon_agent_runs_engine_claim_scope.sql")
const workerRecoveryTest = read("supabase/tests/rls/horizon_agent_runs_engine_worker_recovery.sql")

/**
 * Strips `--` line comments so security assertions inspect executable SQL rather
 * than prose. Without this, a comment that quotes a forbidden pattern would fail
 * the test and a comment that hides one would pass it. `.*$` does not consume a
 * trailing `\r` on a CRLF checkout, which would leave prose behind, so the whole
 * line is replaced from the first `--`.
 */
const stripSqlComments = (sql: string) =>
  sql
    .split("\n")
    .map((line) => line.replace(/--[\s\S]*$/, ""))
    .join("\n")

const executable = stripSqlComments(migration).toLowerCase()

const newTables = ["agent_runs", "agent_steps", "agent_run_events"] as const

const requiredEventTypes = [
  "SERVICE_REQUEST_CREATED",
  "DOCUMENT_READY",
  "CASE_UPDATED",
  "DEADLINE_APPROACHING",
  "USER_APPROVAL_GRANTED",
  "USER_APPROVAL_REJECTED",
]

describe("agent runs engine: an additive, re-runnable migration", () => {
  it("lives in supabase/migrations as an additive migration", () => {
    expect(migration).toContain("HORIZON Agent Runs Engine")
    // Applied migrations must be idempotent; the owner applies them manually.
    expect(migration).not.toContain("PREPARED ONLY")
  })

  it("is idempotent and safe to re-run", () => {
    for (const table of newTables) {
      expect(migration).toContain(`create table if not exists public.${table}`)
    }
    expect(executable).not.toMatch(/create table (?!if not exists)/)
    expect(executable).not.toMatch(/create index (?!if not exists)/)
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
  })

  it("leaves every existing canonical and legacy object untouched", () => {
    // The prepared schema only creates its own tables and one helper function.
    expect(migration).not.toContain("platform_cases")
    expect(migration).not.toContain("platform_tasks")
    expect(migration).not.toContain("platform_audit_events")
    // No existing canonical table is altered.
    expect(executable).not.toMatch(
      /alter table public\.(cases|extracted_facts|case_messages|audit_events|tasks|source_documents|correspondence_drafts)\b/,
    )
  })
})

describe("agent runs engine: duplicate safety is enforced by the database", () => {
  it("refuses a duplicate run through a unique owner-scoped key", () => {
    expect(migration).toContain(
      "constraint agent_runs_owner_idempotency_key unique (owner_id, idempotency_key)",
    )
    expect(migration).toContain("constraint agent_runs_owner_trace_id unique (owner_id, trace_id)")
  })

  it("refuses a duplicate event through a unique owner-scoped key", () => {
    expect(migration).toContain(
      "constraint agent_run_events_owner_idempotency_key unique (owner_id, idempotency_key)",
    )
  })

  it("makes a retry a new attempt row rather than an overwrite", () => {
    expect(migration).toContain(
      "constraint agent_steps_run_step_attempt unique (run_id, step_key, attempt)",
    )
  })

  it("has a terminal dead-letter state for events", () => {
    expect(migration).toContain("'dead_letter'")
    expect(migration).toContain("status in ('received','processing','processed','dead_letter')")
  })
})

describe("agent runs engine: owner isolation is structural", () => {
  it("enables RLS on every new table", () => {
    for (const table of newTables) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it("scopes every policy to auth.uid() and to authenticated only", () => {
    expect(executable).not.toContain("using (true)")
    expect(executable).not.toContain("with check (true)")
    expect(executable).not.toContain("for all to authenticated")
    // Policies are created through execute format(..). The owner predicate is a
    // literal in the statement template, never interpolated from input, and each
    // policy kind carries the correct clause.
    expect(executable).toContain("for select to authenticated using ((select auth.uid()) = owner_id)")
    expect(executable).toContain("for insert to authenticated with check ((select auth.uid()) = owner_id)")
    expect(executable).toContain(
      "for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)",
    )
  })

  it("declares exactly one select, insert and update policy per table", () => {
    for (const table of newTables) {
      for (const kind of ["select", "insert", "update"]) {
        expect(migration).toContain(`'${table}_owner_${kind}'`)
      }
    }
  })

  it("creates each policy kind in its own block, with its own command", () => {
    // Regression guard: an earlier draft listed all nine policy names in one loop
    // that always emitted `for select`, so every insert/update policy was silently
    // created as a select policy and the insert then failed with "new row violates
    // row-level security policy". Real-database validation caught it. Each command
    // must appear in exactly one template, and each policy name exactly once.
    const template = (kind: string) => executable.split(`for ${kind} to authenticated`).length - 1
    expect(template("select")).toBe(1)
    expect(template("insert")).toBe(1)
    expect(template("update")).toBe(1)

    for (const table of newTables) {
      for (const kind of ["select", "insert", "update"]) {
        const name = `'${table}_owner_${kind}'`
        expect(migration.split(name).length - 1).toBe(1)
      }
    }
  })

  it("never builds the owner predicate from input", () => {
    // The owner column is a fixed literal, so format() cannot interpolate anything
    // caller-controlled into a policy. Only the table and policy names are placeholders.
    expect(migration).not.toMatch(/target\.\w+\s*=/)
    expect(executable).not.toContain("= %i")
  })

  it("never grants access to anon and never grants a table-wide write or delete privilege", () => {
    expect(executable).not.toMatch(/to\s+anon\s*;/)
    expect(executable).toMatch(/revoke all on table public\.agent_runs from anon/)
    expect(executable).toMatch(/revoke all on table public\.agent_steps from anon/)
    expect(executable).toMatch(/revoke all on table public\.agent_run_events from anon/)
    expect(executable).not.toMatch(/grant\s+all/)
    expect(executable).not.toMatch(/grant\s+delete/)
    // A table-wide `grant select` is the existing repository pattern (RLS still
    // restricts which rows are visible), but a table-wide INSERT or UPDATE would
    // bypass the column scoping, so those are forbidden.
    expect(executable).not.toMatch(
      /grant\s+(insert|update)\s+on\s+(table\s+)?public\.\w+\s+to\s+authenticated/,
    )
  })

  it("scopes the service-role grant to the engine tables and to no delete", () => {
    // The scheduled dispatcher needs the service role (a cron pass has no user
    // session). That is an explicit owner decision, so it is asserted here rather
    // than left implicit: the grant must name exactly the three engine tables, and
    // it must not include delete.
    for (const table of newTables) {
      expect(executable).toContain(`grant select, insert, update on table public.${table} to service_role`)
    }
    // No *other* table receives a service-role grant.
    const tableServiceRoleGrants = executable.match(
      /grant[^;]*on table public\.\w+ to service_role/g,
    )
    expect(tableServiceRoleGrants).toHaveLength(newTables.length)
    // Still no delete anywhere, for any role.
    expect(executable).not.toMatch(/grant\s+delete/)
    expect(executable).not.toMatch(/grant\s+all/)
  })

  it("keeps the claim helpers owner-pinned even for the service role", () => {
    // The owner argument is honoured only when the caller is the service role, so a
    // user session can never widen its own scope by passing another owner's id.
    expect(migration).toContain("(select auth.role()) = 'service_role'")
    expect(migration).toContain("else (select auth.uid())")
    expect(migration).toContain("security invoker")
    expect(executable).not.toMatch(/security definer/)
  })

  it("binds a run and a step to the owning case through a composite foreign key", () => {
    // The same technique audit_events_case_owner_fk already uses: it makes
    // cross-owner binding impossible in the database, not only in application code.
    expect(migration).toContain("constraint agent_runs_case_owner_fk")
    expect(migration).toContain(
      "foreign key (case_id, owner_id) references public.cases(id, owner_id) on delete cascade",
    )
    expect(migration).toContain("constraint agent_steps_run_owner_fk")
    expect(migration).toContain(
      "foreign key (run_id, owner_id) references public.agent_runs(id, owner_id) on delete cascade",
    )
    expect(migration).toContain("constraint agent_run_events_run_owner_fk")
  })
})

describe("agent runs engine: event and error handling stay bounded", () => {
  it("constrains the event type to exactly the six required types", () => {
    for (const eventType of requiredEventTypes) {
      expect(migration).toContain(`'${eventType}'`)
    }
  })

  it("bounds retries with an attempt counter and a max", () => {
    expect(migration).toContain("attempt integer not null default 0 check (attempt >= 0)")
    expect(migration).toContain(
      "max_attempts integer not null default 5 check (max_attempts between 1 and 20)",
    )
    expect(migration).toContain("available_at timestamptz not null default now()")
  })

  it("stores only a safe error summary, never a raw stack trace or content", () => {
    expect(migration).toContain("error_message_safe")
    // The column is explicitly documented as non-sensitive.
    expect(migration).toContain("Never a stack trace, prompt, document text or secret")
  })

  it("carries references, never document content or prompts", () => {
    expect(migration).toContain("input_references jsonb not null default '[]'::jsonb")
    expect(migration).toContain("output_references jsonb not null default '[]'::jsonb")
    expect(migration).toContain("jsonb_typeof(input_references) = 'array'")
    // No column stores raw document content or a prompt body.
    expect(executable).not.toMatch(/\bcontent\s+text/)
    expect(executable).not.toMatch(/\bprompt\s+text/)
  })

  it("exposes a claim index for the worker path", () => {
    expect(migration).toContain("create index if not exists agent_run_events_claim_idx")
    expect(migration).toContain("on public.agent_run_events(status, available_at)")
  })
})

describe("agent runs engine: the RLS isolation test is well-formed", () => {
  it("is a rollback-only script", () => {
    expect(isolationTest.trimStart().startsWith("--")).toBe(true)
    expect(isolationTest).toContain("begin;")
    expect(isolationTest.trimEnd().endsWith("rollback;")).toBe(true)
  })

  it("warns that it must not run against production", () => {
    expect(isolationTest).toContain("Never run against the production project")
  })

  it("covers read, cross-owner write, spoofed insert, duplicate run, duplicate event, invalid event, retry and anon", () => {
    expect(isolationTest).toContain("set local role authenticated")
    expect(isolationTest).toContain("set local role anon")
    expect(isolationTest).toContain("A read B run by id")
    expect(isolationTest).toContain("A modified B run")
    expect(isolationTest).toContain("A bound a run to B case")
    expect(isolationTest).toContain("A inserted a run as B")
    expect(isolationTest).toContain("duplicate run idempotency key was accepted")
    expect(isolationTest).toContain("duplicate event idempotency key was accepted")
    expect(isolationTest).toContain("invalid event type was accepted")
    expect(isolationTest).toContain("duplicate (run, step, attempt) was accepted")
  })

  it("asserts per-table isolation for the owner and for anon", () => {
    for (const table of newTables) {
      expect(isolationTest).toContain(`from public.${table}`)
    }
  })

  it("keeps the comment stripper meaningful", () => {
    // Sanity-check the stripper so the security assertions above are not vacuous.
    expect(stripSqlComments("create policy x on t for select using (true);")).toContain("using (true)")
    expect(stripSqlComments("-- using (true)")).not.toContain("using (true)")
  })
})

describe("agent runs engine: the claim helpers are covered by real-database tests", () => {
  it("keeps both helper tests rollback-only and pointed at a disposable database", () => {
    for (const script of [claimScopeTest, workerRecoveryTest]) {
      expect(script.trimStart().startsWith("--")).toBe(true)
      expect(script).toContain("begin;")
      expect(script).toContain("rollback;")
    }
  })

  it("proves a user session cannot claim or reclaim another owner's work", () => {
    expect(claimScopeTest).toContain("set local role authenticated")
    expect(claimScopeTest).toContain("CLAIM_SCOPE_OK")
    // The owner override must be attempted and must return nothing.
    expect(claimScopeTest).toContain("claim_agent_run_events(10, 'b0000000")
    expect(claimScopeTest).toContain("recover_stale_agent_run_events(60, 'b0000000")
  })

  it("proves the worker recovers a crashed claim and bounds retries", () => {
    expect(workerRecoveryTest).toContain("set local role service_role")
    expect(workerRecoveryTest).toContain("WORKER_RECOVERY_OK")
    expect(workerRecoveryTest).toContain("recover_stale_agent_run_events")
    // A claim with no owner must find nothing, so a worker cannot sweep owners.
    expect(workerRecoveryTest).toContain("claim_agent_run_events(10)")
  })
})
