import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const baseline = readFileSync(
  join(process.cwd(), "supabase/baseline/kintexbg_b2c_v1.sql"),
  "utf8",
).toLowerCase()
const hardening = readFileSync(
  join(process.cwd(), "supabase/prepared/kintex_b2c_rls_hardening.sql"),
  "utf8",
).toLowerCase()
const behavioralTest = readFileSync(
  join(process.cwd(), "supabase/tests/rls/kintex_b2c_isolation.sql"),
  "utf8",
).toLowerCase()

const userScopedTables = [
  "profiles",
  "households",
  "contracts",
  "cases",
  "documents",
  "tasks",
  "correspondence_drafts",
  "approvals",
  "audit_events",
  "kindergeld_cases",
  "radar_events",
  "document_analysis_results",
  "document_reviews",
  "contract_radar_history",
]

describe("KintexBG recoverable database baseline", () => {
  it("contains every current B2C user-data table with RLS enabled", () => {
    for (const table of userScopedTables) {
      expect(baseline).toContain(`table if not exists public.${table}`)
      expect(baseline).toContain(`table public.${table} enable row level security`)
    }
  })

  it("contains the complete production migration lineage", () => {
    for (const migration of [
      "20260901165451_create_mission_1_foundation",
      "20260905153610_kintex_profile_household_core",
      "20260905153636_kintex_documents_storage_insert",
      "20260905153642_kintex_documents_storage_select",
      "20260905153649_kintex_documents_storage_update",
      "20260905153654_kintex_documents_storage_delete",
      "20260906182525_contract_document_radar_pilot",
      "20260906223424_contract_document_radar_pilot_finalize",
    ]) {
      expect(baseline).toContain(migration)
    }
  })

  it("marks the baseline as fresh-project-only", () => {
    expect(baseline).toContain("new, empty supabase project only")
    expect(baseline).toContain("never apply this file to the existing production project")
  })
})

describe("KintexBG RLS hardening contract", () => {
  it("removes obsolete Storage policies and anonymous table privileges", () => {
    expect(hardening).toContain('drop policy if exists "documents_storage_select_own"')
    expect(hardening).toContain('drop policy if exists "documents_storage_insert_own"')
    expect(hardening).toContain("from anon")
    expect(baseline).toContain("(storage.foldername(name))[1] = 'households'")
    expect(baseline).toContain("(storage.foldername(name))[2]")
  })

  it("binds analysis and review rows to an owned source document", () => {
    expect(hardening).toContain('create policy "kintex_analysis_owner_all"')
    expect(hardening).toContain("d.id = document_analysis_results.document_id")
    expect(hardening).toContain('create policy "kintex_reviews_owner_all"')
    expect(hardening).toContain("d.id = document_reviews.document_id")
    expect(hardening.match(/h\.owner_id = \(select auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("does not use unsafe authorization claims or privileged functions", () => {
    expect(hardening).not.toContain("auth.role()")
    expect(hardening).not.toContain("user_metadata")
    expect(hardening).not.toContain("security definer")
  })

  it("ships a rollback-only two-customer behavioral test", () => {
    expect(behavioralTest).toContain("begin;")
    expect(behavioralTest).toContain("set local role authenticated")
    expect(behavioralTest).toContain("cross-household analysis insert was allowed")
    expect(behavioralTest).toContain("obsolete storage path was allowed")
    expect(behavioralTest.trimEnd().endsWith("rollback;")).toBe(true)
  })
})
