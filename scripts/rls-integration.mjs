#!/usr/bin/env node
/**
 * Runs the HORIZON negotiation RLS isolation test against a real PostgreSQL
 * database.
 *
 * This is a genuine integration test: it applies the actual migration files to a
 * throwaway database, then executes
 * supabase/tests/rls/horizon_negotiation_isolation.sql as two authenticated
 * customers. It is not a text assertion.
 *
 * Usage:
 *   HORIZON_RLS_DATABASE_URL=postgresql://.../horizon_rls_test node scripts/rls-integration.mjs
 *
 * Without HORIZON_RLS_DATABASE_URL the script exits 0 with a notice, so the
 * default `pnpm test` path is unaffected on machines without a database.
 *
 * SAFETY: this script rebuilds the `public` schema, so it destroys data. It
 * refuses to run unless the target database name looks disposable (contains
 * "test", "tmp", "ci", or "scratch"). Override with
 * HORIZON_RLS_ALLOW_DESTRUCTIVE=1 only when you are certain the target is a
 * throwaway instance.
 */
import { execFile, execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const databaseUrl = process.env.HORIZON_RLS_DATABASE_URL?.trim()

if (!databaseUrl) {
  console.log(
    "rls-integration: skipped (set HORIZON_RLS_DATABASE_URL to run the negotiation RLS integration test)",
  )
  process.exit(0)
}

const disposablePattern = /(test|tmp|ci|scratch)/i
const databaseName = (() => {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, "")
  } catch {
    return ""
  }
})()

if (!disposablePattern.test(databaseName) && process.env.HORIZON_RLS_ALLOW_DESTRUCTIVE !== "1") {
  console.error(
    `rls-integration: refusing to rebuild the public schema of "${databaseName || "unknown"}", ` +
      "which does not look like a disposable database. Set HORIZON_RLS_ALLOW_DESTRUCTIVE=1 to override.",
  )
  process.exit(1)
}

// The negotiation tables reference public.households / public.contracts and the
// Supabase-managed auth schema, so the harness applies, in order:
//   1. the compat prelude (auth/storage/roles — local harness only, never applied
//      to a Supabase project where those objects already exist)
//   2. the consolidated B2C baseline (households, contracts, documents, RLS)
//   3. the negotiation migration under test
//   4. the isolation test itself
const steps = [
  { label: "prelude", file: "supabase/tests/rls/_supabase_compat_prelude.sql" },
  { label: "baseline", file: "supabase/baseline/kintexbg_b2c_v1.sql" },
  {
    label: "negotiation migration",
    file: "supabase/migrations/20260926090000_horizon_negotiation_engine.sql",
  },
  {
    label: "negotiation handoff atomicity",
    file: "supabase/migrations/20260927090000_horizon_negotiation_handoff_atomicity.sql",
  },
  { label: "rls isolation test", file: "supabase/tests/rls/horizon_negotiation_isolation.sql" },
]

// Rebuilds the schemas so repeated runs start from a known state. auth and
// storage are dropped too, because the prelude recreates them and the baseline's
// Storage policies depend on them.
const resetSql = `
drop schema if exists public cascade;
create schema public;
drop schema if exists auth cascade;
drop schema if exists storage cascade;
`.trim()

function psql(input) {
  return execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  })
}

try {
  psql(resetSql)
} catch (error) {
  console.error("rls-integration: could not reset the harness schema")
  console.error((error.stderr || error.message || "").trim())
  process.exit(1)
}

for (const step of steps) {
  try {
    psql(readFileSync(join(root, step.file), "utf8"))
    console.log(`rls-integration: ok — ${step.label}`)
  } catch (error) {
    console.error(`rls-integration: FAILED at ${step.label}`)
    console.error((error.stderr || error.message || "").trim().split("\n").slice(0, 12).join("\n"))
    process.exit(1)
  }
}

console.log("rls-integration: negotiation RLS isolation holds for both customers")

// ---------------------------------------------------------------------------
// Concurrent reservation race.
//
// The assertions above drive every branch of `reserve_negotiation_handoff`
// sequentially on one connection, which proves the logic but not the compare-
// and-set. This phase runs two *real* connections against the same row: the
// first reserves and holds the row lock across a sleep, the second calls reserve
// while that lock is held. In READ COMMITTED the second UPDATE blocks, then
// re-evaluates after the first commits and must find no row to update, so it
// falls through to a read and is told `in_flight`. Exactly one caller may win.
//
// The same shape proves the callback compare-and-set: two concurrent applies of
// the same move resolve to one applied move and one no-op, so a race cannot
// append two timeline events.
// ---------------------------------------------------------------------------
const fixtures = `
insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'c3000000-0000-4000-8000-000000000003',
  'negotiation-race@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.households (id, owner_id, name)
values ('c3000000-0000-4000-8000-000000000033', 'c3000000-0000-4000-8000-000000000003', 'Race')
on conflict (id) do nothing;

insert into public.contracts (id, household_id, category, title, provider_name)
values ('c3000000-0000-4000-8000-000000003333', 'c3000000-0000-4000-8000-000000000033', 'internet', 'Race contract', 'Provider C')
on conflict (id) do nothing;

insert into public.negotiation_sessions (id, owner_id, household_id, contract_id, category, state)
values (
  'c3000000-0000-4000-8000-00000000cc01',
  'c3000000-0000-4000-8000-000000000003',
  'c3000000-0000-4000-8000-000000000033',
  'c3000000-0000-4000-8000-000000003333',
  'internet', 'CONTRACT'
) on conflict (id) do nothing;

update public.negotiation_sessions
   set mode_b_request_id = null,
       mode_b_status = null,
       mode_b_delivery_status = null
 where id = 'c3000000-0000-4000-8000-00000000cc01';
`

const A = "c3000000-0000-4000-8000-00000000cc01"
const O = "c3000000-0000-4000-8000-000000000003"

try {
  psql(fixtures)
} catch (error) {
  console.error("rls-integration: could not seed the race fixtures")
  console.error((error.stderr || error.message || "").trim().split("\n").slice(0, 8).join("\n"))
  process.exit(1)
}

/** Runs psql with `sql` on stdin, resolving to its stdout (never rejects). */
function psqlAsync(sql) {
  return new Promise((resolve) => {
    const child = execFile(
      "psql",
      [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q"],
      (error, stdout, stderr) => resolve({ error, stdout: stdout ?? "", stderr: stderr ?? "" }),
    )
    child.stdin.end(sql)
  })
}

function parseResult(label, stdout) {
  // The winner's line looks like `A:hzn_race_a:true:reserved`. Only the tagged
  // line is read; pg_sleep returns an empty row that is ignored.
  const line = stdout
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(`${label}:`))
  if (!line) return null
  const [, requestId, deliver, reason] = line.split(":")
  return { requestId, deliver: deliver === "true", reason }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The first reserve holds the row lock across a sleep, so the second call is
// guaranteed to collide with an in-flight reservation rather than race a
// committed one.
const holder = psqlAsync(`
begin;
select 'A:' || r.request_id || ':' || r.deliver || ':' || r.reason
  from public.reserve_negotiation_handoff('${A}', '${O}', 'hzn_race_a') r;
select pg_sleep(1.5);
commit;
`)

await sleep(400)
const contender = psqlAsync(`
select 'B:' || r.request_id || ':' || r.deliver || ':' || r.reason
  from public.reserve_negotiation_handoff('${A}', '${O}', 'hzn_race_b') r;
`)

const [holderOut, contenderOut] = await Promise.all([holder, contender])

if (holderOut.error || contenderOut.error) {
  console.error("rls-integration: FAILED at concurrent reservation race")
  console.error((holderOut.stderr || contenderOut.stderr || "").trim().split("\n").slice(0, 8).join("\n"))
  process.exit(1)
}

const winner = parseResult("A", holderOut.stdout)
const loser = parseResult("B", contenderOut.stdout)

if (!winner || winner.requestId !== "hzn_race_a" || !winner.deliver || winner.reason !== "reserved") {
  console.error(`rls-integration: FAILED at concurrent reservation race — the holder did not win: ${JSON.stringify(winner)}`)
  process.exit(1)
}
if (!loser || loser.requestId !== "hzn_race_a" || loser.deliver || loser.reason !== "in_flight") {
  console.error(`rls-integration: FAILED at concurrent reservation race — the contender was not refused: ${JSON.stringify(loser)}`)
  process.exit(1)
}
console.log("rls-integration: ok — concurrent reservation produces exactly one sender")

// The callback compare-and-set, under the same race. Exactly one apply may win.
const holderApply = psqlAsync(`
begin;
select 'A:' || public.apply_negotiation_handoff_status('${A}', '${O}', 'QUEUED', 'IN_PROGRESS');
select pg_sleep(1.5);
commit;
`)
await sleep(400)
const contenderApply = psqlAsync(`
select 'B:' || public.apply_negotiation_handoff_status('${A}', '${O}', 'QUEUED', 'IN_PROGRESS');
`)
const [applyA, applyB] = await Promise.all([holderApply, contenderApply])

if (applyA.error || applyB.error) {
  console.error("rls-integration: FAILED at concurrent callback race")
  console.error((applyA.stderr || applyB.stderr || "").trim().split("\n").slice(0, 8).join("\n"))
  process.exit(1)
}

const appliedA = applyA.stdout.split("\n").map((l) => l.trim()).find((l) => l.startsWith("A:"))
const appliedB = applyB.stdout.split("\n").map((l) => l.trim()).find((l) => l.startsWith("B:"))
const winA = appliedA === "A:true"
const winB = appliedB === "B:true"
if (winA === winB) {
  console.error(`rls-integration: FAILED at concurrent callback race — expected exactly one applied (A=${appliedA}, B=${appliedB})`)
  process.exit(1)
}

// And the timeline must carry exactly one event for that move, not two.
const eventsResult = await psqlAsync(
  `select count(*) from public.negotiation_events where session_id = '${A}' and event_type = 'operator_status_changed';`,
)
const events = eventsResult.stdout.trim()
if (events !== "1") {
  console.error(`rls-integration: FAILED at concurrent callback race — expected 1 timeline event, saw ${events || "(none)"}`)
  process.exit(1)
}
console.log("rls-integration: ok — concurrent callback applies exactly one move and one timeline event")

console.log("rls-integration: MODE B handoff is atomic and single-sender under real concurrency")
