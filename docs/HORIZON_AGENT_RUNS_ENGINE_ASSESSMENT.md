# HORIZON Agent Runs Engine — compatibility and architecture assessment

Status: **ASSESSMENT (documentation + prepared, unapplied SQL). No runtime code, no dependency, no migration applied.**
Base: `main` @ `e1afa23` (Phase 2.1 — Atomic Service Request provisioning artifacts, PR #167).
Companion: `supabase/prepared/20261107000000_horizon_agent_runs_engine.sql` (prepared),
`supabase/tests/rls/horizon_agent_runs_engine_isolation.sql` (prepared),
`lib/horizon/agent-runs/migration-contract.test.ts` (runnable contract test).

This document does not authorize implementation. It records measured facts, a decision and the
blockers that stop implementation under the current governance.

---

## 1. Scope declaration (PROJECT_RULES / AI_WORKFLOW)

```text
ACTIVE_PHASE:
  NONE for this task. The Agent Runs Engine has no phase identifier in
  docs/HORIZON_MASTER_MAP.md §1. The active sequence is P0–P17; the highest
  implemented phase record is P17 plus the N0–N7 navigation work. The engine is
  not one of those.

ALLOWED_FILES:
  docs/HORIZON_AGENT_RUNS_ENGINE_ASSESSMENT.md        (new, documentation)
  supabase/prepared/20261107000000_horizon_agent_runs_engine.sql   (new, PREPARED)
  supabase/tests/rls/horizon_agent_runs_engine_isolation.sql       (new, PREPARED)
  lib/horizon/agent-runs/migration-contract.test.ts   (new, contract test only)

FROZEN_FILES / SYSTEMS:
  P0 governance; P2 auth/onboarding; P5 case engine; P6 document intake/OCR;
  P7 case assistant; P8 draft/review/approval; P9 official PDF form engine;
  P11 email/send; P12–P17 modules; N0–N7 navigation. These are DONE/VERIFIED.
  None is modified. `public.cases`, `audit_events`, `extracted_facts`,
  `case_messages` and the `platform_*` legacy family are untouched.

OUT_OF_SCOPE:
  - Any runtime adapter (lib/horizon/agent-runs/adapter.ts and siblings)
  - Any new API route, worker process, cron entry or GitHub Actions workflow
  - Any workflow-engine dependency (Hatchet, DBOS, Trigger.dev) in package.json
  - Any production migration apply, RLS change, or environment variable
  - Any change to Alpha Team routing, specialist SOPs, the Case Assistant,
    the document/OCR pipeline, approvals, release or the action engine
```

### Why this is an assessment and not an implementation

`docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md` already scopes the execution layer as future work and
gates it explicitly:

> "### C. Persistent runs
> Добавяне на additive persistence за `agent_runs`/`agent_steps` **само след одобрение на
> schema/RLS промяната**."

> "### D. Event-driven loop
> … Тази автоматизация още не е включена в production и трябва да мине през отделен review на
> event idempotency и notifications."

`docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md` §7 repeats the gate:

> "Това не въвежда нова база, RLS правило, интеграция, browser worker или външно изпращане.
> Такива действия остават бъдещ етап и **изискват отделно одобрение за schema/RLS** …"

`PROJECT_RULES.md` §Change Scope: "Do not modify business logic, schema, auth, or infrastructure
unless the task explicitly requires it." `README.md` §Database: "Schema, RLS, grants, and migrations
require an explicit owner approval and are applied through a reviewed migration file — never through
an agent tool."

The schema/RLS approval named by both blueprints has not been granted. Therefore this task stops at
the audit, produces the assessment, and prepares — but does not apply — the additive schema. The
prepared SQL follows the repository's existing `supabase/prepared/` convention, which `README.md`
documents as SQL "that are not applied by the normal migration flow".

---

## 2. Current implementation status (measured on `main` @ `e1afa23`)

Documentation is not working code. Each row below was read from the repository, not from the
blueprint.

| Layer | Exists on `main` | Evidence |
| --- | --- | --- |
| Alpha Team registry, autonomy ladder, deterministic routing, task plan | YES | `lib/horizon/agent/team.ts` (`ALPHA_TEAM_VERSION = "alpha-team-v1"`, 7 agents, `planAlphaTask`) |
| Versioned SOP/skill contracts | YES | `lib/horizon/agent/skills.ts` (`getAlphaSkillContracts`, `assertAlphaSkillContracts`), `skills/*/*.md` (7 files) |
| Deny-by-default agent safety policy | YES | `lib/horizon/agent/safety.ts` (`evaluateHorizonAgentOperation`, 11 operations, `agent_policy.*` audit names) |
| Control-plane API (`GET` manifest, `POST` plan) | YES | `app/api/horizon/alpha-team/route.ts` |
| Case + document ownership validation for the plan | YES | `app/api/horizon/alpha-team/route.ts` via `repository.loadCaseContext(caseId)`; foreign document → `DOCUMENTS_NOT_FOUND` 404 |
| Canonical case engine + owner-scoped RLS | YES | `lib/horizon/case/repository.ts`, `supabase/migrations/20260920090100_horizon_case_engine_rls_policies.sql` |
| Draft → review → approval (hash-bound) | YES | `lib/horizon/case/approval.ts`, `release.ts`, `review-actions.ts` |
| Audit spine with idempotency keys | YES | `audit_events` + `20261106160000_service_request_artifact_idempotency.sql` |
| Service-request provisioning with DB-level idempotency | YES | `lib/horizon/service-requests/case-provisioning.ts`, `20261105120000_service_request_id_idempotency.sql` |
| **Persistent run/step state (`agent_runs`, `agent_steps`)** | **NO** | `grep -rn "agent_run" supabase/` → 0 matches; no such table in any migration |
| **Event queue / worker / scheduler / outbox** | **NO** | No queue, worker, `setInterval`, `pg_cron`, `pg_net` or Realtime subscription in `lib/`, `app/`, `scripts/` or `supabase/migrations/` |
| Background execution model today | Cron → authenticated HTTP route, synchronous | `.github/workflows/notifications.yml` → `app/api/notifications/run/route.ts`; `.github/workflows/affiliate-reconcile.yml` → `app/api/affiliate/reconcile/route.ts` |
| Operator console for runs | NO | No route renders run state; `docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md` §E lists it as future |

**Conclusion:** the Conductor, the SOP/skill contracts, the safety policy, the ownership validation
and the case spine all exist and are tested. The durable execution layer — persistent runs, queues,
retries, worker recovery, observability — does not exist. That gap is exactly the target of this
task, and exactly what is blocked on the schema/RLS approval.

---

## 3. Engine evaluation

### 3.1 Measured facts

Facts below were read from each project's own repository, published documentation and the npm
registry on 2026-11-06. Nothing is taken from marketing pages.

| Dimension | Hatchet | DBOS Transact (TS) | Trigger.dev |
| --- | --- | --- | --- |
| License | MIT | MIT | Apache-2.0 |
| Server SDK | `@hatchet-dev/typescript-sdk` 1.46.1, `engines.node >= 22` | `@dbos-inc/dbos-sdk` 5.4.0, `engines.node >= 20` | `@trigger.dev/sdk` 4.8.3, `engines.node >= 18.20.0` |
| Runtime dependencies | 16 packages incl. `nice-grpc`, `protobufjs`, `@connectrpc/*` | 5 packages: `pg`, `yaml`, `commander`, `superjson`, `serialize-error` | 5 packages incl. `@opentelemetry/*`; real work runs in a separate worker image |
| Durability store | Postgres **plus** a message queue | Postgres only | Postgres + Redis + object storage + container registry |
| Self-host services | API server, engine, Postgres, RabbitMQ (NATS in the dev compose), dashboard | none beyond Postgres | webapp, Postgres, Redis, supervisor/worker, Docker socket proxy |
| Documented minimum footprint | "Hatchet Lite — single docker image (development, testing, or low-throughput production)"; production = Docker Compose multi-container | no separate server: "There's no separate orchestration server and no infrastructure required besides Postgres." | webapp "3+ vCPU 6+ GB RAM"; worker "4+ vCPU 8+ GB RAM" |
| Postgres/Supabase fit | works against Postgres; queue broker is separate | explicitly documented for Supabase | works against Postgres; still needs Redis + object storage |
| Bundler compatibility | SDK is a normal npm package | **must not be bundled** by Webpack/Vite/esbuild etc. | SDK is a normal npm package; tasks deploy to the platform |
| Human-in-the-loop pause/resume | durable sleep + durable event waits | durable notifications + workflow signals | waitpoints / `wait.forToken` |
| Operator UI | built-in dashboard | requires **Conductor** (separate control plane, recommended for production) | built-in dashboard |

### 3.2 Decisive constraints for HORIZON

1. **Footprint vs the current infrastructure.** Production is a single Render web service plus
   Supabase (Free plan until the first 100 active users — `docs/PRODUCTION_READINESS_AUDIT_2026-10-21.md`).
   Hatchet needs a second Postgres, RabbitMQ and its own API/engine/dashboard; Trigger.dev needs
   ≥7 vCPU and ≥14 GB RAM split across two machines plus Redis and object storage, and its own
   self-hosting guide warns the Docker Compose path "alone is unlikely to result in a
   production-ready deployment". Both are larger than the workload justifies.
2. **DBOS is the only one that adds no service.** It is the lightest option by a wide margin and is
   explicitly documented to run on Supabase. Its one measured integration cost is real and
   relevant here: DBOS "cannot be bundled with JavaScript or TypeScript bundlers (Webpack, Vite,
   Rollup, esbuild, Parcel, etc.) and must be treated as an external library". This repository's
   Next.js build (Turbopack) would have to mark it `serverExternalPackages` (the same mechanism
   already used for `@napi-rs/canvas`, `pdfjs-dist`, `tesseract.js` in `next.config.mjs`) and run
   the worker as a separate, non-bundled Node entrypoint on Render.
3. **The queue itself is already solved in this repository.** Duplicate-safe work claiming does not
   need a broker. The repository already uses owner-scoped partial unique indexes
   (`cases_owner_service_request_id_uniq`) plus per-artifact idempotency keys, and already runs
   bounded background work as "external cron → authenticated route". A Postgres outbox with
   `SELECT … FOR UPDATE SKIP LOCKED`, a bounded attempt counter and a dead-letter status is the same
   pattern at a smaller footprint.
4. **A second AI pipeline is explicitly forbidden.** The target flow keeps Alpha Team as Conductor
   and the existing Case Assistant as the execution surface. None of the three engines is a
   substitute for either; all three are only durability/queue infrastructure.
5. **The project's own safety rule forbids the obvious shortcut.** `docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md` §4: "Ако бъде добавен истински agent worker, той трябва да пише през каноничния helper, под проверено owner/RLS правило; **не се добавя service-role bypass**." A worker that claims work across owners with a service-role key would violate that rule. This must be decided before any worker exists.

### 3.3 Recommendation

**Do not add a workflow-engine dependency at this stage.**

- **Primary recommendation (smallest footprint that meets every stated requirement): a minimal
  native PostgreSQL implementation on the existing case spine.** One outbox/run table pair, owner-scoped
  RLS, `SKIP LOCKED` claiming, bounded attempts with exponential backoff, a terminal `dead_letter`
  state, and reuse of the existing `audit_events` spine for lifecycle transitions. This satisfies
  durable execution, queues, retries, run state, crash recovery and observability without a new
  service, a new dependency, a bundler constraint or a second source of truth. The prepared SQL in
  this change is exactly that schema.
- **Fallback if the owner later requires a full durable-workflow engine:** **DBOS Transact** is the
  only measured candidate that adds no infrastructure beyond the Postgres already in use, is MIT,
  fits the Node version already in `package.json` (`>=22.13.0`), and is explicitly documented for
  Supabase. Its costs are the non-bundlable library constraint and a separate Render worker service.
- **Not recommended:** Hatchet (adds RabbitMQ + a second Postgres + its own control plane) and
  Trigger.dev (largest footprint, own worker image, self-hosting guide disclaims production
  readiness). Neither is justified by HORIZON's bounded event volume.

**Only one engine will ever be integrated.** This assessment selects none for immediate integration.

---

## 4. Target architecture (unchanged from the brief)

```text
HORIZON API
→ Alpha Team / Conductor            (lib/horizon/agent/team.ts — exists)
→ Agent Runs Engine                 (durable execution — NOT IMPLEMENTED, blocked)
→ Specialist Agent                  (skills/*/*.md SOP contracts — exist)
→ Existing HORIZON Case Assistant   (app/api/horizon/cases/{id}/assistant — exists)
→ Quality & Provenance Gate         (lib/horizon/agent/safety.ts, quality-safety agent — exists)
→ User Review                       (P8 review — exists)
→ User Approval                     (P8 hash-bound approval — exists)
→ Existing Action Engine            (P11 send / P14 letter / P9 forms — exist)
```

The Agent Runs Engine is inserted between the Conductor and the specialist execution. It owns
durable execution, scheduling, queues, retries, run state, worker recovery and execution
observability. It owns nothing else. It must not re-implement the case model, the document
pipeline, the assistant, approvals or the action engine, and it must not become a second source of
truth: every run and step references existing HORIZON entities by id.

---

## 5. Prepared persistence model

The prepared migration (`supabase/prepared/20261107000000_horizon_agent_runs_engine.sql`) is
**additive and unapplied**. It creates three tables and touches no existing object.

### `agent_runs`

`id, owner_id, case_id, service_request_id, trace_id, status, objective, lead_agent,
idempotency_key, prompt_version, model_version, skill_version, input_references,
output_references, error_code, error_message_safe, attempt, max_attempts, next_attempt_at,
started_at, completed_at, created_at, updated_at`

- `unique (owner_id, idempotency_key)` — duplicate run creation is refused by the database.
- `unique (owner_id, trace_id)` — one trace per run, so trace correlation cannot be spoofed.
- `foreign key (case_id, owner_id) references public.cases(id, owner_id) on delete cascade` —
  the same composite-FK technique `audit_events` already uses. It makes binding a run to another
  owner's case impossible at the database level, not merely in application code.
- `owner_id references auth.users(id) on delete cascade`.

### `agent_steps`

`id, run_id, owner_id, step_key, agent_id, status, attempt, input_reference, output_reference,
error_code, error_message_safe, started_at, completed_at, created_at, updated_at`

- `unique (run_id, step_key, attempt)` — a retry is a new attempt, never an overwrite of history.
- `foreign key (run_id, owner_id) references public.agent_runs(id, owner_id) on delete cascade` —
  a step cannot claim a run owned by someone else.

### `agent_run_events` (outbox / queue)

`id, owner_id, run_id, event_type, idempotency_key, payload, status, attempt, available_at,
last_error_code, processed_at, created_at, updated_at`

- `event_type` is constrained to the six required types:
  `SERVICE_REQUEST_CREATED`, `DOCUMENT_READY`, `CASE_UPDATED`, `DEADLINE_APPROACHING`,
  `USER_APPROVAL_GRANTED`, `USER_APPROVAL_REJECTED`.
- `unique (owner_id, idempotency_key)` — duplicate event delivery is refused by the database.
- `status in ('received','processing','processed','dead_letter')` — the terminal failure state is
  `dead_letter`, which is the required dead-letter equivalent.
- `index (status, available_at)` — the worker claim path (`SKIP LOCKED`, ordered by `available_at`).
- `foreign key (run_id, owner_id) references public.agent_runs(id, owner_id) on delete cascade`.

### Security posture of the prepared schema

- RLS **enabled** on all three tables.
- Owner-scoped policies only: `select`, `insert`, `update` scoped `to authenticated` with
  `(select auth.uid()) = owner_id`. **No delete policy** — matching the case spine, where deletion
  cascades from the parent.
- Column-scoped grants only; no table-wide grant; **no `anon` access**; **no `service_role` grant**.
  The last point is deliberate: `docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md` §4 forbids adding
  a service-role bypass for an agent worker. Whether the dispatcher runs per-owner under RLS or as an
  explicitly authorized service-role process is an owner decision (see §7).
- No destructive statement: no `drop`, no `delete`, no `truncate`, no `rename`.

### Lifecycle audit

Important transitions are recorded on the existing `audit_events` spine through
`CaseEngineRepository.appendAudit` — no new audit table. Proposed action names, consistent with the
existing `agent_policy.*` vocabulary: `agent_run_created`, `agent_run_started`, `agent_run_paused`,
`agent_run_resumed`, `agent_run_cancelled`, `agent_run_retried`, `agent_run_completed`,
`agent_run_dead_lettered`, `agent_step_started`, `agent_step_completed`.

---

## 6. Event processing contract (design, not implemented)

Bounded and deterministic. No uncontrolled autonomous loop.

| Requirement | Design |
| --- | --- |
| Event validation | `event_type` constrained by CHECK; payload validated by a zod schema at the producer boundary (the repository already uses zod in `app/api/service-requests/route.ts` and `app/api/horizon/alpha-team/route.ts`) |
| Idempotent consumption | `unique (owner_id, idempotency_key)`; the consumer treats `23505` as "already handled" |
| Retry policy | bounded `attempt` / `max_attempts` with exponential `next_attempt_at` backoff; the same bounded pattern the repository already uses for provisioning |
| Dead-letter | terminal `status = 'dead_letter'` with `last_error_code`; a dead-lettered event is reported, never hidden |
| Worker health | the existing cron→route model already has a health surface (`/api/health`); a worker adds a heartbeat row, not a new endpoint |
| Graceful shutdown | claim-per-event with `SKIP LOCKED` and a visibility timeout so a killed worker's event returns to `received` |
| Crash recovery | a stale `processing` event (past its visibility timeout) is reclaimed on the next pass |
| Concurrency limits | bounded batch size per pass; `SKIP LOCKED` prevents two workers claiming one event |
| Execution timeouts | per-run `started_at`/`completed_at` plus a deadline; an exceeded deadline is a terminal error, not a silent stall |
| Structured logs | stable ids only: `run_id`, `trace_id`, `case_id`, `service_request_id`, `step_key`. No document content, no prompts, no secrets |
| Trace correlation | `trace_id` on the run, propagated into the existing `audit_events` metadata |

**Hard boundaries carried over unchanged:** agents may not modify their own permissions, bypass
`safety.ts`, or execute arbitrary tools. Every external action stays behind the existing P8 approval
and the P11/P9/P14 action engines. The safety policy already refuses `send_external`,
`sign_or_accept_contract` and `access_authenticated_account` outright.

---

## 7. Blockers (nothing below was worked around)

1. **No authorized phase.** The engine is not in the P0–P17 sequence, and both blueprints gate
   persistent runs on an explicit owner schema/RLS approval. **Owner decision required.**
2. **Schema/RLS approval not granted.** `README.md` and both blueprints require it before any
   migration is applied. The prepared SQL is therefore not applied and no migration was run.
3. **Dispatcher authorization model undecided.** Per-owner RLS dispatcher vs an explicitly
   authorized service-role dispatcher. The safety blueprint forbids the service-role bypass unless
   the owner decides otherwise. **Owner decision required.**
4. **No isolated Supabase staging project.** The schema was validated against a disposable local
   PostgreSQL 15 container (§8.2), but not against a Supabase staging project, so Supabase's own
   PostgREST/GoTrue role and JWT path remains unverified. `supabase/tests/rls/horizon_agent_runs_engine_isolation.sql`
   is reported as *passing on local Postgres*, not as *verified on Supabase*.
5. **Worker hosting is undecided.** If a separate worker is chosen, Render needs a second service and
   its resource profile must be approved. No production environment variable or service was changed.

---

## 8. What was verified, and how

### 8.1 Repository checks

| Check | Status |
| --- | --- |
| `tsc --noEmit` | run — see the pull request for the exact result |
| `eslint .` | run — see the pull request |
| `vitest run` incl. the new contract test | run — see the pull request |
| `next build` | run — see the pull request |
| `git diff --check` | run — see the pull request |

### 8.2 Real-database validation of the prepared SQL (disposable only)

The prepared migration and its RLS isolation script were executed against a **disposable local
PostgreSQL 15 container** (`postgres:15`), with a minimal stand-in for `auth.users`, `auth.uid()`,
the `anon`/`authenticated`/`service_role` roles and the reduced `public.cases` spine
(`unique(id, owner_id)`). This is not the production project and not Supabase itself; it is a local
Postgres that reproduces the objects the schema depends on.

Result: the migration applies cleanly, is safe to re-run, and the isolation script passes every
assertion — owner read isolation, cross-owner `UPDATE` blocked, cross-owner case binding refused by
the composite FK, spoofed-owner insert refused by `WITH CHECK`, duplicate run refused by the unique
key, duplicate event refused by the unique key, invalid event type refused by the CHECK, retry
appended as a new attempt, and `anon` denied on all three tables.

**This validation found and fixed three real defects that static review and unit tests had missed:**

1. **A missing unique constraint.** The composite foreign key
   `agent_steps(run_id, owner_id) → agent_runs(id, owner_id)` cannot be created unless `agent_runs`
   has a unique constraint on exactly `(id, owner_id)`. The first run failed with
   `there is no unique constraint matching given keys for referenced table "agent_runs"`. Fixed by
   adding `constraint agent_runs_id_owner unique (id, owner_id)`.
2. **Every policy created as a `SELECT` policy.** The first draft listed all nine policy names in a
   single loop that always emitted `for select`. The insert and update policies were therefore
   silently created as select policies, and a legitimate insert failed with
   `new row violates row-level security policy for table "agent_runs"`. Fixed by giving each command
   its own loop, and locked in by a regression assertion in the contract test.
3. **An incomplete step insert grant.** `grant insert (run_id, owner_id, step_key, agent_id,
   attempt, input_reference)` omitted `status`, so a step insert failed with
   `permission denied for table agent_steps`. Fixed by adding `status` to the granted columns.

The isolation script was then **mutation-tested** to prove it is not vacuous: setting the select
policy to `using (true)` makes it fail with `A sees 2 runs, expected 1`, and granting `anon` a select
on `agent_runs` makes it fail with `anon read agent_runs`. Both mutations were reverted.

### 8.3 What this does not prove

| Check | Status |
| --- | --- |
| Prepared SQL applied to the production Supabase project | **NOT RUN** (owner approval required) |
| RLS proven against Supabase's PostgREST/GoTrue stack | **NOT RUN** — validated against local Postgres only; Supabase's own JWT claim path and role grants were not exercised |
| Any production change, deployment or migration | **NOT MADE** |

---

## 9. Infrastructure and deployment notes (documentation only)

Nothing below was applied. No production environment variable, service or deployment was changed.

**Current production shape.** One Render web service built from GitHub `main`, plus the Supabase
project `mteguzgbiuexmdcrqjaj` (`vzg-plattform-deutschland`, `eu-central-1`,
`supabase/project.json`). Recurring work runs as GitHub Actions cron → an authenticated HTTP route
(`.github/workflows/notifications.yml`, `.github/workflows/affiliate-reconcile.yml`), guarded by
`NOTIFICATIONS_CRON_SECRET` and rejected with `401` when unauthenticated.

**Option A — native Postgres worker (recommended).** Reuses the existing cron→route pattern: the
route claims due events with `SELECT … FOR UPDATE SKIP LOCKED`, bounded batch size, and returns. No
new Render service, no new dependency, no bundler change. If the owner later prefers a long-running
process, a second Render Background Worker can run the same claim loop; its resource profile must be
approved first.

**Option B — DBOS worker (fallback).** Requires `@dbos-inc/dbos-sdk` in `package.json`,
`DBOS_SYSTEM_DATABASE_URL` pointing at a system database (documented to work with Supabase), the
library added to `next.config.mjs` `serverExternalPackages` because it cannot be bundled, and a
separate non-bundled Node worker entrypoint deployed as its own Render service.

**Option C — Hatchet or Trigger.dev.** Requires additional self-hosted services (Hatchet: RabbitMQ
and its own Postgres plus a control plane; Trigger.dev: ≥7 vCPU / ≥14 GB RAM across webapp and
worker, plus Redis and object storage). Their resource and maintenance burden is documented in §3
and is not justified by HORIZON's bounded event volume.

**Environment variables.** None is added by this change. A future worker would need its own
connection configuration; the existing `SUPABASE_SECRET_KEY` / `NOTIFICATIONS_CRON_SECRET` are not
reused for agent runs, and no secret is written into any file, fixture or log.

---

## 10. Sources

- Hatchet `LICENSE`, repository `hatchet-dev/hatchet`:
  <https://github.com/hatchet-dev/hatchet/blob/main/LICENSE> — "MIT License / Copyright (c) 2023-present Hatchet Technologies Inc."
- Hatchet self-hosting documentation: <https://docs.hatchet.run/self-hosting> —
  "Database - PostgreSQL for storing workflow state and metadata / Message Queue (optional) - RabbitMQ
  for inter-service communication and high-throughput real-time updates / Dashboard - Web UI for
  monitoring workflows and debugging"; "Docker: Hatchet Lite - Single docker image with bundled engine
  and API (development, testing, or low-throughput production)".
- Hatchet `docker-compose.yml`: <https://github.com/hatchet-dev/hatchet/blob/main/docker-compose.yml> —
  services `postgres`, `pgbouncer`, `rabbitmq`, `nats`.
- DBOS `LICENSE`, repository `dbos-inc/dbos-transact-ts`:
  <https://github.com/dbos-inc/dbos-transact-ts/blob/main/LICENSE> — "MIT License / Copyright (c) 2023 DBOS, Inc."
- DBOS README: <https://github.com/dbos-inc/dbos-transact-ts> —
  "DBOS provides lightweight durable workflows built on top of Postgres."; "DBOS is entirely contained
  in this open-source library, there's no additional infrastructure for you to configure or manage."
- DBOS architecture: <https://docs.dbos.dev/architecture> —
  "There's no separate orchestration server and no infrastructure required besides Postgres."
- DBOS integration guide: <https://docs.dbos.dev/typescript/integrating-dbos> —
  "Due to its internal workflow registry, the DBOS library and DBOS workflows cannot be bundled with
  JavaScript or TypeScript bundlers (Webpack, Vite, Rollup, esbuild, Parcel, etc.) and must be treated
  as an external library by these tools."
- DBOS FAQ: <https://docs.dbos.dev/faq> —
  "If you're using Supabase, only the `postgres` database is visible from the Supabase web console.
  You can use `postgres` as your system database …".
- DBOS system database reference: <https://docs.dbos.dev/explanations/system-tables> —
  "DBOS records application execution history in several system tables."
- Trigger.dev `LICENSE`, repository `triggerdotdev/trigger.dev`:
  <https://github.com/triggerdotdev/trigger.dev/blob/main/LICENSE> — "Apache License Version 2.0".
- Trigger.dev self-hosting overview: <https://trigger.dev/docs/self-hosting/overview> —
  "v3 is end of life. Trigger.dev 4.5.0 is the last version we officially support …".
- Trigger.dev Docker Compose guide: <https://trigger.dev/docs/self-hosting/docker> —
  "Warning: This guide alone is unlikely to result in a production-ready deployment."; "Webapp This
  machine will host the webapp, postgres, redis, and related services. 3+ vCPU 6+ GB RAM / Worker This
  machine will host the supervisor and all of the runs. 4+ vCPU 8+ GB RAM".
- npm registry metadata (read 2026-11-06):
  `@dbos-inc/dbos-sdk` 5.4.0 (MIT, `node >= 20`, deps `pg`, `yaml`, `commander`, `superjson`,
  `serialize-error`); `@hatchet-dev/typescript-sdk` 1.46.1 (MIT, `node >= 22`, 16 deps incl.
  `nice-grpc`, `protobufjs`); `@trigger.dev/sdk` 4.8.3 (MIT, `node >= 18.20.0`).

Repository evidence: `lib/horizon/agent/team.ts`, `lib/horizon/agent/skills.ts`,
`lib/horizon/agent/safety.ts`, `app/api/horizon/alpha-team/route.ts`,
`lib/horizon/case/repository.ts`, `lib/horizon/service-requests/case-provisioning.ts`,
`supabase/migrations/20260920090100_horizon_case_engine_rls_policies.sql`,
`supabase/migrations/20260920090000_horizon_audit_events_reconcile.sql`,
`supabase/migrations/20261105120000_service_request_id_idempotency.sql`,
`supabase/migrations/20261106160000_service_request_artifact_idempotency.sql`,
`next.config.mjs`, `.github/workflows/notifications.yml`,
`.github/workflows/affiliate-reconcile.yml`,
`docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md`,
`docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md`,
`docs/PRODUCTION_READINESS_AUDIT_2026-10-21.md`, `README.md`.
