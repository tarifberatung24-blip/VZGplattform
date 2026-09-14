# Supabase Consolidation Plan

## Decision

Use `ambhlmdrfsgdbbljjsic` (`kintex-assistant-eu`, `eu-central-1`) as the **single canonical Supabase project** for VZGplattform and the VZGoffice module. Keep the Frankfurt project as the destination because it is healthy, currently empty of user data, and already contains the assistant domain schema. Do not delete or modify the US project until the application is cut over and the exported backups are verified.

## Read-only audit result

| Project | Region | Auth users | Relevant data | Current role |
|---|---:|---:|---|---|
| `ambhlmdrfsgdbbljjsic` | `eu-central-1` | 0 | 0 assistant rows; assistant schema exists | Destination |
| `sophzmteuemggqlstebw` | `us-east-1` | 6 | 6 profiles, 6 households, 9 tax form registry rows; other business tables currently 0 | Source |

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

## Recommended architecture

Use **one Supabase project, one Auth, one Storage, one Postgres database**, but retain explicit domain boundaries during the first cutover:

1. `public` platform tables remain the customer dashboard domain: households, contracts, documents, deadlines, financial profiles, tax/benefit cases, and platform audit records.
2. Assistant tables become the office domain. The safest first migration is additive namespacing (`office_cases`, `office_source_documents`, `office_document_pages`, `office_case_messages`, `office_extracted_facts`, `office_correspondence_drafts`, `office_approvals`, `office_tasks`, `office_audit_events`, `office_usage_counters`) followed by a VZGoffice code update.
3. Both domains use the same `auth.users` identities and the same Frankfurt storage project. Every office row remains owned by `owner_id`; every platform row remains scoped by `household_id` plus `user_id` where already present.
4. No cross-domain automatic action is allowed. A case can produce a draft, but export/send still requires a current human approval hash.

This is safer than forcing two incompatible `cases`, `tasks`, `audit_events`, and `profiles` models into one destructive rename. Namespacing is reversible and keeps the first launch small.

## Migration phases

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

- Change only the canonical Supabase URL/project references in the deployment environment to Frankfurt.
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

**Audit complete. No production schema or data was changed.** The six source Auth users are disposable test accounts and are excluded from migration; Auth migration is no longer a blocker. The target is the correct long-term location, but a direct table merge is unsafe because the two repositories define incompatible domain models under the same table names. The next implementation step is the additive Frankfurt migration plus VZGoffice table namespacing, followed by a clean-account staging test.
