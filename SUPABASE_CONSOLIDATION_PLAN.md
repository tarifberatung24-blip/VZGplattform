# Supabase Consolidation Plan

## Canonical project (ratified)

The **single canonical Supabase project** for VZGplattform is:

| Field | Value |
|---|---|
| Project ref | `mteguzgbiuexmdcrqajj` |
| Project name | `vzg-plattform-deutschland` |
| Region | `eu-central-1` |
| Runtime URL | `https://mteguzgbiuexmdcrqajj.supabase.co` |

This reflects the project the application already uses at runtime: `supabase/project.json` declares it, `lib/documents/validation.ts` enforces it in the upload guard, `scripts/supabase-check.mjs` validates it, and the deployed production bundle inlines `https://mteguzgbiuexmdcrqajj.supabase.co`. No runtime, environment, schema, database, migration, RLS, or deployment change is implied by this ratification.

`ambhlmdrfsgdbbljjsic` (`kintex-assistant-eu`) and `numyqalfphyrnedlfzfs` (`ai-home-office-v1-eu`) are **legacy / superseded** references retained only for migration history below. They are not canonical and must not be used for new configuration.

## Decision history — superseded target proposal (historical)

> **Superseded.** The following original decision proposed `ambhlmdrfsgdbbljjsic` as the target. It was never applied to `supabase/project.json` and is retained only as migration history.

> Use `ambhlmdrfsgdbbljjsic` (`kintex-assistant-eu`, `eu-central-1`) as the **single canonical Supabase project** for VZGplattform and the VZGoffice module. Keep the Frankfurt project as the destination because it is healthy, currently empty of user data, and already contains the assistant domain schema. Do not delete or modify the US project until the application is cut over and the exported backups are verified.

## Read-only audit result (historical)

| Project | Region | Auth users | Relevant data | Role at audit time | Current role |
|---|---:|---:|---|---|---|
| `mteguzgbiuexmdcrqajj` | `eu-central-1` | not audited | not audited | not yet designated | **Canonical runtime** |
| `ambhlmdrfsgdbbljjsic` | `eu-central-1` | 0 | 0 assistant rows; assistant schema exists | Destination (proposed) | **Legacy / superseded** |
| `sophzmteuemggqlstebw` | `us-east-1` | 6 | 6 profiles, 6 households, 9 tax form registry rows; other business tables currently 0 | Source | **Legacy / superseded** |

The target already contains the VZGoffice tables `profiles`, `cases`, `source_documents`, `document_pages`, `case_messages`, `extracted_facts`, `correspondence_drafts`, `approvals`, `tasks`, `audit_events`, and `usage_counters`. The source contains the VZGplattform tables including `households`, `contracts`, `documents`, `deadlines`, `financial_profiles`, tax and benefit tables, and an additive compatibility layer.

## Blocking incompatibilities

| Collision | Target assistant schema | Source platform schema | Safe decision |
|---|---|---|---|
| `profiles` | `id`, `locale`, `display_name`, six locales | `id`, `preferred_language`, names, financial completeness | Extend target profile additively; preserve existing assistant fields and map source profile fields into canonical fields. |
| `cases` | `owner_id`, assistant status/intent | `household_id`, platform status/category, missing information | Do not merge by column guessing. Add platform case fields to a canonical case model or create `platform_cases` during phase 1. |
| `documents` vs `source_documents` | Assistant source documents are case-scoped | Platform documents are household-scoped and linked to contracts/cases | Keep `source_documents` for assistant originals and `documents` for platform documents; add explicit cross-links only after user identity migration. |
| `tasks` | Assistant case tasks with `type`, `due_at` | Platform household tasks with broader lifecycle | Keep distinct initially, or rename assistant table to `office_tasks` in a later controlled refactor. |
| `audit_events` | Case/actor fields | Household/document/entity fields | Keep one append-only audit table only after a column-level superset migration is reviewed; otherwise use `office_audit_events` temporarily. |
| `approvals` and drafts | Hash-bound immutable assistant drafts | Household approval workflow | Preserve assistant hash model; add nullable household/case linkage only after the canonical case model is chosen. |

## Recommended architecture (historical — describes the superseded legacy target)

> **Historical.** This architecture assumed the legacy target `ambhlmdrfsgdbbljjsic` (referred to below as "Frankfurt"). It is retained for migration history and is **not** a description of the canonical project.

Use **one Supabase project, one Auth, one Storage, one Postgres database**, but retain explicit domain boundaries during the first cutover:

1. `public` platform tables remain the customer dashboard domain: households, contracts, documents, deadlines, financial profiles, tax/benefit cases, and platform audit records.
2. Assistant tables become the office domain. The safest first migration is additive namespacing (`office_cases`, `office_source_documents`, `office_document_pages`, `office_case_messages`, `office_extracted_facts`, `office_correspondence_drafts`, `office_approvals`, `office_tasks`, `office_audit_events`, `office_usage_counters`) followed by a VZGoffice code update.
3. Both domains use the same `auth.users` identities and the same Frankfurt storage project. Every office row remains owned by `owner_id`; every platform row remains scoped by `household_id` plus `user_id` where already present.
4. No cross-domain automatic action is allowed. A case can produce a draft, but export/send still requires a current human approval hash.

This is safer than forcing two incompatible `cases`, `tasks`, `audit_events`, and `profiles` models into one destructive rename. Namespacing is reversible and keeps the first launch small.

## Migration phases (historical — describe the superseded legacy target)

> **Historical.** These phases planned a cutover to the legacy target `ambhlmdrfsgdbbljjsic` ("Frankfurt"). They were not executed against the canonical project. Retained for migration history.

### Phase 0 — Freeze and backup

- Freeze writes to the US source during the final migration window.
- Export schema, `auth.users` metadata, storage object inventory, and all non-empty public tables from the source.
- Record row counts and SHA-256 checksums for every export.
- Keep the US project untouched as rollback source.

### Phase 1 — Additive target schema

- Apply a reviewed migration to Frankfurt that creates the missing platform tables and indexes from the platform migration history.
- Rename or copy the existing assistant tables into `office_*` names without deleting the originals until application verification passes. Prefer `ALTER TABLE ... RENAME` only in a maintenance window after VZGoffice code is updated, or create compatibility views if the client query surface requires it.
- Extend `profiles` through an explicit mapping migration, not `SELECT *`.
- Add RLS policies for every new table before enabling application traffic.
- Add household foreign keys only where the target row can be mapped deterministically.

### Phase 2 — Identity migration

The source contains six existing Auth users, confirmed by the read-only audit. The owner has identified them as disposable test accounts and has instructed that they must **not** be preserved. Therefore no `auth.users`, source `profiles`, `households`, or user-owned test rows will be migrated. The Frankfurt target remains clean and new production users will register there with fresh identities. Do not delete the source users automatically; retain the source project unchanged until the owner explicitly requests cleanup. The nine `tax_form_registry` rows are reference data, not user accounts, and can be migrated separately after a uniqueness check.

### Phase 3 — Data migration

Because the six source accounts are disposable test accounts, skip all user-owned source rows in the first production migration: profiles, households, family members, contracts, documents, deadlines, financial profiles, tax/benefit cases, and user audit rows. Migrate only approved non-user reference data, currently the nine `tax_form_registry` rows and their official-source dependencies, after a uniqueness and content review.

Assistant data is currently zero rows in Frankfurt and no assistant user data needs merging. After the office tables are namespaced, deploy the updated VZGplattform module code against Frankfurt and run end-to-end tests with a non-production test user.

### Phase 4 — Cutover

- Change only the canonical Supabase URL/project references in the deployment environment to the legacy target `ambhlmdrfsgdbbljjsic` (historical plan; the canonical project is now `mteguzgbiuexmdcrqajj`).
- Run health checks: Auth, profile read, household creation, document upload, contract CRUD, RLS isolation, assistant case creation, extraction, quota RPC, draft approval hash, and no-send-without-approval.
- Keep source read-only for the observation window.
- Roll back by restoring the previous environment variables if any critical test fails; do not reverse-migrate user data live.

### Phase 5 — Decommission later

Only after the observation window, verified backups, and explicit owner approval should the US project be archived or removed. Decommissioning is outside this migration pass.

## Required deliverables before any DDL is applied

- Reviewed additive target migration with explicit table/column names.
- Auth migration method selected and tested with one disposable account.
- Storage bucket/object migration manifest.
- Source-to-target UUID mapping manifest, encrypted outside Git.
- RLS test matrix for cross-user and cross-household access.
- Rollback runbook and final cutover checklist.

## Current status

**Audit complete. No production schema or data was changed.** The six source Auth users are disposable test accounts and are excluded from migration; Auth migration is no longer a blocker. A direct table merge between the legacy schemas is unsafe because the two repositories define incompatible domain models under the same table names.

**Canonical project ratified:** `mteguzgbiuexmdcrqajj` (`vzg-plattform-deutschland`, `eu-central-1`) is the single canonical Supabase project. This matches the current runtime configuration in `supabase/project.json`, the upload guard in `lib/documents/validation.ts`, the `scripts/supabase-check.mjs` validation, and the deployed production bundle. The previously proposed target `ambhlmdrfsgdbbljjsic` is legacy / superseded and is not canonical.

No schema, migration, RLS, environment, or deployment change is authorized by this document. Any future database work must target the canonical project and remains blocked until the owner explicitly authorizes it.
