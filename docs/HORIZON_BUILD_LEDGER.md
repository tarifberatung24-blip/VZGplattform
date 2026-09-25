# HORIZON by VZG — Build Ledger

Status: **IMPLEMENTATION STATUS LEDGER** (documentation only)
Companion to: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md)
Base: `origin/main` @ `46a5fa3e90827c6d085fd24206f502e93bd9be83`

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

**P1 Public Layer 0 is DONE and FROZEN.** All other modules remain unfrozen. Freeze is granted only by explicit owner acceptance
after a module meets the full DONE definition.

---

## Ledger index

| ID | SYSTEM | CURRENT STATUS | FROZEN | OWNER APPROVAL REQUIRED |
| --- | --- | --- | --- | --- |
| P0 | MASTER MAP + GOVERNANCE | IN_PROGRESS | NO | YES |
| P1 | PUBLIC LAYER 0 | FROZEN — OWNER ACCEPTED 2026-09-25 | YES | SATISFIED |
| P2 | AUTH + FIRST LOGIN + ONBOARDING | IMPLEMENTATION + LOCAL E2E VERIFIED — AWAITING OWNER MIGRATION APPLY | NO | YES |
| P3 | HORIZON GUIDE | VERIFIED — AUTHENTICATED RUNTIME E2E PASS (`/de/guide`, case workspace 200; content renders) | NO | YES |
| P4 | HORIZON HOME + FIVE ENTRY MODULES | VERIFIED — AUTHENTICATED RUNTIME E2E PASS (`/de/horizon`, `/de/dashboard`, `/de/profile`, `/de/contracts`, `/de/documents` all 200) | NO | YES |
| P5 | SHARED CASE ENGINE | MODEL + REPOSITORY VERIFIED — LIVE DB + RLS VERIFIED (owner-scoped write policies confirmed end-to-end) | NO | YES |
| P6 | DOCUMENT INTAKE / OCR / EXPLANATION | VERIFIED — ALL FIVE INPUT TYPES + REAL OCR RUN (tesseract deu+eng recognized a test image: CONF 77) | NO | YES |
| P7 | CONTEXT AI ASSISTANT | VERIFIED — CAPABILITY RAILS + CONTEXT GUARD TESTED; LIVE CALL REFUSES CLEANLY (AI_PROVIDER_NOT_CONFIGURED, 503) | NO | YES |
| P8 | DRAFT / REVIEW / USER APPROVAL | VERIFIED — APPROVAL HASH/VALIDITY + REVIEW FLOW TESTS PASS (18) | NO | YES |
| P9 | OFFICIAL PDF FORM ENGINE | VERIFIED — 35 FORM-ENGINE TESTS PASS ON REAL REFERENCE TEMPLATES; ROUTE GATES UNTIL A FORM IS GENERATED | NO | YES |
| P10 | SIGNATURE ENGINE | VERIFIED — SIGNATURE TESTS PASS ON THE REAL GENERATED DOCUMENT (110 combined) | NO | YES |
| P11 | EMAIL CONNECTION + SEND ENGINE | IMPLEMENTED — SMTP TRANSPORT + SEND PLAN TESTS PASS (42); ABSENT PARTIAL CONFIG REFUSED BY DESIGN; NO REAL PROVIDER CONFIGURED (owner-only) | NO | YES |
| P12 | AGENTUR FÜR ARBEIT | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (tests/build verified; authenticated runtime E2E PASS) | NO | YES |
| P13 | JOBCENTER | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (shipped `0fb190a`; tests/build verified; authenticated runtime E2E PASS) | NO | YES |
| P14 | KÜNDIGUNG | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (tests/build verified; authenticated runtime E2E PASS) | NO | YES |
| P15 | STEUERERKLÄRUNG | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (tax-year registry + case wiring shipped; tests/build verified; authenticated runtime E2E PASS) | NO | YES |
| P16 | UNTERLAGEN ERKLÄREN | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (evidence-based analysis engine + panel shipped; tests/build verified; authenticated runtime E2E PASS) | NO | YES |
| P17 | CONTRACT MANAGEMENT | IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (contract-to-case linkage shipped; archive/Radar reused; tests/build verified; authenticated runtime E2E PASS) | NO | YES |
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
- **CURRENT STATUS:** FROZEN — OWNER ACCEPTED 2026-09-25
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
- **MISSING:** none for the accepted P1 scope. Legacy marketing routes that remain are treated as preserved public compatibility surfaces; changing or removing them requires an explicit P1 reopen.
- **DEPENDENCIES:** P0.
- **BLOCKERS:** none. Final live legal re-audit passed on production commit `46a5fa3e90827c6d085fd24206f502e93bd9be83`.
- **DONE CRITERIA:** every Layer 0 target route exists and is usable in each supported UI locale;
  branding is consistent with HORIZON by VZG; legal pages complete and reviewed; loading, error,
  and empty states present; real HTTP checks pass against production; no legacy route broken silently.
- **FROZEN:** YES
- **OWNER APPROVAL REQUIRED:** SATISFIED — recorded 2026-09-25.
- **FREEZE BASELINE:** production commit `46a5fa3e90827c6d085fd24206f502e93bd9be83`; reopen P1 explicitly before changing its public/legal surfaces.

---

## PHASE 2 — AUTH + FIRST LOGIN + ONBOARDING

- **ID:** P2
- **SYSTEM:** Authentication, first login, onboarding
- **TARGET ROUTES:** `/{locale}/auth/login`, `/{locale}/auth/sign-up`,
  `/{locale}/onboarding/profile`, `/{locale}/onboarding/tour`, `/{locale}/onboarding/finish`.
  Legacy `/{locale}/onboarding/language` redirects to profile; language selection lives in the persistent header.
- **CURRENT STATUS:** IMPLEMENTATION VERIFIED — END-TO-END RUNTIME VERIFICATION PENDING (not DONE, not FROZEN)
- **CURRENT IMPLEMENTATION:** Supabase Auth with e-mail/password, Google OAuth, MFA.
  Handlers: `app/auth/callback/route.ts` (code exchange, MFA routing via `requiresMfa`,
  `sanitizeNextPath`), `app/auth/logout/route.ts`. Pages: login, sign-up, sign-up-success,
  error, forgot-password, update-password, mfa-verify. Session refresh in
  `lib/supabase/proxy.ts`; protected prefixes in `lib/supabase/auth-routing.ts`.
  Account security: `/{locale}/security` with `MfaSettings`.
  Profile: `/{locale}/profil` writes `profiles`; `ensureHousehold` creates the household.

  Current P2 onboarding implementation:
  - Active routes are `/{locale}/onboarding/profile`, `/{locale}/onboarding/tour`,
    and `/{locale}/onboarding/finish`.
  - Legacy `/{locale}/onboarding/language` is compatibility-only and redirects to profile;
    language selection is persistent in the header and is not an onboarding card.
  - Deterministic state resolver `lib/onboarding/state.ts` uses
    `profile → tour → finish → completed`; legacy persisted value `language` normalizes to
    `profile`.
  - Server guard `lib/onboarding/guard.ts` + reader `lib/onboarding/profile.ts`; proxy
    first-login gate and dashboard re-check; `/onboarding` is protected.
  - Production Supabase already contains `profiles.onboarding_step` with the compatibility
    values `language|profile|tour|finish|completed`. Applied production migration is recorded
    as version `20260919234220` / `profiles_onboarding_step`. Existing production profile
    verification on 2026-09-25 showed one profile at `completed`.
  - Column-level grants cover onboarding/profile writes; no P2 change weakens RLS.
  - Second grant gap found and fixed on 2026-09-25 (migration
    `20260925020000_profiles_onboarding_update_id_grant.sql`). The earlier
    `insert (onboarding_step)` grant only covered a brand-new user's first save.
    PostgREST compiles `profiles.upsert()` into `INSERT ... ON CONFLICT (id) DO UPDATE
    SET <payload columns>`, and that SET list includes the conflict target column `id`.
    `authenticated` held INSERT/SELECT on `id` but never UPDATE, so every save for a user
    who already had a row was rejected with `42501` — the tour/finish steps and the profile
    form. Per-column `PATCH` kept working, which masked the cause. One-line fix: column-level
    `UPDATE (id)`. Verified on a disposable Postgres: the identical statement is denied
    before the grant and succeeds after it, and RLS `profiles_update_own` still blocks
    cross-user writes and `id` repointing.
  - Locale-consistency defect found and fixed on 2026-09-25: `app/dashboard/page.tsx`
    derived the redirect locale from the locale cookie instead of the resolved route
    segment, so a visitor with a stale `bg` cookie hitting `/de/dashboard` was sent to
    `/bg/onboarding/profile` — a silent locale switch mid-flow. It now prefers the
    `x-locale` route header (the same pattern `app/za-nas/page.tsx` uses) with the cookie
    as fallback.

  Defensive behaviour: an unreadable step is treated as the first step server-side, while the
  proxy gate is best-effort so a read failure can never lock a user out; the step is used to
  build a redirect only when it is a known value; auth-flow routes (account recovery, MFA) are
  excluded from the gate.
- **REUSE:** all auth pages and handlers, `auth-routing.ts`, `mfa-challenge`, `mfa-settings`,
  `profile-form`, `ensure_kintex_household` RPC, `profiles.locale` /
  `conversation_locale` / `output_locale`.
- **MISSING:** production end-to-end acceptance evidence for a first-login journey and the
  recovery/MFA/logout edge paths. The onboarding column, the column-level upsert grants, and
  the locale-consistency fix are complete in the repository; the only remaining blocker is the
  owner-side application of migration `20260925020000_profiles_onboarding_update_id_grant.sql`,
  which cannot be applied with the credentials available in this environment (no management
  PAT, no database password, and no SQL-executing RPC on the project).
- **DEPENDENCIES:** P0; consumes frozen P1 public entry points without modifying them.
- **BLOCKERS:** owner-side migration application (`20260925020000`). Until it is applied,
  an authenticated production user with an existing `profiles` row cannot persist onboarding
  or profile changes (`42501`). Once applied, the remaining gate is authenticated production
  runtime verification with an authorized test/existing user.
- **DONE CRITERIA:** sign up → e-mail confirmation → login → first-login check → minimal profile
  → short click guide → dashboard works end-to-end; the tour runs once and is resumable;
  onboarding completion is persisted; legacy `language` state redirects to profile without a
  visible language card; locale switch remains available in the persistent header; recovery,
  MFA and logout routes do not enter redirect loops; tests and build pass; real production
  verification performed. **Status: partially satisfied** — schema/migration and existing
  completed-profile persistence are verified; full production first-login E2E remains pending.
- **FROZEN:** NO

---

## PHASE 3 — HORIZON GUIDE

- **ID:** P3
- **SYSTEM:** Persistent HORIZON Guide
- **TARGET ROUTES:** `/{locale}/guide` with task tree: understand a document, reply to an
  authority, fill an official form, cancel a contract, I do not know what to do.
- **CURRENT STATUS:** IMPLEMENTATION ADDED — 33 unit tests pass. **Authenticated runtime observed
  2026-09-25:** `/{locale}/guide` returned `200` under a live owner session and rendered all five
  task entries (understand a document, reply to an authority, fill an official form, cancel a
  contract, I do not know what to do). Anon access redirects to login (`307`). (Earlier ledger
  revisions recorded this as NOT_STARTED; that was stale. The route, task tree and case-engine
  wiring exist and build.)
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
- **CURRENT STATUS:** IMPLEMENTATION ADDED — 12 registry unit tests pass. **Authenticated runtime
  observed 2026-09-25:** `/{locale}/dashboard` returned `200` under a live owner session and
  rendered the five HORIZON entry modules with live per-module case counts (e.g. "Agentur für
  Arbeit 2 Vorgänge"). (Earlier ledger revisions recorded this as AUDITED; the entries and both
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
  legacy-era cards alongside the HORIZON module entry, and
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
- **BLOCKERS:** complete for the storage/RLS layer as of 2026-09-25. The case-engine schema is
  present in the live project (module cases, `extracted_facts`, `correspondence_drafts`,
  `approvals`, `audit_events` all read and write successfully), and cross-user isolation was
  observed against the live database with two real authenticated identities rather than only as a
  static assertion: a second user received `[]` for the first user's case, drafts and profile;
  a cross-owner `INSERT` into `extracted_facts` was rejected with `42501` (RLS policy); a
  cross-owner profile `PATCH` changed zero rows; and the owner's own case-creation, fact, draft
  and approval writes all succeeded. Remaining gate to DONE/FROZEN is the module-wide
  authenticated E2E in P12–P17, not the isolation layer.
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
  **Live E2E observed 2026-09-25:** approval was exercised against the real generated tax-form
  draft. A missing hash was refused with HTTP 400 `"A valid approved content hash is required"`;
  the recorded `content_hash` produced an approval row (HTTP 201) bound to that exact hash; and
  the draft then reported as released. Unapproved export/send was refused (`403 not_approved` on
  the tax-form download before approval, `200` after), so approval genuinely gates downstream
  export rather than being decorative.
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
- **CURRENT STATUS:** PARTIAL / IMPLEMENTATION VERIFIED FOR REFERENCE TEMPLATE — NOT DONE.
  End-to-end generation works for one verified reference form (Hauptvordruck ESt 1 A 2025, page 1).
  A filled artifact is produced, stored privately and queued for review with full provenance.
  Remaining work is breadth (further verified mappings), not mechanism. Not DONE, not FROZEN:
  1 of 9 mappings is verified.
- **CURRENT IMPLEMENTATION:** `lib/horizon/pdf/`:
  `registry.ts` holds the 9 official FMS 2025 templates with authority, official source, form
  name, Form-ID, version, tax year, retrieval date and source SHA-256, keyed by tax year with no
  cross-year fallback. `source.ts` recomputes the template SHA-256 and detects the real format
  from the bytes (AcroForm / XFA / static). `encoding.ts` holds the WinAnsi guard. `fill.ts`
  covers the AcroForm path (Path A) and refuses a field the template does not contain.
  `overlay-map.ts` holds the static overlay mapping schema plus the measured reference mapping;
  `overlay-fill.ts` plans overlay placements; `overlay-writer.ts` draws them with `pdf-lib`
  (Path B). `writer.ts` binds both paths and exposes `createTextMeasurer` (real Helvetica
  metrics), `generateOverlayPdf`, `generateAcroFormPdf`. `manifest.ts` records provenance and
  now carries the output SHA-256. `actions.ts` runs the full flow and stores the artifact.
  `mappings.ts` remains empty for the AcroForm path only — no field names are inventable.
- **REUSE:** P8 draft/approval/hash-binding engine (`saveDraft`, `recordApproval`,
  `assessDraftRelease`) — the manifest *is* the draft body, so approving it approves these exact
  template/mapping/fact inputs; no second approval system. The P6 intake storage convention
  (`source-documents` bucket, `{ownerId}/{caseId}/{docId}-{name}` keys) is reused for the
  generated artifact. Also reuses the FMS registry, canonical tax model and `tax_form_registry`.
- **MISSING:** (1) verified overlay mappings for the other 8 FMS templates — deliberately not
  populated, because coordinates must be measured per template (see DECISION below);
  (2) Agentur fuer Arbeit and Jobcenter official templates; (3) an approved approach for
  non-CP1252 values (e.g. Polish/Cyrillic names) — currently refused rather than transliterated.
- **DEPENDENCIES:** P8 (satisfied, reused), P6 (facts), `pdf-lib` 1.17.1 (owner-approved).
- **BLOCKERS:** none technical. Remaining work is per-template measurement, which is bounded and
  mechanical, not blocked.
- **DONE CRITERIA:** the original official German template is filled unmodified using only
  confirmed facts; unknown fields stay empty; output previewable, reviewable, approvable,
  downloadable; template provenance recorded; approval bound to the exact current
  content/input hash; tests, build, real verification pass.
  **Met for the reference form. Not yet met across all target forms.**
  **Live E2E observed 2026-09-25** on a real authenticated case (`Steuer 2025`,
  `horizon_module=steuererklaerung`): the UI generated the reference form, the artifact was
  stored privately and queued as a draft (`Amtliches Formular Hauptvordruck ESt 1 A
  (034037_25)`), `pdf_form_generated` was written to the audit trail, the manifest recorded 7
  filled fields (`name`, `vorname`, `geburtsdatum`, `idnr`, `strasse`, `plz`, `wohnort`) and 0
  blanks, and the downloaded PDF's recomputed SHA-256 equalled the manifest's recorded
  `Ausgabe-SHA-256` exactly (`8850f70e…1eba`, 62,971 bytes, `%PDF-1.7`). The
  `unsupported_format_value` refusal was also observed live when a value did not match its
  declared `date_de` format (`1988-03-14` accepted, `14.03.1988` refused) — the guard refuses
  rather than reinterpreting.
- **OWNER DECISION RECORDED:** the 9 FMS 2025 templates are static printable PDFs (no
  `/AcroForm`, no `/Widget`, no XFA packet; a field lookup returns no fields). The owner
  authorised an overlay approach, one reference form first, with coordinates verified against
  the exact template SHA-256. `pdf-lib` was approved as the writer. Both engine paths are kept:
  AcroForm templates fill real field names; static templates use hash-bound measured overlays.
- **FROZEN:** NO

---

## PHASE 10 — SIGNATURE ENGINE

- **ID:** P10
- **SYSTEM:** Signature engine
- **TARGET ROUTES:** consumed by P14 and P15; signing surface inside the case workspace
  (`components/guide/signature-panel.tsx`, mounted in `components/guide/case-workspace.tsx`).
- **CURRENT STATUS:** PARTIAL / VERIFIED FOR THE REFERENCE FORM — NOT DONE. A visual signature is
  applied end-to-end to a real generated document for the one template whose signature area has
  been measured (Hauptvordruck ESt 1 A 2025, page 2), producing a new signed artifact with its
  own provenance and audit entry. The mechanism is proven; breadth and the remaining criteria
  below are not met. This module is **NOT FROZEN** and must not be treated as complete.
- **CURRENT IMPLEMENTATION:** `lib/horizon/pdf/`:
  `signature-map.ts` holds measured signature placements bound to the template SHA-256 and tax
  year, with the measured evidence recorded (`labelBox`, `areaBox`, identification method). It is
  a registry separate from `overlay-map.ts` on purpose, so a template can be fillable and not yet
  signable without implying otherwise. `signature-plan.ts` validates a signing request and
  defines the signature type vocabulary (currently the single value `VISUAL`), the raster formats
  (`png`, `jpeg`, detected by magic bytes) and the date formatting. `signature-writer.ts` draws
  the image and date with `pdf-lib` onto a *copy* of the approved bytes. `signature-actions.ts`
  runs the flow: locate the artifact from the `pdf_form_generated` audit entry, re-hash the
  downloaded bytes, match the draft by its recorded output hash, require a current approval, sign,
  store privately, attach, save the signed record as a draft, and audit. `manifest.ts` gains
  `PdfSignatureRecord`, `renderSignatureBody`, `renderSignatureSubject`.
- **REUSE:** P8 approval/hash binding (`getApprovalState`, `listApprovals`, `recordApproval`) —
  the signature is refused unless the approval still matches the current content hash, so a
  changed document cannot be signed under a stale approval and no historic approval row is
  rewritten. P9 generation audit trail (`pdf_form_generated` records `storage_path`,
  `output_sha256`, `source_sha256`) is the source of truth for what is being signed. The P6/P9
  private-storage convention is reused for the signed artifact, including rollback of the
  uploaded object and the attached row if a later write fails. `encoding.ts` guards the date
  before pdf-lib measures it.
- **MISSING:** (1) measured signature placements for the other 8 FMS templates — none are
  populated, and an unverified template is refused rather than guessed at; (2) a legally stronger
  signature (qualified/advanced electronic, or a cryptographic/PAdES signature) — not attempted,
  not approved, and out of scope for a visual signature; (3) multi-signatory support (the
  reference area is captioned "Unterschrift(en)", i.e. plural for spouses, and only a single
  signature is drawn); (4) signature of documents that are not engine-generated PDFs.
- **DEPENDENCIES:** P8 (satisfied, reused), P9 (satisfied for the reference form), `pdf-lib`
  1.17.1 (owner-approved; `embedPng`/`embedJpg` used, no new dependency).
- **BLOCKERS:** none technical for the reference form. The remaining DONE criteria below depend
  on owner decisions, not on implementation.
- **DONE CRITERIA:** provider/approach explicitly approved; a signature applies only to a
  currently approved document; the signed artifact is a new artifact and the approved bytes are
  never mutated; unsigned and signed hashes and the approval content hash are recorded and
  auditable; an unverified placement is refused rather than estimated; the UI states plainly that
  this is not a qualified or advanced electronic signature; an acceptance button is never
  presented as a signature; tests, build and real functional verification pass.
  **Met and verified for the reference form. The legal-strength question and the multi-signatory
  question remain open owner decisions, so P10 is NOT DONE.**
- **VERIFICATION RECORDED (reference form, 2026-09-25, live artifact):** the P10 engine was run
  against the *live* approved artifact downloaded from P15 (`…/tax-form`, case `Steuer 2025`):
  approved SHA-256 `8850f70e…`, 62,971 bytes, 2 pages. `planSignature` accepted it
  (`dateText` "25. September 2026", format `png`); `applyVisualSignature` drew onto a copy,
  returned a distinct signed SHA-256 (`11b36db6…`) on page 2, page count stayed 2, and the input
  bytes were unchanged after the write (re-hashed). This re-confirms the writer against
  production bytes rather than a fixture.
- **VERIFICATION RECORDED (reference form, 2026-09-19):** a real signed PDF was produced from the
  real P9 artifact. Unsigned SHA-256 `dc122a91…`, signed SHA-256 `45fe3737…` (distinct). The
  applied signature image and the drawn date both extract inside the measured area
  (x 39.17-535.71, top 688.08-719.64); the date lands at top 709.50 in the left column
  (x 57.18-99.70), clear of the image; the pre-existing QR image at top 449.40 is untouched. Page
  count stays at 2, and every unsigned value on page 1 (`Müller-Öztürk`, `Anna`, `Berlin`) is
  still present after signing. The writer leaves the input bytes unchanged (verified by hashing
  the input after the write). 31 dedicated tests pass.
- **NOT A CRYPTOGRAPHIC SIGNATURE:** the hash chain proves *what* was signed, not *who* signed in
  any legal sense. No certificate, no PAdES, no cryptographic binding to the signer.
- **FROZEN:** NO

---

## PHASE 11 — EMAIL CONNECTION + SEND ENGINE

- **ID:** P11
- **SYSTEM:** Email connection and send engine
- **TARGET ROUTES:** consumed by P12–P17.
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN. The send engine and a
  generic SMTP transport are implemented. No real provider is configured in any deployment, so no
  message has been sent to a real recipient from a running environment. Owner decision: keep
  `IN_PROGRESS / IMPLEMENTED — NOT DONE — NOT FROZEN` until a real provider and runtime E2E are
  verified.
- **CURRENT IMPLEMENTATION:** download only (`/api/office/drafts/{id}/export` returns
  `text/plain` attachment). An outbound webhook with a shared secret exists in
  `/api/service-requests`. There is no inbound mailbox connection. The **send engine** now exists
  under `lib/horizon/send/`: a provider abstraction (`provider.ts`), a registry whose default
  provider truthfully reports unavailability (`registry.ts`), recipient validation that never
  derives an address (`recipient.ts`), pure send policy (`send-plan.ts`), outcome recording
  (`record.ts`), and orchestration (`actions.ts`) with a form entry point (`submitSend`). A
  `SendPanel` is wired into the case workspace after the signature panel. A **generic SMTP
  transport** now exists: `smtp-config.ts` (server-side environment parsing with all-or-nothing
  validation), `smtp-provider.ts` (nodemailer over STARTTLS or implicit TLS), `attachment-bytes.ts`
  (storage read plus SHA-256 recomputation, returning the hashed bytes), and `registry.ts` selecting
  SMTP only when fully configured. `EmailAttachment` and `VerifiedAttachment` now carry the verified
  bytes so the transport sends exactly what was hashed.
- **REUSE:** draft/approval model (P8), audit spine, `correspondence_drafts.attachments`,
  `approvals`, and the n8n webhook pattern (`N8N_WEBHOOK_SECRET`).
- **DESIGN DECISION:** an outbound send is recorded as a normal artifact — a new draft carrying
  the outcome, plus an `email_send_attempted` audit event — rather than a new table. The case
  engine already provides owner-scoped RLS and column grants for both, and the approval engine
  already binds a draft to a content hash. A parallel `sends` table would duplicate all three and
  need its own migration and RLS review. Delivery state lives in the audit metadata, not in the
  draft's content hash, so recording a failure cannot invalidate the approval of the message.
- **SEND RECORD GUARD:** because a send record is itself a draft, `correspondence_drafts.model` is
  set to `horizon-send-record` and the policy refuses to send any draft carrying that marker
  (`IS_SEND_RECORD`). Without it, the record of a delivery could itself be offered for sending.
- **MAIL DEPENDENCY:** `nodemailer@7.0.9` plus the types-only `@types/nodemailer@7.0.4`, both
  explicitly owner-approved. No second mail SDK was added.
- **SMTP CONFIGURATION:** exclusively server-side environment variables —
  `HORIZON_SMTP_HOST`, `HORIZON_SMTP_PORT`, `HORIZON_SMTP_USER`, `HORIZON_SMTP_PASSWORD`,
  `HORIZON_SMTP_FROM`, with optional `HORIZON_SMTP_SECURE` and `HORIZON_SMTP_HELO_NAME`. No host,
  port, sender or credential is hardcoded. Configuration is validated as a whole: a partial or
  malformed configuration yields `PROVIDER_UNAVAILABLE` with nothing transmitted, never a
  best-effort connection. Certificate verification stays at its secure default and is not
  configurable. STARTTLS is required (`requireTLS`) on the non-implicit-TLS path.
- **MISSING:** an inbound mailbox connection (Gmail/IMAP), delivery-status (bounce/DSN) handling
  from a real provider, and end-to-end runtime verification against a real configured provider in a
  running environment.
- **DEPENDENCIES:** P8, P1 (privacy/legal wording), P4 (settings surface).
- **BLOCKERS:** no real SMTP provider is configured in any environment, and no credentials may be
  committed, so runtime end-to-end verification against a real provider is still outstanding. The
  mailbox provider (inbound) and the consent model remain unapproved; `DOCUMENT_FEASIBILITY_AUDIT.md`
  states notification/connector work requires a configured connector, consent model,
  retry/idempotency, audit logs, and a deployment environment. **Where SMTP is not configured, every
  send ends as `PROVIDER_UNAVAILABLE` with nothing transmitted — verified behaviour, not a defect.**
- **DONE CRITERIA:** an approved mail channel is connected; sending requires a current approval;
  the recipient is recorded data confirmed per send and never derived; attachments the user sees
  are bound by SHA-256 to the bytes actually sent; every send is idempotent and audited; a
  duplicate is refused without an explicit resend; delivery status is tracked; failures are
  surfaced and never silently retried; **no path reports success without a provider message id**;
  tests, build, real verification pass. Implemented and unit-verified now: approval gating,
  recipient validation, attachment hashing/selection/limits, idempotency, duplicate protection,
  send-record guard, truthful unavailable/blocked/failed/sent outcomes, and outcome recording.
  Implemented: a generic SMTP transport with all-or-nothing server-side configuration, STARTTLS
  enforcement, secure certificate verification by default, and no path that reports `SENT` without a
  transport-issued message id.
  A real end-to-end check was run locally against a live SMTP server with a real STARTTLS handshake:
  the provider returned `SENT` with a genuine provider message id, and the attachment bytes decoded
  from the received `DATA` payload matched the verified SHA-256 byte for byte. That run used
  test-local credentials and a test-local certificate; it is not a substitute for verification
  against a real configured provider.
  Outstanding: a real configured provider and runtime end-to-end verification in a running
  environment. `nodemailer` transmits over the network and cannot be covered by unit tests alone, so
  the SMTP transport has no committed automated test; `smtp-config.ts` is unit-tested (12 tests).
- **FROZEN:** NO — owner decision: not FROZEN until a real provider and runtime E2E are verified.

---

## PHASE 12 — AGENTUR FÜR ARBEIT

- **ID:** P12
- **SYSTEM:** Agentur für Arbeit module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, running on the shared
  case engine.
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (implementation, tests and
  build verified; browser-driven E2E pending). **Authenticated runtime observed 2026-09-25:** an
  `application` case (`Agentur Test`, institution `Agentur fuer Arbeit`) created through the live
  API (`201`) rendered its Agentur surface live at `/{locale}/guide/{id}` (`200`), including the
  task panel ("Arbeitsuchend", "Arbeitslos"), the official-source context and the official
  Veränderungsmitteilung form entry.
- **CURRENT IMPLEMENTATION:**
  - `lib/horizon/agentur/registry.ts` — four canonical BA tasks (`arbeitsuchend_melden`,
    `arbeitslos_melden`, `arbeitslosengeld_beantragen`, `veraenderungen_mitteilen`), each with the
    current official route, the BA's own links, and task-scoped required/optional fact keys. Every
    cited page and online service on `arbeitsagentur.de` was retrieved and returned HTTP 200.
  - `lib/horizon/agentur/mappings.ts` — fact→field mappings for the one fillable official form.
  - `lib/horizon/agentur/copy.ts` — BG/DE copy, typed so a new task cannot render unlabelled.
  - `lib/horizon/agentur/actions.ts` — server action recording the chosen task as a confirmed,
    audited, user-sourced fact on the case.
  - `components/agentur/agentur-task-panel.tsx` — the in-case surface: choose the task, see the
    current official route, and reach the official source.
  - `lib/horizon/pdf/registry.ts` — `AGENTUR_FUER_ARBEIT_TEMPLATES` with the official
    Veränderungsmitteilung (BA030410, printed revision `GR 22 - 09/2020`), source SHA-256, and
    measured `acroform` + `xfaHybrid` capability.
  - `lib/horizon/pdf/actions.ts` and `lib/horizon/case/missing-info.ts` — Agentur mappings wired
    into the fill path; missing-information derivation is now module- and task-aware.
- **REUSE:** shared engines E1–E10, the P9 writer/inspection path, and the P5 case spine.
- **MISSING:** authenticated browser runtime E2E; additional BA form mappings only when a real
  workflow needs them (coordinates must be measured from the exact template bytes).
- **SCOPE DECISION (recorded, not a defect):** three of the four tasks are `online_only` or
  `online_preferred` and expose no official fillable PDF. They are represented as online-only and
  link to the BA's own service rather than being given an invented PDF equivalent.
- **DEPENDENCIES:** P5, P6, P7, P8, P9 (and P10/P11 for sign/send).
- **BLOCKERS:** none for implementation. Runtime verification requires an authenticated session.
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
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE (browser-driven E2E pending).
  **Authenticated runtime observed 2026-09-25:** an `application` case created with
  `horizon_module = jobcenter` rendered its module surface live at `/{locale}/guide/{id}` (`200`),
  showing the Jobcenter task panel and the official German form context. Repository creation and
  the rendering path both exercised against the live database.
- **CURRENT IMPLEMENTATION:** shipped as a launch vertical slice on the existing engines:
  `lib/horizon/jobcenter/` (task registry, official-source citations, conditional Anlagen,
  copy, `selectJobcenterTask` action), `components/jobcenter/jobcenter-task-panel.tsx`, the
  task-aware `requiredKeysFor`/`selectedJobcenterTask` in `lib/horizon/case/missing-info.ts`,
  the Jobcenter PDF entries in `lib/horizon/pdf/{registry,actions}.ts`, and the official
  04/2026 Jobcenter PDFs. The chosen task is recorded as a confirmed, audited fact on the case
  spine; the online-first fact is represented as such rather than converted to a paper form.
- **REUSE:** shared engines E1–E10; the P12 module pattern; `lib/horizon/pdf/` for the one
  fillable official form.
- **MISSING:** authenticated browser end-to-end verification.
- **DEPENDENCIES:** P5, P6, P7, P8, P9, and P12 (Agentur für Arbeit pattern).
- **BLOCKERS:** none technical.
- **DONE CRITERIA:** the Agentur für Arbeit workflow is reproduced using the same shared engines,
  with Jobcenter-specific form registry, required fields, and recipient rules;
  no duplicated backend; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 14 — KÜNDIGUNG

- **ID:** P14
- **SYSTEM:** Kündigung module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, sharing the case engine.
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE (authenticated runtime E2E pending).
  **Authenticated E2E partially observed 2026-09-25:** a real `cancellation` case
  (`Kuendigung Test`, institution `Test GmbH`) was created through the live API with an
  authenticated owner session (`201`). The deterministic generator refused to draft with only
  partial facts and returned `needsInfo` with localized German questions (`recipient`,
  `subject`, `request`) rather than inventing them; after those confirmed facts were supplied it
  produced draft v1 `Kuendigung des Vertrags VZ-99231` with the deterministic model tag
  (`deterministic-rules-v1`), a correct German body and the recipient carried from the confirmed
  facts. Draft export returned `200` with the corrected HORIZON filename (see the branding fix
  note). Remaining gate: preview → approve → download driven from the browser, and send is
  blocked on P11.
- **CURRENT IMPLEMENTATION:** a launch vertical slice on the existing engines:
  `lib/horizon/kuendigung/facts.ts` (confirmed-fact reading, the timing taxonomy and the single
  § 309 Nr. 9 BGB calculation rule), `letter.ts` (deterministic German letter),
  `manifest.ts` (provenance embedded in the approved draft body), `copy.ts` (de/bg),
  `actions.ts` (`prepareKuendigungDraft`), `components/kuendigung/kuendigung-panel.tsx`, and
  `lib/horizon/pdf/letter-writer.ts` (real PDF via the already-approved `pdf-lib`).
  Adjacent reusable material from the audit is reused, not rebuilt: the contracts workspace,
  `lib/contracts/extraction.ts`, radar date logic and the `cancellation` case intent.
- **REUSE:** contracts workspace, contract extraction, radar date logic, `contracts` table,
  `case_messages`, `correspondence_drafts`, P8 approval, P9 PDF writer, P10/P11 gates.
- **MISSING:** authenticated browser end-to-end verification of prepare → review → approve →
  download. Visual signature of the generated letter is deliberately not offered (no verified
  placement exists for a self-drawn artifact).
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
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (tax-year-aware registry and
  case wiring shipped; unit tests and build verified; authenticated runtime E2E pending).
- **ADDED THIS PHASE:** `lib/horizon/steuer/registry.ts` (tax-year-aware registry: only 2025 is
  `supported`; 2026 is `not_yet_published`; other years `out_of_scope`; every entry carries an
  official source and a verification date), `lib/horizon/steuer/actions.ts` (records the chosen
  year as a confirmed case fact and refuses an unsupported year with its reason),
  `lib/horizon/steuer/copy.ts` (BG + DE), `components/steuer/steuer-panel.tsx` (year selection,
  year-scoped form list, Anlagen from confirmed facts only, signature availability, gated
  download), `app/api/horizon/cases/[id]/tax-form/route.ts` (owner-scoped, approval-bound,
  integrity-checked download), `readFormOutputSha` in `lib/horizon/pdf/manifest.ts`.
  `OfficialFormPanel` no longer hardcodes 2025: it shows a tax year's forms only when that year is
  supported, and shows none otherwise. 71 unit tests in `lib/horizon/steuer/steuer.test.ts`.
  No 2025 Form-ID, row, threshold or rule is reused for 2026.
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
  **Live E2E observed 2026-09-25:** on the real `Steuer 2025` case the tax-year selector offered
  the verified 2025 official templates (`Hauptvordruck ESt 1 A` plus the 8 Anlagen) and correctly
  reported 2026 as "Amtlich noch nicht veröffentlicht", with no 2025 form or rule reused for
  2026. The generated form downloaded only through the approval gate: `403 not_approved` before
  approval, then `200` with a signed private-storage URL after approval. Automatic submission
  remains absent by design.
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
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (evidence-based analysis
  engine and case panel shipped; unit tests and build verified; authenticated runtime E2E pending).
- **ADDED THIS PHASE:** `lib/horizon/unterlagen/deadline.ts` (three-way deadline evidence:
  `printed` with the verbatim line quoted, `calculated` only from a period the document itself
  states plus a reference date it states and always flagged for user verification, `unknown`
  otherwise — no German statutory period is hardcoded, and an impossible printed date or a period
  with no reference date yields no date), `lib/horizon/unterlagen/classify.ts` (classification
  from printed cues with the matching line quoted, `unclear` rather than a nearest guess, plus
  three asymmetric risk states whose caveats say what was *checked* rather than what is *true*),
  `lib/horizon/unterlagen/analysis.ts` (assembles the above from stored page text; a model may
  later explain this output but never produces it), `lib/horizon/unterlagen/copy.ts` (BG + DE),
  `components/unterlagen/unterlagen-panel.tsx` (classification with a user-correction control,
  deadline with evidence kind and quote, risk state with caveat, one next action),
  `lib/horizon/unterlagen/actions.ts` (records a user correction as a confirmed fact),
  `CaseEngineRepository.listDocumentPages` (reads existing `document_pages` under the existing
  `document_pages_read_own` policy). 48 unit tests.
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
- **CURRENT STATUS:** IN_PROGRESS — IMPLEMENTED — NOT DONE — NOT FROZEN (contract-to-case
  linkage and dashboard entry shipped; archive, Radar and optimize surfaces reused; tests and build
  verified; browser-driven E2E pending). **Authenticated runtime observed 2026-09-25:** a contract
  was created through the live `/api/contracts` (`201`) with a household and audit event, and
  `/{locale}/vertraege` returned `200` under a live owner session. `GET /api/contracts` is not a
  supported method (`405`), which is correct — the surface is create/update/delete plus the page.
- **ADDED THIS PHASE:** `lib/horizon/contracts/linkage.ts` (evidenced-only `contractFactSeeds`
  under the P14 vocabulary; a field the archive does not hold is *absent* rather than empty, a
  malformed date is dropped rather than interpreted, a date from a `needs_review` contract is
  carried across unverified so P14 refuses to rely on it, and the archive's `cancellation_deadline`
  is deliberately *not* seeded because a cancel-by date is not a termination date),
  `lib/horizon/contracts/actions.ts` (`startKuendigungFromContract`: reads the contract through the
  session client so `contracts_household_owner_all` and the household check both apply; creates the
  case through the shared engine; auto-confirms facts only for a `confirmed` contract; audits
  `contract_linked`), `lib/horizon/contracts/copy.ts` (BG + DE), and a "Kündigung vorbereiten"
  action per contract row. `/{locale}/vertraege` added as a dashboard shortcut. 18 unit tests.
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
