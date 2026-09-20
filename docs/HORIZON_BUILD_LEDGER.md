# HORIZON by VZG — Build Ledger

Status: **IMPLEMENTATION STATUS LEDGER** (documentation only)
Companion to: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md)
Base: `main` @ `f6a8eb777e630106c934856a74de3796c1ad506c`

This ledger tracks implementation status per phase. It is evidence-based only.
Nothing is marked DONE because code exists. If a flow has not been verified end-to-end,
it is not DONE.

## Status vocabulary

```text
NOT_STARTED → AUDITED → PLANNED → IN_PROGRESS → TESTING → DONE → FROZEN
BLOCKED (external dependency prevents completion)
```

Legend for the columns used in every phase record:

- **ID** — phase identifier
- **SYSTEM** — phase name
- **TARGET ROUTES** — target route surface (from the Master Map)
- **CURRENT STATUS** — status vocabulary value, evidence-based
- **CURRENT IMPLEMENTATION** — what exists on `main` today
- **REUSE** — reusable assets
- **MISSING** — what is absent
- **DEPENDENCIES** — prerequisite phases/systems
- **BLOCKERS** — known blockers
- **DONE CRITERIA** — acceptance criteria
- **FROZEN** — freeze state
- **OWNER APPROVAL REQUIRED** — whether the owner must approve to proceed/publish

**No module is FROZEN.** No module is DONE. Freeze is granted only by explicit owner acceptance
after a module meets the full DONE definition.

---

## Ledger index

| ID | SYSTEM | CURRENT STATUS | FROZEN | OWNER APPROVAL REQUIRED |
| --- | --- | --- | --- | --- |
| P0 | MASTER MAP + GOVERNANCE | IN_PROGRESS | NO | YES |
| P1 | PUBLIC LAYER 0 | IMPLEMENTATION VERIFIED — OWNER/LEGAL REVIEW PENDING | NO | YES |
| P2 | AUTH + FIRST LOGIN + ONBOARDING | IMPLEMENTATION VERIFIED — RUNTIME VERIFICATION PENDING | NO | YES |
| P3 | HORIZON GUIDE | IMPLEMENTATION ADDED — RUNTIME VERIFICATION PENDING | NO | YES |
| P4 | HORIZON HOME + FIVE ENTRY MODULES | IMPLEMENTATION ADDED — RUNTIME VERIFICATION PENDING | NO | YES |
| P5 | SHARED CASE ENGINE | MODEL + REPOSITORY VERIFIED — RUNTIME VERIFICATION PENDING | NO | YES |
| P6 | DOCUMENT INTAKE / OCR / EXPLANATION | PARTIAL — ALL FIVE INPUT TYPES ACCEPTED, RUNTIME VERIFICATION PENDING | NO | YES |
| P7 | CONTEXT AI ASSISTANT | IMPLEMENTATION ADDED — RUNTIME VERIFICATION PENDING | NO | YES |
| P8 | DRAFT / REVIEW / USER APPROVAL | PARTIAL — REVIEW+APPROVAL SURFACE IMPLEMENTED, RUNTIME VERIFICATION PENDING | NO | YES |
| P9 | OFFICIAL PDF FORM ENGINE | NOT_STARTED | NO | YES |
| P10 | SIGNATURE ENGINE | NOT_STARTED | NO | YES |
| P11 | EMAIL CONNECTION + SEND ENGINE | NOT_STARTED | NO | YES |
| P12 | AGENTUR FÜR ARBEIT | NOT_STARTED | NO | YES |
| P13 | JOBCENTER | NOT_STARTED | NO | YES |
| P14 | KÜNDIGUNG | NOT_STARTED | NO | YES |
| P15 | STEUERERKLÄRUNG | AUDITED | NO | YES |
| P16 | UNTERLAGEN ERKLÄREN | AUDITED | NO | YES |
| P17 | CONTRACT MANAGEMENT | AUDITED | NO | YES |
| — | CAPITAL (PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE) | PRESERVED — NOT IN ACTIVE SEQUENCE | NO | YES (to resume) |

---

## PHASE 0 — MASTER MAP + GOVERNANCE

- **ID:** P0
- **SYSTEM:** Master map and development governance
- **TARGET ROUTES:** none (governance only)
- **CURRENT STATUS:** IN_PROGRESS
- **CURRENT IMPLEMENTATION:** `PROJECT_RULES.md`, `AGENTS.md`, `AI_WORKFLOW.md`,
  `DOCUMENT_FEASIBILITY_AUDIT.md`, `docs/TERRA_START.md`, `README.md`,
  `SUPABASE_CONSOLIDATION_PLAN.md`, `REPOSITORY_AUDIT_BG.md`.
  This task adds `docs/HORIZON_MASTER_MAP.md` and `docs/HORIZON_BUILD_LEDGER.md` and the
  DONE → FROZEN governance rules.
- **REUSE:** existing governance documents; canonical identity rules.
- **MISSING:** no prior canonical target map; no implementation ledger; no DONE → FROZEN model;
  no ACTIVE_PHASE / ALLOWED_FILES / FROZEN_FILES / OUT_OF_SCOPE declaration requirement.
- **DEPENDENCIES:** none.
- **BLOCKERS:** none.
- **DONE CRITERIA:** Master Map and Ledger exist; `PROJECT_RULES.md`, `AGENTS.md`, `AI_WORKFLOW.md`
  carry the governance rules; the canonical phase sequence is fixed; Capital is classified
  outside the active sequence; validation (`git diff --check`) passes; no application code,
  Supabase, package, lockfile, env, or deployment file changed.
- **FROZEN:** NO
- **OWNER APPROVAL REQUIRED:** YES — the owner accepts Phase 0 before Phase 1 starts.

---

## PHASE 1 — PUBLIC LAYER 0

- **ID:** P1
- **SYSTEM:** Public Layer 0
- **TARGET ROUTES:** `/{locale}` → `/`, `/how-it-works`, `/functions`, `/security`, `/contact`,
  `/auth/login`, `/auth/sign-up`, legal pages.
- **CURRENT STATUS:** IMPLEMENTATION VERIFIED — OWNER/LEGAL REVIEW PENDING
- **CURRENT IMPLEMENTATION:** public marketing and legal surfaces are available in BG/DE with
  HORIZON by VZG customer-facing branding. Public `/security` is a trust page; account/MFA
  security remains protected at `/protected/security`.
  Existing: `/{locale}` home, `/{locale}/how-it-works`, `/{locale}/contact`,
  `/{locale}/auth/login`, `/{locale}/auth/sign-up`, `/{locale}/impressum`,
  `/{locale}/datenschutz`, `/{locale}/agb`, `/{locale}/widerruf`, `/{locale}/affiliate-hinweis`.
  Additional legacy marketing routes: `/check`, `/uslugi`, `/produkte`, `/za-nas`, `/tarife`,
  `/zayavka`, `/anfrage`, `/angebote/{offer}`, `/email-generator`.
- **REUSE:** `GlobalHeader`, `GlobalFooter`, `legal-page`, `hero`, `site-header`, `site-footer`,
  `LanguageSwitcher`, `legal-profile.ts`, `/api/leads`, `lead-submit.ts`, PWA install pages.
- **MISSING:** a decision on the fate of the legacy marketing routes (no redirects yet);
  legal review of final Impressum/AGB/Datenschutz against HORIZON wording.
- **DEPENDENCIES:** P0.
- **BLOCKERS:** legal review by the owner/legal reviewer is required before public launch;
  `DOCUMENT_FEASIBILITY_AUDIT.md` records that a public launch with unfinished legal pages is blocked.
- **DONE CRITERIA:** every Layer 0 target route exists and is usable in each supported UI locale;
  branding is consistent with HORIZON by VZG; legal pages complete and reviewed; loading, error,
  and empty states present; real HTTP checks pass against production; no legacy route broken silently.
- **FROZEN:** NO

---

## PHASE 2 — AUTH + FIRST LOGIN + ONBOARDING

- **ID:** P2
- **SYSTEM:** Authentication, first login, onboarding
- **TARGET ROUTES:** `/{locale}/auth/login`, `/{locale}/auth/sign-up`,
  `/{locale}/onboarding/language`, `/{locale}/onboarding/profile`,
  `/{locale}/onboarding/tour`, `/{locale}/onboarding/finish`.
- **CURRENT STATUS:** IMPLEMENTATION VERIFIED — END-TO-END RUNTIME VERIFICATION PENDING (not DONE, not FROZEN)
- **CURRENT IMPLEMENTATION:** Supabase Auth with e-mail/password, Google OAuth, MFA.
  Handlers: `app/auth/callback/route.ts` (code exchange, MFA routing via `requiresMfa`,
  `sanitizeNextPath`), `app/auth/logout/route.ts`. Pages: login, sign-up, sign-up-success,
  error, forgot-password, update-password, mfa-verify. Session refresh in
  `lib/supabase/proxy.ts`; protected prefixes in `lib/supabase/auth-routing.ts`.
  Account security: `/{locale}/security` with `MfaSettings`.
  Profile: `/{locale}/profil` writes `profiles`; `ensureHousehold` creates the household.

  Sprint 1 additions (owner-authorized for P2):
  - Routes `/{locale}/onboarding/{language,profile,tour,finish}` with one renderer per step
    (`app/[locale]/onboarding/*/page.tsx`, `components/onboarding/steps.tsx`).
  - Deterministic pure state resolver `lib/onboarding/state.ts` (ordered
    `language → profile → tour → finish → completed`; NULL/unknown resolves to the first step).
  - Server guard `lib/onboarding/guard.ts` + reader `lib/onboarding/profile.ts`; proxy
    first-login gate and dashboard re-check; `/onboarding` added to the protected prefixes.
  - Additive migration `supabase/migrations/20260919120000_profiles_onboarding_step.sql`:
    adds `profiles.onboarding_step` (default `language`, CHECK on the five steps), backfills
    existing rows to `completed`, and adds column-level grants for `onboarding_step`,
    `first_name`, `last_name`, `preferred_language`, and the columns `profile-form` already
    writes (`employment_status`, `household_size`, `monthly_income`, `monthly_fixed_costs`,
    `completeness`, `updated_at`). No table-wide grant; no policy dropped or weakened.

  Defensive behaviour: an unreadable step is treated as the first step server-side, while the
  proxy gate is best-effort so a read failure can never lock a user out; the step is used to
  build a redirect only when it is a known value; auth-flow routes (account recovery, MFA) are
  excluded from the gate.
- **REUSE:** all auth pages and handlers, `auth-routing.ts`, `mfa-challenge`, `mfa-settings`,
  `profile-form`, `ensure_kintex_household` RPC, `profiles.locale` /
  `conversation_locale` / `output_locale`.
- **MISSING:** applied migration. The repository file exists but the change has NOT been applied
  to project `mteguzgbiuexmdcrqajj`; production `profiles` has no `onboarding_step` column
  (read-only PostgREST metadata check, 2026-09-19). Until it is applied, the onboarding upsert
  fails and Step 1 of DONE CRITERIA cannot be reached. Also missing: end-to-end runtime
  verification, which is blocked because no `.env` and no anon key are available in this
  environment.
- **DEPENDENCIES:** P0; consumes P1 public entry points.
- **BLOCKERS:** (1) applying the additive migration requires an authorized DB channel — the
  Management API PAT, DB connection string, and Supabase CLI are all absent here, and the
  available token is a service_role JWT that must not be used for DDL; (2) end-to-end
  verification needs Supabase URL + anon key.
- **DONE CRITERIA:** sign up → e-mail confirmation → login → first-login check → language →
  minimal profile → short click guide → dashboard works end-to-end; the tour runs once and is
  resumable; onboarding completion is persisted; all steps localized; tests and build pass;
  real verification performed. **Status: partially satisfied** — tests, typecheck, lint, i18n,
  and build pass; the end-to-end journey has not been run against a live Supabase.
- **FROZEN:** NO

---

## PHASE 3 — HORIZON GUIDE

- **ID:** P3
- **SYSTEM:** Persistent HORIZON Guide
- **TARGET ROUTES:** `/{locale}/guide` with task tree: understand a document, reply to an
  authority, fill an official form, cancel a contract, I do not know what to do.
- **CURRENT STATUS:** IMPLEMENTATION ADDED — 33 unit tests pass; runtime verification pending.
  (Earlier ledger revisions recorded this as NOT_STARTED; that was stale. The route, task tree and
  case-engine wiring exist and build.)
- **CURRENT IMPLEMENTATION:** `/{locale}/guide` (`app/[locale]/guide/page.tsx`) renders
  `components/guide/guide-chooser.tsx`: the five task-shaped entries (understand a document,
  reply to an authority, fill an official form, cancel a contract, I do not know what to do)
  plus the user's open cases, with empty, error and loading states and localized copy.
  `lib/horizon/guide/intents.ts` is the single vocabulary for intents, icons, module mapping,
  `cases.intent` mapping and case titles; `lib/horizon/guide/actions.ts` creates a canonical
  case through the P5 engine; `lib/horizon/guide/guard.ts` centralises auth and locale
  normalisation and redirects to login rather than throwing when Supabase is unconfigured.
  `components/layout/user-sidebar.tsx` links the guide permanently, so it stays reachable after
  onboarding. `unsure` routes to `general` rather than guessing a department.
- **REUSE:** `how-it-works` layout patterns, `module-page`, `guided-wizard` component,
  case intent vocabulary in `lib/office/supabase/database.ts`
  (`explanation`, `reply`, `complaint`, `application`, `objection`, `cancellation`,
  `document_request`, `reminder`, `free_email`).
- **MISSING:** runtime verification with an authenticated session; no route-level test exercising
  the chooser end to end.
- **DEPENDENCIES:** P1 (entry points), P2 (authenticated context), P5 (case creation).
- **BLOCKERS:** none known; runtime verification needs a configured Supabase instance.
- **DONE CRITERIA:** guide is permanently accessible after onboarding; all five task entries
  work; each entry routes into the shared case engine; localized; loading/error/empty states;
  tests, build, and real verification pass.
- **FROZEN:** NO

---

## PHASE 4 — HORIZON HOME + FIVE ENTRY MODULES

- **ID:** P4
- **SYSTEM:** HORIZON Home and the five entry modules
- **TARGET ROUTES:** `/{locale}/dashboard` with modules Agentur für Arbeit, Jobcenter,
  Kündigung, Steuererklärung, Unterlagen erklären, plus My Cases, Profile, Settings/Security.
- **CURRENT STATUS:** IMPLEMENTATION ADDED — 12 registry unit tests pass; runtime verification
  pending. (Earlier ledger revisions recorded this as AUDITED; the entries and both
  `/{locale}/dashboard` and the case flows now exist and build.)
- **CURRENT IMPLEMENTATION:** `/{locale}/dashboard` renders `VzgDashboard`, which reads
  `profiles`, `contracts`, `documents`, `deadlines` via `ensureHousehold` and composes
  `components/horizon/horizon-home.tsx`. That surface presents exactly the five HORIZON entry
  modules (Agentur für Arbeit, Jobcenter, Kündigung, Steuererklärung, Unterlagen erklären) from
  `lib/horizon/modules/registry.ts`, each a real form submit through
  `lib/horizon/modules/actions.ts` into the shared P5 case engine — the same engine and the same
  destination as the guide, so the two surfaces cannot drift. Per-module case counts are resolved
  through `resolveCaseModule`, so pre-P5 rows are attributed by legacy intent rather than dropped.
  Secondary destinations are My Cases (`/guide`), Documents, Profile and Security, all existing
  pages. Module labels come from the guide vocabulary, so the two surfaces cannot disagree.
  Supporting components: `workplace-action-center`, `missing-information-interviewer`,
  `smart-dashboard-preview`, `dashboard-workspace`.
- **REUSE:** `VzgDashboard`, `HorizonHome`, `workplace-action-center`,
  `missing-information-interviewer`, `dashboard-layout`, `user-sidebar`, `module-page`,
  `module-workspaces`, `smartDashboardRules`.
- **MISSING:** runtime verification with an authenticated session; the dashboard still renders
  legacy KintexBG-era cards alongside the HORIZON module entry, and
  `lib/kintex-navigation.ts` retains 10 modules (several flagged `planned`) that are not part of
  the HORIZON five; no route-level test of the dashboard.
- **DEPENDENCIES:** P0, P2 (onboarding), P5 (case engine).
- **BLOCKERS:** none known; runtime verification needs a configured Supabase instance. Removing
  the legacy cards is a visual/behaviour change and is out of scope until the owner authorizes it.
- **DONE CRITERIA:** dashboard presents exactly the five user modules plus My Cases, Profile,
  and Settings/Security; each entry is functional and routes into a real flow; loading, error,
  and empty states complete; localized; tests, build, and real verification pass.
- **FROZEN:** NO

---

## PHASE 5 — SHARED CASE ENGINE

- **ID:** P5
- **SYSTEM:** Shared case engine (spine: case → source documents → extracted facts → messages
  → drafts → approvals → tasks → audit)
- **TARGET ROUTES:** no new public routes; consumed by all modules. Existing consumer surfaces:
  `/{locale}/office`, `/{locale}/office/cases/{id}`, `/{locale}/dashboard`.
- **CURRENT STATUS:** MODEL + REPOSITORY VERIFIED — RUNTIME VERIFICATION PENDING (not DONE, not FROZEN)
- **CANONICAL MODEL (owner decision, on record):** `public.cases` is the canonical case model,
  and tenancy is **owner-scoped via `auth.uid()`**. The `platform_cases`, `platform_tasks`,
  `platform_correspondence_drafts`, `platform_approvals`, and `platform_audit_events` family is
  **PRESERVED LEGACY / COMPATIBILITY SURFACE**: not deleted, not destructively migrated, and not
  the canonical model for new HORIZON workflows. New P3–P17 work uses the canonical `cases`
  family; existing `platform_*` consumers may be bridged by thin compatibility adapters only.
- **CURRENT IMPLEMENTATION:** owner-scoped case repository (`lib/office/repositories/cases.ts`)
  with create/list/get/update/archive and audit-on-archive; case detail repository;
  case messages with AI language/intent routing (`lib/office/ai/routing.ts`,
  `routeCaseMessage`); a 14-state workplace state machine
  (`lib/workplace/state-machine.ts`); audit helper (`lib/office/supabase/audit.ts`);
  ownership guard (`lib/office/supabase/ownership.ts`); route handlers under
  `/api/office/cases/*`.
- **REUSE:** all of the above, plus `cases`, `case_messages`, `extracted_facts`, `tasks`,
  `audit_events` tables and the `platform_cases` / `platform_tasks` / `platform_audit_events` family.
- **MISSING:** the canonical case model was designated by the owner and implemented; what remains
  is runtime verification against a migrated database, plus module-facing UI wiring (P4/P12–P17)
  and the document-intake, AI-assistant, and PDF/send engines (P6–P11).

  Sprint 2 delivery (owner-authorized for P5, canonical model confirmed):
  - `lib/horizon/case/contract.ts` — one canonical contract: `Case`, `CaseModule`, the ten-value
    `HorizonCaseStatus`, `HorizonCaseAction`, `CaseSourceDocument`, `ExtractedFact`, `CaseMessage`,
    `CaseDraft`, `CaseApproval`, `CaseTask`, `CaseAuditEvent`, `MissingInformation`, and the seven
    module ids (`agentur_fuer_arbeit`, `jobcenter`, `kuendigung`, `steuererklaerung`,
    `unterlagen_erklaeren`, `contract_management`, `general`).
  - `lib/horizon/case/lifecycle.ts` — the HORIZON lifecycle (`draft`, `collecting_data`,
    `waiting_for_user`, `processing`, `draft_ready`, `review`, `approved`, `action_ready`,
    `completed`, `cancelled`) with one transition table, plus bidirectional mapping to the legacy
    `cases.status` vocabulary. Mapping is adapter-only; no historic row is rewritten.
  - `lib/horizon/case/repository.ts` — `CaseEngineRepository` implementing create case, load own
    case, list own cases, allowed state transition, module assignment, attach source document,
    add/list facts, confirm fact, add/list message, save/list draft, draft review status, record
    approval, approval-state check, create/update/list task, append/list audit event, and
    missing-information derivation. Every operation filters on the authenticated owner.
  - `lib/horizon/case/approval.ts` — content-hash approval binding, so a changed approved body
    invalidates its approval without modifying or deleting any historic approval row.
  - `lib/horizon/case/module.ts` — compatibility adapter mapping legacy `cases.intent` to a module.
  - `lib/horizon/case/missing-info.ts` — derived missing/unconfirmed-critical fact state per module.
  - `lib/horizon/case/index.ts` — `createCaseEngine()`, bound to the session client (RLS enforced);
    never a service-role client.
  - Additive migration `supabase/migrations/20260919150000_horizon_case_engine.sql`: adds nullable
    `cases.horizon_status` and `cases.horizon_module` with CHECK constraints on the canonical
    vocabularies, one index, and **column-scoped only** grants. No table-wide grant, no policy
    dropped or weakened, no destructive statement, and the `platform_*` family is untouched.
  - Isolation tests: `supabase/tests/rls/horizon_case_engine_isolation.sql` (two users; per-table
    read isolation, blocked cross-case writes, blocked ownership reassignment, blocked approval of
    another user's draft, blocked anon access, and a positive control that the owner's own writes
    still succeed; rolls back its fixtures). Static coherence is asserted by
    `lib/horizon/case/migration-contract.test.ts`, and the contract/lifecycle/approval logic by
    `lib/horizon/case/case-engine.test.ts`.
- **DEPENDENCIES:** P0, P2 (authenticated context).
- **BLOCKERS:** runtime verification only. `20260919150000_horizon_case_engine.sql` is not yet
  applied to the production project, and the RLS isolation test cannot run here (no authorized DB
  channel), so no cross-user isolation assertion has been observed against a live database. Those
  checks are written and passing as static/unit assertions, not as runtime proof. P5 is therefore
  not DONE and not FROZEN.
- **DONE CRITERIA:** one documented canonical case model; every module creates cases through it;
  RLS and repository enforce ownership; cross-tenant isolation tested; every state transition
  audited; case messages, facts, drafts, approvals, tasks all hang off the same case;
  tests, build, and real verification pass.
- **FROZEN:** NO

---

## PHASE 6 — DOCUMENT INTAKE / OCR / EXPLANATION

- **ID:** P6
- **SYSTEM:** Document intake, OCR, explanation
- **TARGET ROUTES:** no new public route required; enhances `/{locale}/documents` and
  `/{locale}/office/cases/{id}`.
- **CURRENT STATUS:** PARTIAL — all five input types accepted and unit-tested; runtime verification
  pending (commits `b708697`, `3bff5c0`).
- **CURRENT IMPLEMENTATION:** validated upload with canonical-project guard
  (`lib/documents/validation.ts` + `app/api/documents/upload/route.ts`);
  text extraction (`lib/documents/extraction.ts`); contract extraction
  (`lib/contracts/extraction.ts`); PDF extraction and Tesseract OCR
  (`lib/office/workflow/pdf-extraction.ts`, `pdf-ocr.ts`, `ocr-provider.ts` with `deu+eng`);
  AI analysis via Groq and Cerebras (`/api/documents/analyze`); fact confirmation
  (`/api/documents/review`); signed private URLs with a 300-second expiry;
  document UI: `document-intake`, `documents-workspace`, `document-facts-review`,
  `document-analyzer`, `document-explanation`.
  **Added in this phase:** pasted-text and email-content intake
  (`lib/horizon/intake/text.ts`, `lib/horizon/intake/actions.ts`,
  `components/guide/text-intake-form.tsx`), persisted verbatim on the owner-scoped
  `case_messages` spine with audit provenance (input kind, length, SHA-256), wired into
  `components/guide/case-workspace.tsx`. The intake derives nothing from the prose.
  **Added in this phase (`3bff5c0`):** PDF, photo and screenshot intake
  (`lib/horizon/intake/document.ts`, `lib/horizon/intake/document-actions.ts`,
  `components/guide/document-intake-form.tsx`), written to the canonical `source_documents`
  spine and the private `source-documents` bucket at the CHECK- and policy-required
  `{ownerId}/{caseId}/{documentId}-{name}` path, with audit provenance (input kind, MIME,
  size, SHA-256). No schema change was required: `image/jpeg` and `image/png` were already
  admitted by both the mime CHECK and the bucket allowlist, so screenshot/photo intake needed
  wiring, not a migration. MIME is established by magic bytes, not the client-declared type.
  Object writes go through the service-role client because the bucket grants authenticated
  users read-only object access; ownership is proven by an owner-scoped case read first, and a
  partial failure removes the object and the row so the bucket and table cannot diverge.
  Every rejection maps to a specific localized code, so no raw storage or Postgres message is
  shown. Also fixed a provenance leak: the documents panel rendered the raw storage path,
  exposing the owner id and internal case id; it now shows only the file name.
- **REUSE:** everything listed above, plus tables `documents`, `source_documents`,
  `document_pages`, `document_analysis_results`, `document_reviews`, and the private Storage
  buckets `documents` and `source-documents`.
- **MISSING:** page-level evidence linkage on every extracted fact; one extraction contract
  shared by the two parallel document stacks; explicit error states for OCR/extraction failure.
  Runtime verification of file intake requires an authenticated session and a configured
  Supabase instance.
  **Note on text intake and `source_documents`:** the `source_documents.mime` CHECK and the
  `source-documents` bucket MIME allowlist both admit only PDF/JPEG/PNG. Admitting text there
  would require dropping a constraint, which is a destructive schema change and is not
  authorized. Text is therefore stored on `case_messages` instead. A migration-contract test
  (`lib/horizon/case/migration-contract.test.ts`) asserts that no HORIZON migration drops a
  constraint, so this cannot be undone silently by a later feature commit. Reconciling the two
  document stacks remains open.
- **DEPENDENCIES:** P5 (case model), P7 (assistant context).
- **BLOCKERS:** OCR provider and budget approval (`docs/TERRA_START.md` T5 notes OCR requires an
  approved provider and budget). Two competing document stacks must be reconciled first.
  Runtime verification of intake requires an authenticated session and a configured
  Supabase instance.
- **DONE CRITERIA:** screenshot, photo, PDF, pasted text, and email content are all accepted;
  OCR/extraction results stored per page; every extracted fact carries page evidence;
  explanation is localized; failures surface explicit errors; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 7 — CONTEXT AI ASSISTANT

- **ID:** P7
- **SYSTEM:** Context AI assistant
- **TARGET ROUTES:** enhances `/{locale}/assistant` and the case workspace.
- **CURRENT STATUS:** IMPLEMENTATION ADDED — runtime verification pending (commit `f6ec2d6`).
- **CURRENT IMPLEMENTATION:** `/{locale}/assistant` renders `home-office-workspace`;
  `app/api/chat/route.ts` streams via `@ai-sdk/groq` with rate limiting;
  case-message routing (`lib/office/ai/routing.ts`, prompt version `language-router-intent-v1`);
  missing-information interviewer (max 3 questions, prompt version `missing-info-interviewer-v1`);
  quota and circuit breaker (`lib/office/ai/guards.ts`, `consume_ai_quota`, 3-failure / 60 s breaker);
  deterministic draft generation (`lib/office/ai/groq-draft-generator.ts`);
  providers `lib/home-office/groq-provider.ts` and `lib/home-office/cerebras-provider.ts`;
  demo fallback `lib/home-office/provider.ts` (`AI_PROVIDER_NOT_CONFIGURED`).
  **Added in this phase:** persistent case context
  (`lib/horizon/ai/context.ts` — separates confirmed from unconfirmed facts, passes missing
  required keys through, reads approval state from stored hashes); model/prompt version registry
  (`lib/horizon/ai/registry.ts`); structural guard rails and per-module rails
  (`lib/horizon/ai/guard.ts`, `lib/horizon/ai/module-rails.ts`); case assistant prompt
  (`lib/horizon/ai/prompt.ts`); case-scoped streaming route
  (`app/api/horizon/cases/[id]/assistant/route.ts`, case id taken from the path only); panel
  wired into `components/guide/case-workspace.tsx`
  (`components/guide/case-assistant-panel.tsx`).
- **REUSE:** all of the above plus `usage_counters`, `document_analysis_results`,
  `case_messages`, `extracted_facts`.
- **MISSING:** runtime verification of the case-scoped assistant; the older household chat route
  (`app/api/chat/route.ts`) still answers from the `contracts`/`documents` household stack rather
  than the case spine and is deliberately left untouched here — replacing a live surface belongs
  to a reconciliation phase; OpenRouter credentials are declared in `.env.example` but no
  OpenRouter client code exists.
- **DEPENDENCIES:** P5 (case context), P6 (documents).
- **BLOCKERS:** an AI provider key must be configured for any end-to-end AI verification;
  `docs/TERRA_START.md` states a missing cloud key must block end-to-end success claims.
- **DONE CRITERIA:** assistant answers inside the active case context; AI performs only
  explanation, translation, extraction assistance, missing-question generation, drafting,
  and summarization; AI never decides authorization, final approval, send execution,
  deterministic arithmetic, or tenant access; outputs carry provenance and version;
  quota and breaker behavior tested; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 8 — DRAFT / REVIEW / USER APPROVAL

- **ID:** P8
- **SYSTEM:** Draft → review → user approval
- **TARGET ROUTES:** enhances `/{locale}/office/cases/{id}`; API
  `/api/office/cases/{id}/workflow`, `/api/office/drafts/{id}/approve`,
  `/api/office/drafts/{id}/export`.
- **CURRENT STATUS:** AUDITED
- **CURRENT IMPLEMENTATION:** deterministic draft generator and safety reviewer
  (`lib/office/workflow/deterministic.ts`) with required fact keys `recipient`, `subject`,
  `request`; SHA-256 `content_hash` and `input_facts_hash`;
  hash-bound approval (`lib/office/workflow/approval.ts` `approvalMatches`,
  `/api/office/drafts/{id}/approve` rejects anything other than a valid 64-hex hash);
  state machine path `DRAFT_READY → USER_REVIEW → APPROVED`;
  14-state workplace state machine with blockers `UNCONFIRMED_FACTS`, `MISSING_DOCUMENT`,
  `MISSING_INFO`, `NO_APPROVAL`; review components `response-draft-review`,
  `document-facts-review`, `reminder-review`; tables `correspondence_drafts`,
  `platform_correspondence_drafts`, `approvals`, `platform_approvals`.
  **Added in this phase (`e28fc8b`):** the user-facing review and approval surface. The page now
  reads `listApprovals`, which it previously did not — without it the workspace could not know a
  draft was approved, so the hash-binding guarantee was unreachable from the interface.
  `lib/horizon/case/release.ts` assesses releasability as an ordered list of reasons
  (`NO_DRAFT`, `UNCONFIRMED_FACTS`, `MISSING_INFORMATION`, `REVIEW_BLOCKED`, `NOT_APPROVED`,
  `CONTENT_CHANGED_SINCE_APPROVAL`) so a refusal states what is missing; `NOT_APPROVED` and
  `CONTENT_CHANGED_SINCE_APPROVAL` stay distinct because an edit that invalidated an approval
  must not read as "never approved". `lib/horizon/case/review-actions.ts` and
  `components/guide/draft-review-panel.tsx` provide review status, a required acknowledgement,
  and approval; approval is refused server-side while critical facts are unconfirmed, and the
  acknowledgement is verified in the action, not only in the form. The draft body is shown
  verbatim and is not editable on this surface.
- **REUSE:** all of the above.
- **MISSING:** no enforced blocking of unapproved *send* at the UI level (the send engine is P11);
  the deterministic translator does not produce a real translation for non-`de` locales; two
  overlapping draft/approval families exist with no canonical choice.
- **DEPENDENCIES:** P5, P7.
- **BLOCKERS:** canonical draft/approval model depends on the P5 case-model decision.
- **DONE CRITERIA:** user sees the exact German draft and its translation; facts must be
  confirmed; explicit user approval is required and hash-bound; any content change invalidates
  approval; unapproved content cannot be exported or sent; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 9 — OFFICIAL PDF FORM ENGINE

- **ID:** P9
- **SYSTEM:** Official PDF form engine
- **TARGET ROUTES:** consumed by P12, P13, P15; existing readiness endpoint `/api/steuer/pdf`;
  preparation surface inside the case workspace (`components/guide/official-form-panel.tsx`).
- **CURRENT STATUS:** PARTIAL — engine implemented and tested (commit `256b83c`); cannot emit a
  filled PDF because no PDF writer is installed (owner decision required) and the shipped
  official templates are static, non-fillable forms.
- **CURRENT IMPLEMENTATION:** `lib/horizon/pdf/`:
  `registry.ts` holds the 9 official FMS 2025 templates present in `public/forms/` with
  authority, official source, form name, Form-ID, version, tax year, retrieval date and
  source SHA-256, plus the instruction booklet as reference-only, keyed by tax year with no
  cross-year fallback. `source.ts` recomputes the template SHA-256 (`verifyTemplateSource`,
  `inspectTemplate`) and detects the real format from the bytes (AcroForm / XFA / static).
  `fill.ts` (`planPdfFill`) assigns only confirmed facts, leaves absent/unconfirmed/empty
  values blank with distinct reasons, refuses a mapping whose field is not present in the
  template, and refuses XFA and static templates rather than approximating them.
  `manifest.ts` builds and deterministically renders the provenance record (template identity,
  source, source hash, mapping version, case id, generation timestamp, filled and blank fields).
  `mappings.ts` is intentionally empty (see MISSING). `writer.ts` reports
  `writer_unavailable`. `actions.ts` (`prepareOfficialForm`) plans, refuses explicitly, and
  saves the manifest through the existing P8 draft path, binding approval to these exact
  template/mapping/fact inputs without a second approval system.
  Pre-existing: `lib/fms-2025-registry.ts`, `lib/canonical-tax-model.ts`,
  `lib/tax-pipeline.ts`, `lib/tax-questionnaire-schema.ts`, `tax_form_registry`,
  `/api/steuer/pdf` (still returns readiness, not a document).
- **REUSE:** the P8 draft/approval/hash-binding engine (`saveDraft`, `recordApproval`,
  `assessDraftRelease`) — no second approval system was created; the FMS registry, canonical
  tax model, tax pipeline, questionnaire schema and `tax_form_registry`.
- **MISSING:** (1) a PDF **writer** — only `pdfjs-dist` (a reader) is installed, so no values
  can be written; (2) verified field mappings — **the 9 FMS 2025 templates in `public/forms/`
  are static printable forms**: they contain no `/AcroForm`, no `/Widget` annotations and no XFA
  packet, and a field lookup returns no fields, so no field name exists to map onto (this is
  why the mapping registry is empty rather than populated with unverified names);
  (3) Agentur fuer Arbeit and Jobcenter official templates; (4) durable provenance storage
  beyond the draft body (no schema change was made).
- **DEPENDENCIES:** P8 (approval — satisfied, reused), P6 (facts).
- **BLOCKERS:** a PDF writer must be added (`AGENTS.md` forbids adding dependencies without
  explicit owner approval); a fillable official template must be obtained, or an approved
  mapping/overlay approach verified against the official layout, before any field mapping can
  be written. Both are owner-action blockers.
- **DONE CRITERIA:** the original official German template is filled unmodified using only
  confirmed facts; unknown fields stay empty; output is previewable, reviewable, approvable,
  downloadable; template provenance recorded; approval bound to the exact current
  content/input hash (satisfied via P8); tests, build, real verification pass.
  **Not yet met:** the fill itself.
- **FROZEN:** NO

---

## PHASE 10 — SIGNATURE ENGINE

- **ID:** P10
- **SYSTEM:** Signature engine
- **TARGET ROUTES:** consumed by P14 and P15.
- **CURRENT STATUS:** NOT_STARTED
- **CURRENT IMPLEMENTATION:** none. A search for signature capabilities found only Storage
  signed URLs (`createSignedUrl`, 300 s) and file-signature validation
  (`FILE_INVALID_SIGNATURE`, magic-byte checks) — neither is document signing.
- **REUSE:** the approval/hash model from P8 for binding decisions, and the audit spine.
- **MISSING:** provider selection, applicable-form verification, signature record,
  signature audit trail.
- **DEPENDENCIES:** P8 (approval), P9 (document to sign).
- **BLOCKERS:** no signature provider is selected or approved.
  `docs/TERRA_START.md` states signing requires a separate provider choice and verification of
  the applicable form, and that an "I accept" button must not be presented as a signature.
- **DONE CRITERIA:** provider explicitly approved; signature applies only to approved documents;
  signature events are recorded and auditable; an acceptance button is never presented as a
  signature; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 11 — EMAIL CONNECTION + SEND ENGINE

- **ID:** P11
- **SYSTEM:** Email connection and send engine
- **TARGET ROUTES:** consumed by P12–P17.
- **CURRENT STATUS:** NOT_STARTED
- **CURRENT IMPLEMENTATION:** download only (`/api/office/drafts/{id}/export` returns
  `text/plain` attachment). An outbound webhook with a shared secret exists in
  `/api/service-requests`. There is no inbound mailbox connection and no send engine.
- **REUSE:** draft/approval model (P8), audit spine, `correspondence_drafts.attachments`,
  `approvals`, and the n8n webhook pattern (`N8N_WEBHOOK_SECRET`).
- **MISSING:** mailbox connection (Gmail/IMAP/SMTP), send engine, delivery-status handling,
  retry with idempotency, send audit. **No mail dependency exists in `package.json`.**
- **DEPENDENCIES:** P8, P1 (privacy/legal wording), P4 (settings surface).
- **BLOCKERS:** adding a mail dependency requires explicit owner approval; mailbox provider and
  consent model must be approved; `DOCUMENT_FEASIBILITY_AUDIT.md` states notification/connector
  work requires a configured connector, consent model, retry/idempotency, audit logs, and a
  deployment environment.
- **DONE CRITERIA:** an approved mail channel is connected; sending requires a current approval
  hash; every send is idempotent and audited; delivery status is tracked; failures are surfaced
  and never silently retried; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 12 — AGENTUR FÜR ARBEIT

- **ID:** P12
- **SYSTEM:** Agentur für Arbeit module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, running on the shared
  case engine.
- **CURRENT STATUS:** NOT_STARTED
- **CURRENT IMPLEMENTATION:** none. No Agentur für Arbeit route, component, form registry, or
  recipient rule set exists. Related general surfaces exist only as generic modules:
  `/{locale}/anspruch` (entitlement navigator), `/{locale}/finanzamt` (Finanzamt requests).
- **REUSE:** shared engines E1–E10 only; no module-specific code to reuse.
- **MISSING:** information pages, process/form selection, module form registry, required fields,
  recipient rules, guided questions, official template mapping, cover text, approval flow.
- **DEPENDENCIES:** P5, P6, P7, P8, P9 (and P10/P11 for sign/send).
- **BLOCKERS:** depends on P9 PDF writer and official template verification; adding PDF
  dependencies needs owner approval.
- **DONE CRITERIA:** information → choose process/form → AI-guided questions → confirmed facts →
  fill the original official German template → German cover text → preview → user review →
  required acknowledgement → explicit approval → PDF download or approved send;
  missing terms remain missing; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 13 — JOBCENTER

- **ID:** P13
- **SYSTEM:** Jobcenter module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, sharing the case engine.
- **CURRENT STATUS:** NOT_STARTED
- **CURRENT IMPLEMENTATION:** none for Jobcenter specifically. `/{locale}/anspruch` and
  `benefit_cases` are the only adjacent benefit surfaces.
- **REUSE:** shared engines E1–E10; `benefit_cases`, `anspruch` navigator, `module-workspaces`.
- **MISSING:** Jobcenter information, knowledge, form registry, required fields, recipient rules,
  guided questions, official template mapping, approval flow. No duplicated engine may be built.
- **DEPENDENCIES:** P5, P6, P7, P8, P9, and P12 (Agentur für Arbeit pattern).
- **BLOCKERS:** depends on P12 establishing the reusable module pattern and P9 PDF writer.
- **DONE CRITERIA:** the Agentur für Arbeit workflow is reproduced using the same shared engines,
  with Jobcenter-specific form registry, required fields, and recipient rules;
  no duplicated backend; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 14 — KÜNDIGUNG

- **ID:** P14
- **SYSTEM:** Kündigung module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, sharing the case engine.
- **CURRENT STATUS:** NOT_STARTED
- **CURRENT IMPLEMENTATION:** none as a module. Adjacent reusable material:
  `/{locale}/vertraege` contracts workspace, `lib/contracts/extraction.ts`,
  `lib/kintex-radar.ts` (deterministic cancellation-deadline signals), and the
  `cancellation` case intent in `lib/office/supabase/database.ts`.
- **REUSE:** contracts workspace, contract extraction, radar date logic, `contracts` table
  (`end_date`, `cancellation_deadline`), `case_messages`, `correspondence_drafts`.
- **MISSING:** contract upload/select into a Kündigung case, termination-fact extraction with
  evidence, Kündigungsschreiben generation, preview, approval, optional signature,
  download/send.
- **DEPENDENCIES:** P5, P6, P7, P8, P9 (optional P10/P11).
- **BLOCKERS:** `DOCUMENT_FEASIBILITY_AUDIT.md` states that preparing a cancellation draft and
  checklist is acceptable, but sending requires explicit user approval and a configured lawful
  channel — so P11 is a hard dependency for any send.
- **DONE CRITERIA:** contract upload/select → extract provider/customer/contract facts →
  identify termination data only when evidenced → explain → generate Kündigungsschreiben →
  preview → approval → optional signature → download/send.
  **Missing terms must remain missing; Kündigungsfristen must never be invented.**
  Tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 15 — STEUERERKLÄRUNG

- **ID:** P15
- **SYSTEM:** Steuererklärung module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`; existing surfaces
  `/{locale}/steuer`, `/{locale}/steuer/providers`, `/{locale}/steuer/review`,
  `/{locale}/finanzamt`.
- **CURRENT STATUS:** AUDITED
- **CURRENT IMPLEMENTATION:** tax questionnaire (`tax-questionnaire`, `tax-questionnaire-schema`),
  official form registry UI and data (`tax-form-registry`, `tax_form_registry`),
  canonical tax model (`lib/canonical-tax-model.ts`), tax pipeline and PDF readiness
  (`lib/tax-pipeline.ts`, `/api/steuer/pdf`), ELSTER contract only
  (`lib/elster-provider.ts`: `ElsterProvider`, `UnconfiguredElsterProvider`,
  `SUBMISSION_NOT_CONFIGURED`, `elsterCredentialPolicy`), Finanzamt requests
  (`lib/finanzamt-requests.ts`, `finanzamt_requests`), provider audit timeline
  (`provider_integrations`, `provider_submission_attempts`, `provider_submission_events`,
  `provider_receipts`), education table `financial_education_lessons`.
- **REUSE:** all of the above.
- **MISSING:** actual PDF package generation (no PDF library — see P9); deterministic
  calculation verification end-to-end; guided collection wired to the shared case engine;
  review and manual-submission packaging; ELSTER integration (intentionally absent).
- **DEPENDENCIES:** P5, P6, P7, P8, P9.
- **BLOCKERS:** no approved ELSTER integration exists, so automatic submission stays out of scope.
  `/api/steuer/pdf` returns readiness only. Adding a PDF dependency requires owner approval.
- **DONE CRITERIA:** information → official forms → guided collection → deterministic
  calculations where approved → AI explanation/drafting → review → PDF package → manual
  submission. **No automatic ELSTER submission.** Submission is manual to the competent
  Finanzamt. No ELSTER credentials, certificate passwords, `.pfx` files, or private keys are
  collected or stored. Tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 16 — UNTERLAGEN ERKLÄREN

- **ID:** P16
- **SYSTEM:** Unterlagen erklären module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`; existing surfaces
  `/{locale}/documents` and `/{locale}/office/cases/{id}`.
- **CURRENT STATUS:** AUDITED
- **CURRENT IMPLEMENTATION:** document upload with validation, extraction, Tesseract OCR,
  Groq/Cerebras analysis, fact confirmation, signed URLs, and explanation components
  (`document-intake`, `document-explanation`, `document-facts-review`, `documents-workspace`).
  Deterministic deadline/urgency signals exist in `lib/kintex-radar.ts`.
- **REUSE:** the whole document stack (see P6) plus `documents`, `source_documents`,
  `document_pages`, `document_analysis_results`, `document_reviews`, `deadlines`.
- **MISSING:** pasted-text and email-content intake; classify step; per-page evidence on facts;
  deadline extraction from arbitrary documents; the uncertainty-aware fraud/scam states
  (`risk signals detected` / `no obvious risk signals` / `cannot determine`);
  next-action surfacing; optional reply, review, approval, optional sign, optional send.
- **DEPENDENCIES:** P5, P6, P7, P8, P9, P10, P11.
- **BLOCKERS:** depends on P6 (intake) and P11 (send) for the full chain; OCR provider budget
  approval required for end-to-end verification.
- **DONE CRITERIA:** UPLOAD → OCR/PARSE → EXTRACT → CLASSIFY → TRANSLATE → EXPLAIN → DEADLINE →
  RISK/URGENCY → NEXT ACTION → OPTIONAL REPLY → REVIEW → APPROVAL → OPTIONAL SIGN →
  OPTIONAL SEND. Fraud/scam handling must use uncertainty-aware states and must never make an
  unsupported accusation. Tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 17 — CONTRACT MANAGEMENT

- **ID:** P17
- **SYSTEM:** Contract management module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`; existing surfaces
  `/{locale}/vertraege`, `/{locale}/tarife`, `/{locale}/angebote/{offer}`, `/go/{offer}`,
  `/api/contracts`, `/api/contracts/{id}`, `/api/radar`, `/api/optimize/*`.
- **CURRENT STATUS:** AUDITED
- **CURRENT IMPLEMENTATION:** contracts workspace and contract-center workspace;
  contract CRUD APIs; deterministic contract Radar (`lib/kintex-radar.ts` with
  `contract_radar_history` and `radar_events`); optimize sessions
  (`lib/optimize/flow.ts`, `optimize_sessions`, provenance-tracked filled data);
  affiliate offers (`lib/affiliate-offers.ts`, `/go/{offer}` with exact deeplink, no guessed
  tracking parameters); manual offer intake via n8n (`/api/service-requests`);
  contracts table with `end_date`, `cancellation_deadline`, `review_status`,
  `extraction_confidence`.
- **REUSE:** all of the above.
- **MISSING:** module entry from the HORIZON dashboard; contract-to-case linkage; unified
  contract review flow on the shared case engine; migration of KintexBG-era contract UI naming.
- **DEPENDENCIES:** P5, P6, P8.
- **BLOCKERS:** none technical; affiliate and offer-request surfaces are parked until the manual
  n8n workflow and first paid service are live (`docs/AFFILIATE_LAUNCH_PLAN.md`).
- **DONE CRITERIA:** contract archive, provider/cost visibility, cancellation deadlines,
  deterministic source-backed signals, and user-approved next steps all operate on the shared
  case engine; no invented savings or prices; loading, error, and empty states complete;
  tests, build, real verification pass.
- **FROZEN:** NO

---

## CAPITAL — PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE

- **ID:** not part of P0–P17
- **SYSTEM:** Capital layer
- **TARGET ROUTES:** none in the active sequence
- **CURRENT STATUS:** PRESERVED — NOT IN ACTIVE SEQUENCE
- **CURRENT IMPLEMENTATION:** `lib/capital/**` on `main`: `FinancialFact` domain model
  (household-scoped, typed, versioned, `DRAFT`/`CONFIRMED`/`REJECTED`/`SUPERSEDED`),
  provenance model (`USER`, `DOCUMENT`, `PROVIDER`, `SYSTEM`, `AI_EXTRACTED`),
  confirmation lifecycle, deterministic `capital-core-1.0.0` engine, monthly surplus and
  reserve scenario, neutral goal feasibility, deterministic snapshot hash,
  `AdvisorReview` and `PublishBoundary` contracts, P0 runtime orchestrator and source adapters,
  plus unit tests. Research material under `docs/research/capital/**`.
- **REUSE:** none permitted until explicit owner instruction to resume.
- **MISSING:** persistence and runtime data integration; a user-facing surface.
  `DOCUMENT_FEASIBILITY_AUDIT.md` records both as NOT completed.
- **DEPENDENCIES:** explicit owner instruction.
- **BLOCKERS:** Capital is outside the active sequence. `DOCUMENT_FEASIBILITY_AUDIT.md` keeps
  blocked: personalized investment advice or suitability handling, trading or executing
  purchases/submissions, bank/broker/credit-card integrations, official Schufa integration,
  fake prices/offers/savings, AI performing financial arithmetic or setting assumptions,
  DIN ingestion or DIN compliance claims, and execution through external providers.
- **DONE CRITERIA:** not applicable while Capital is outside the active sequence.
- **FROZEN:** NO
- **OWNER APPROVAL REQUIRED:** YES — to resume at all.

---

## Standing rules for this ledger

1. Update the ledger in the same change that advances a phase's real status.
2. Never mark DONE unless every DONE criterion is met and verified.
3. Never mark FROZEN without explicit owner acceptance.
4. A FROZEN entry must not be edited except to record an owner reopening.
5. Newly discovered work becomes a new row or a new phase — never silent scope creep.
6. If evidence is unavailable, record `BLOCKED` or leave the status unchanged; do not guess.
