# Supabase migration history repair (canonical project `mteguzgbiuexmdcrqajj`)

Source: read-only production audit, 2026-10-10 (catalog queries and `supabase_migrations.schema_migrations` only; no customer rows read).
Status: **PLAN — not executed.** Every step below changes production metadata or schema and requires explicit owner approval.

## Why

Several migrations were applied to production directly (SQL editor or MCP) under a different version or name than the file in `supabase/migrations/`. The history table therefore does not match the repository, and `supabase db push` would try to re-run files whose effects already exist.

## State on 2026-10-10

### A. Same change, different version (history only — no schema change needed)

| Production version | Production name | Repository file |
|---|---|---|
| 20260915060159 | optimize_sessions | 20260915090000_optimize_sessions.sql |
| 20260919234220 | profiles_onboarding_step | 20260919120000_profiles_onboarding_step.sql |
| 20260919234507 | horizon_draft_review_status_fix | 20260920090200_horizon_draft_review_status_fix.sql |
| 20260924223439 | profiles_onboarding_insert_grant | 20260925013000_profiles_onboarding_insert_grant.sql |
| 20260925052453 | profiles_onboarding_update_id_grant | 20260925020000_profiles_onboarding_update_id_grant.sql |

### B. One production entry covering several repository files

`20260919234406 horizon_case_engine_runtime_fix` is a combined reconciliation that applied the effects of:

- `20260919150000_horizon_case_engine.sql`
- `20260920090000_horizon_audit_events_reconcile.sql`
- `20260920090100_horizon_case_engine_rls_policies.sql` — **partially**: 10 of 11 policies exist; `source_documents_update_own` and the column grant `update (status) on source_documents to authenticated` are missing. No current code path is affected, because every `source_documents` update runs through the server-side admin client. The file is idempotent (guarded `create policy`), so applying it adds only the missing pieces.

### C. Applied in production, repository file restored by this change

| Version | Name | Repository file |
|---|---|---|
| 20260915101407 | profile_financial_write_grants | added verbatim from production history |
| 20260916023116 | add_vzg_household_rpc | added verbatim from production history |

### D. Effects present in production, no history entry

| Repository file | Evidence in production |
|---|---|
| 20260916000000_contact_leads_table.sql | `public.leads` exists |
| 20260916070000_unified_leads_public_and_authenticated.sql | `leads_user_id_idx` exists |
| 20260928090000_audit_events_insert_grant_restore.sql | `authenticated` holds INSERT on `audit_events` |
| 20261009090000_user_email_connections.sql | table + 4 owner policies exist |

### E. Not applied in production (real schema/privilege difference)

| Repository file | Effect when applied |
|---|---|
| 20261010090000_affiliate_locked_to_service_role.sql | removes anon/authenticated privileges on the 4 affiliate tables |
| 20261010100000_fk_covering_indexes.sql | 18 covering indexes |
| 20261010101000_disable_unused_pg_graphql.sql | drops `pg_graphql`; also remove `graphql_public` from Settings → API → Exposed schemas |
| 20261010110000_revoke_anon_table_grants_and_dead_storage_policies.sql | (pending PR) anon grants + dead storage policies |

## Proposed procedure (owner-run, in order)

1. **Backup**: confirm a recent PITR / daily backup exists in the dashboard.
2. **Apply group E** (and the missing part of B) in the SQL editor, one file at a time, in version order:
   `20260920090100`, `20261010090000`, `20261010100000`, `20261010101000`, then `20261010110000` once merged. Each file is idempotent and self-checking.
3. **Align history** with the Supabase CLI (linked to the canonical project):

   ```bash
   # A: replace production versions with repository versions
   supabase migration repair --status reverted 20260915060159 20260919234220 20260919234507 20260924223439 20260925052453
   supabase migration repair --status applied  20260915090000 20260919120000 20260920090200 20260925013000 20260925020000
   # B: the combined entry is replaced by the three repository files
   supabase migration repair --status reverted 20260919234406
   supabase migration repair --status applied  20260919150000 20260920090000 20260920090100
   # D: effects already present
   supabase migration repair --status applied  20260916000000 20260916070000 20260928090000 20261009090000
   # E: only if step 2 was done in the SQL editor instead of `db push`
   supabase migration repair --status applied  20261010090000 20261010100000 20261010101000
   ```

4. **Verify**: `supabase migration list` shows local = remote for every row; `get_advisors` (security + performance) shows the affiliate, GraphQL and unindexed-FK findings cleared.

`migration repair` edits only the history table; it never runs or reverts SQL.
