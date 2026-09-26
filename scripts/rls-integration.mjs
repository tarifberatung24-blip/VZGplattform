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
import { execFileSync } from "node:child_process"
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
