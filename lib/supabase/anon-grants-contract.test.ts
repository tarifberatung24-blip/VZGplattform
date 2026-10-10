import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * Contract for 20261010110000_revoke_anon_table_grants_and_dead_storage_policies.sql
 * (T2 audit F4 + F5). The migration must stay privilege-only:
 * - revoke table privileges from `anon` on every public table except `leads`,
 * - keep the signed-out contact form (`anon` INSERT on `leads`) working,
 * - never touch `authenticated` or `service_role`,
 * - drop only the three dead `document_storage_owner_*` storage policies.
 * The behaviour itself was verified against a Supabase-like local Postgres
 * fixture (run twice for idempotency, plus an abort case when `leads` loses
 * its anon INSERT).
 */
const sql = readFileSync(
  "supabase/migrations/20261010110000_revoke_anon_table_grants_and_dead_storage_policies.sql",
  "utf8",
)
// Comments quote statements they explain; assert on executable SQL only.
const executable = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "").toLowerCase()

describe("anon table-grant hardening migration", () => {
  it("revokes table privileges from anon in public, excluding leads", () => {
    expect(executable).toMatch(/revoke all on table public\.%i from anon/)
    expect(executable).toMatch(/c\.relname <> 'leads'/)
  })

  it("stops new public tables from starting with anon access", () => {
    expect(executable).toMatch(/alter default privileges for role postgres in schema public revoke all on tables from anon/)
  })

  it("does not revoke or grant anything for authenticated or service_role", () => {
    expect(executable).not.toMatch(/(revoke|grant)[^;]*\b(authenticated|service_role)\b/)
  })

  it("does not drop or create any policy on public tables", () => {
    expect(executable).not.toMatch(/(drop|create|alter) policy[^;]*on public\./)
  })

  it("drops exactly the three dead document_storage_owner_* storage policies", () => {
    const drops = executable.match(/drop policy if exists [a-z_]+ on storage\.objects/g) ?? []
    expect(drops.sort()).toEqual([
      "drop policy if exists document_storage_owner_delete on storage.objects",
      "drop policy if exists document_storage_owner_insert on storage.objects",
      "drop policy if exists document_storage_owner_select on storage.objects",
    ])
    expect(executable).not.toMatch(/drop policy[^;]*kintex_documents/)
  })

  it("aborts if anon would lose INSERT on leads or keep access elsewhere", () => {
    expect(executable).toMatch(/anon lost insert on public\.leads/)
    expect(executable).toMatch(/anon still holds table privileges on/)
  })
})
