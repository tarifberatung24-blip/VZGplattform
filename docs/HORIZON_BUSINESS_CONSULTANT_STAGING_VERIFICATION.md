# HORIZON Business Consultant — staging verification record

Date: 2026-11-07. Authorisation: owner message *"HORIZON PR #172 — STAGING INTEGRATION
AUTHORIZATION"*. Scope: apply the Business Consultant migration to the **dedicated staging**
Supabase project, verify RLS and cross-user isolation there, and test the APIs against staging.

## Result: blocked before execution

**No dedicated staging Supabase project exists, and no credentials for one are available.**
Nothing was executed against any remote Supabase project. Production was not touched.

| Requirement | Status |
|---|---|
| Dedicated staging Supabase project | **does not exist** |
| Credentials for a staging project | **not available** |
| Management API reachable with the provided tokens | **no — HTTP 401** |
| Staging connection string / anon key / service-role key | **not available** |

### Evidence

1. `supabase/project.json` declares exactly one project: `mteguzgbiuexmdcrqajj`
   (`vzg-plattform-deutschland`, `eu-central-1`). `SUPABASE_CONSOLIDATION_PLAN.md` names it the
   **single canonical project** and marks every other reference (including
   `ambhlmdrfsgdbbljjsic`, `kintex-assistant-eu`) **legacy / superseded**. The canonical project
   is the production runtime, and production is explicitly not authorised.
2. `NEXT_PUBLIC_SUPABASE_URL` resolves to the canonical project, so the one reachable Supabase
   environment is production — not a staging target.
3. Both available management tokens are rejected:
   `GET https://api.supabase.com/v1/projects` returns `401 {"message":"JWT failed verification"}`
   with `SUPABASE_ACCESS_TOKEN` (JWT) and `401` with `SUPABASE_MANAGEMENT_TOKEN` (`sbp_…`).
   A token that cannot list projects cannot identify or reach a staging project either.
4. `docs/HORIZON_AGENT_RUNS_ENGINE_ASSESSMENT.md` §7.4 already records this same blocker for the
   Agent Runs Engine: *"No isolated Supabase staging project."* The condition has not changed.

### Why this was not worked around

The migration creates tables and enables RLS. Applying it to the only reachable project
(`mteguzgbiuexmdcrqajj`) would be a production schema change, which the authorisation forbids.
There is no third option: with no staging project and no credentials, the remaining choice is
"apply to production" or "stop". Stopping is the correct one.

## What was verified instead, and how

Everything below ran against a **disposable local PostgreSQL 17** (`postgres:17-alpine`) with a
Supabase-like harness (`supabase/tests/rls/README_agent_runs_local_harness.sql`, which provides the
`anon` / `authenticated` / `service_role` roles and `auth.uid()`). This is a local Postgres result,
**not** a Supabase result: Supabase's PostgREST / GoTrue role and JWT path remains unverified and is
called out as such.

The full migration chain was applied in order to a fresh database:
`kintex_assistant_baseline` → `horizon_case_engine` → `horizon_agent_runs_engine` →
`horizon_business_profiles` → `horizon_business_consultant`. All applied cleanly; 19 public tables
afterwards.

### Migration integrity

The migration is byte-identical to the one on PR #172 branch `feature/horizon-business-consultant`
(sha256 `29405987b55b6110885bc3fcf3fc61fdabbce91eb0b15c50bd85d9e6f38509e9`).

### Schema

| Table | Columns present |
|---|---|
| `business_diagnoses` | id, owner_id, profile_id, run_id, trace_id, status, model, prompt_version, content, input_references, created_at, updated_at |
| `business_playbook_actions` | id, owner_id, profile_id, diagnosis_id, horizon, action_key, title, description, priority, effort, expected_benefit, required_documents, dependencies, deadline, responsible, approval_required, status, postponed_until, evidence_class, created_at, updated_at |
| `business_documents` | id, owner_id, profile_id, document_id, case_id, category, expires_on, renewal_on, summary, created_at, updated_at |
| `business_finance_entries` | id, owner_id, profile_id, document_id, kind, category, amount_cents, currency, period_month, description, recurring, source, evidence_class, created_at, updated_at |

Module A columns on `business_profiles`: `business_services` and `business_tools`, both `ARRAY`
(`text[]`), consistent with the sibling `business_goals` / `business_challenges`.

### Additive only

`grep` over the migration finds no `DROP`, `TRUNCATE`, `DELETE`, `ALTER COLUMN`, `DROP CONSTRAINT`
or `RENAME`. Re-applying the migration to an already-migrated database succeeds (idempotent).
Because the change is additive and the object names are new, an existing schema and its data are
preserved — verified structurally on local Postgres, **not** verified against a staging dataset,
because no staging dataset exists.

### RLS enabled, anon denied, no delete

RLS is enabled on all four tables. Policies are `authenticated`-only `SELECT` / `INSERT` / `UPDATE`;
there is **no `DELETE` policy** and **no `anon` grant** on any of them.

### Cross-user isolation probes

Seven probes, run on a clean database. Every one behaved as required.

| # | Probe | Expected | Observed |
|---|---|---|---|
| 1 | `anon` reads / writes `business_diagnoses` | denied | `permission denied for table business_diagnoses` |
| 2 | B reads; A reads | B 0, A 1 | B 0, A 1 |
| 3 | B updates A's row; A's status after | 0 rows changed; status `ready` | 0 rows changed; `ready` |
| 4 | A inserts a row pointing at **B's** profile | FK rejected | `violates foreign key constraint business_diagnoses_profile_owner_fk` |
| 5 | A deletes its own row | denied | `permission denied`; row still present |
| 6 | A supplies its own `id` on insert | denied | `permission denied` (column-level grant) |
| 7 | A inserts a second live diagnosis for the same profile | rejected | `duplicate key … business_diagnoses_profile_live_idx` |

Probe 4 is the owner-scoped foreign-key requirement: the composite `(id, owner_id)` FK makes
cross-owner attachment impossible in the database, not merely unlikely in application code.
Probe 6 shows the client cannot choose a primary key.

### RLS script is falsifiable

`supabase/tests/rls/horizon_business_consultant_isolation.sql` passes. To show the pass is
meaningful, RLS was disabled on `business_diagnoses` and the script re-run:

```
ERROR:  BC_RLS_FAILED: A sees 3 diagnoses, expected 1
```

RLS was restored and the script passed again. A script that passes with RLS off would prove nothing.

### Agent Runs Engine unaffected

`agent_runs`, `agent_steps` and `agent_run_events` all still have RLS enabled, their 9 policies are
intact, and the Agent Runs Engine isolation script still passes. `business_diagnoses.run_id`
references `agent_runs` — a nullable link that is the only coupling between the two modules.

### Repository checks

| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `eslint .` | pass |
| `vitest run --exclude 'scripts/**'` | 1933 passed, 8 skipped, 175 files |
| `next build` | pass; all 7 Business Consultant / profile routes emitted |
| `git diff --check` | pass |

The suite is run with `NEXT_PUBLIC_SUPABASE_URL` unset. With it set to the sandbox value, one
pre-existing test (`lib/documents/validation.test.ts` → "rejects a missing URL") fails, because
`isCanonicalSupabase()` defaults its argument to that environment variable. The test is untouched by
this work, fails identically on `origin/main` under the same environment, and passes when the
variable is unset. It is an environment sensitivity in the existing suite, not a regression.

### API integration — local only, auth not exercised

`next start` on a local build serves all seven routes. Each returns `503` to an unauthenticated
`GET`, not `401`:

```
[supabase-config] Supabase is not configured for this Preview.
Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
(or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in the Preview/Development environment.
```

The session helper returns `{ userId: null, service: null }` when Supabase is unconfigured, so the
route answers `503` before it can reach its own `401`. This is correct behaviour — a route that
cannot authenticate anybody must not report "authenticated". The `401` path is covered by the route
unit tests (`app/api/horizon/business-consultant/route.test.ts`, 16 tests). Real authenticated
requests against a live Supabase require a configured project, which is the blocked item.

### Live AI diagnosis — not tested

The diagnosis runner requires `GROQ_API_KEY`, which is **not set** in this environment. The runner
reports `ENGINE_NOT_CONFIGURED` rather than fabricating an answer, and that path is covered by
`lib/horizon/business-consultant/diagnosis.test.ts`. `OPENROUTER_API_KEY` is present but is wired
only to the unrelated web-search module, not to the HORIZON model path; repointing the model
provider would be an unauthorised change to the AI stack, so it was not done. **Live model output
was not produced or verified.**

## Remaining blockers

1. **No dedicated staging Supabase project.** Required for every staging item in the authorisation.
2. **No staging credentials.** Both management tokens return HTTP 401.
3. **No Supabase anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and no service-role key, so authenticated API calls
   against a real Supabase cannot be made here.
4. **No `GROQ_API_KEY`**, so the live diagnosis cannot be exercised.

## Next required owner decision

Choose one, and name it explicitly:

1. **Create or designate a staging Supabase project** and provide its credentials, then re-run this
   authorisation against it; or
2. **Authorise applying the migration to production** `mteguzgbiuexmdcrqajj`, accepting that this is
   the canonical production project and that the change is additive and idempotent; or
3. **Accept the local-Postgres evidence** recorded above as sufficient for this stage and leave the
   migration unapplied.

Nothing else in the authorisation is blocked. PR #172 remains open, draft and unmerged.
