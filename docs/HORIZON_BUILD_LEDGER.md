# HORIZON by VZG — Build Ledger

Status: **IMPLEMENTATION STATUS LEDGER** (documentation only)
Companion to: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md)
Base: `origin/main` @ `1d844a2a069a0119fdea8ebc40ffa110b97afcb3`; navigation N0–N2 landed at
`56b0aa5`. N3/N4/N6 are implemented and verified but were uncommitted at reconciliation time, so
the phase records below describe `main` unless a record says otherwise.

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
| P0 | MASTER MAP + GOVERNANCE | DONE — CRITERIA MET 2026-09-25 (master map + ledger + checklist exist; DONE→FROZEN and ACTIVE_PHASE/ALLOWED_FILES/FROZEN_FILES/OUT_OF_SCOPE rules carried in `PROJECT_RULES.md`/`AGENTS.md`/`AI_WORKFLOW.md`; sequence fixed; Capital out of scope; `git diff --check` clean); FROZEN pending owner acceptance | NO | YES |
| P1 | PUBLIC LAYER 0 | FROZEN — OWNER ACCEPTED 2026-09-25 | YES | SATISFIED |
| P2 | AUTH + FIRST LOGIN + ONBOARDING | DONE — END-TO-END RUNTIME VERIFIED 2026-09-25 (blocker migration applied + live `profiles.upsert` 200; fresh-user login/onboarding/second-login E2E pass; FROZEN pending owner acceptance) | NO | YES |
| P3 | HORIZON GUIDE | VERIFIED — AUTHENTICATED RUNTIME E2E PASS (`/de/guide`, case workspace 200; content renders) | NO | YES |
| P4 | HORIZON HOME + FIVE ENTRY MODULES | VERIFIED — AUTHENTICATED RUNTIME E2E PASS 2026-09-25 (`/de/dashboard` renders the five entries with live per-module counts; each of the five entries was clicked and created a real case; real account routes `/de/profil`, `/de/vertraege`, `/de/steuer`, `/de/documents`, `/de/security` respond) | NO | YES |
| P5 | SHARED CASE ENGINE | MODEL + REPOSITORY VERIFIED — LIVE DB + RLS RE-VERIFIED 2026-09-25 (two real authenticated users: owner case/fact writes 201; other user read `[]` for case, fact and profile; spoofed-owner fact insert `42501`; cross-owner profile PATCH returned 0 rows — row unchanged; anon denied `401`; owner positive control 200) | NO | YES |
| P6 | DOCUMENT INTAKE / OCR / EXPLANATION | DONE — ALL FIVE INPUT TYPES + REAL OCR + TWO-STACK RECONCILIATION 2026-09-25 (`ocrScannedPdfPages` on the real official `ESt_1_A_2025.pdf` page 1: 1,650 chars, 0.70 confidence, correctly read printed title); page-level evidence reachable on the HORIZON path (authenticated browser E2E read a real uploaded PDF into `document_pages`, `UPLOADED → READY`, and the P16 explanation quoted its text); one shared READY rule now used by both stacks (`lib/documents/extraction-contract.ts`), closing the office path's empty-extraction `READY` bug (live: text-free PDF → `NEEDS_CONFIRMATION`) | NO | YES |
| P7 | CONTEXT AI ASSISTANT | VERIFIED (RAILS/CONTEXT) — LIVE CALL REFUSES CLEANLY 2026-09-25 (`POST /api/horizon/cases/{id}/assistant` → `401 AUTHENTICATION_REQUIRED` without session, `503 AI_PROVIDER_NOT_CONFIGURED` with session; no crash, no partial stream); rail ordering fixed so validation/ownership run before the provider gate (live: foreign case `404`, malformed body `400`, previously both `503`); end-to-end answer owner-blocked on provider key | NO | YES |
| P8 | DRAFT / REVIEW / USER APPROVAL | VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25 (acknowledgement enforced, draft released, download `403 not_approved` before → `200` after approval; API hash-binding `400`/`201`); idempotent re-approval of unchanged content now returns the existing approval (`201`) instead of leaking the unique-constraint message | NO | YES |
| P9 | OFFICIAL PDF FORM ENGINE | DONE — 9 OF 9 MAPPINGS VERIFIED 2026-09-25. Every FMS 2025 template carries a measured overlay mapping asserted against the real template bytes (label x/width and baseline-origin top within 0.6 pt); all 9 generate a real `%PDF-` artifact with page count preserved and source bytes untouched; 8 of 8 Anlagen produced drafts through the authenticated browser, each naming its own official Form-ID; full chain re-verified generate → approve → gated download → real signed PDF containing `Müller`/`Anna` | NO | YES |
| P10 | SIGNATURE ENGINE | PARTIAL / REFERENCE FORM VERIFIED — OWNER DECISION PENDING. AUTHENTICATED BROWSER E2E PASS 2026-09-25 (PNG+date signed a real approved form → new VISUAL draft v2 with distinct signed SHA-256, page 2; approve → gated download real PDF 62,961 bytes). Breadth gap closed as INAPPLICABLE 2026-09-25: the 8 Anlagen carry no signature wording and are attachments, so only the declaration is signable (locked in by test). Remaining: owner decision on QES/PAdES and two-signature joint assessment | NO | YES |
| P11 | EMAIL CONNECTION + SEND ENGINE | DONE — LIVE SEND E2E PASS 2026-09-25 (real authenticated TLS SMTP session: `SENT` with provider message id; received `DATA` decoded — correct From/To/subject/body; duplicate refused, explicit resend gated then transmitted; send record no longer offered as a message). Remaining owner decision: the production provider/credentials. Inbound mailbox and DSN remain unapproved scope | NO | YES |
| P12 | AGENTUR FÜR ARBEIT | VERIFIED — AUTHENTICATED BROWSER E2E PASS (module entry, 4-task selector, task recorded as confirmed fact + audited) | NO | YES |
| P13 | JOBCENTER | VERIFIED — AUTHENTICATED BROWSER E2E PASS (module entry, 3-task selector, task recorded as case fact + audited) | NO | YES |
| P14 | KÜNDIGUNG | VERIFIED — AUTHENTICATED BROWSER E2E PASS (contract→case link, draft v1, approval, gated real-PDF download) | NO | YES |
| P15 | STEUERERKLÄRUNG | VERIFIED — AUTHENTICATED BROWSER E2E PASS (tax-year panel, 2025 supported, 2026 unpublished notice, no ELSTER transmit) | NO | YES |
| P16 | UNTERLAGEN ERKLÄREN | VERIFIED — AUTHENTICATED RUNTIME E2E PASS (pasted-text/email intake now analysed; classification + quoted evidence, printed deadline, risk caveat, next action rendered) | NO | YES |
| P17 | CONTRACT MANAGEMENT | VERIFIED — AUTHENTICATED BROWSER E2E PASS (archive render, Kündigung-vorbereiten link creates seeded `kuendigung` case, `contract_linked` audited); guide→case workspace re-confirmed 2026-09-25 for all five intents | NO | YES |
| N0–N6 | HORIZON NAVIGATION ARCHITECTURE | N0–N2 DONE at `56b0aa5`; N3/N4/N6 implemented + verified, code uncommitted at reconciliation (tests, typecheck, lint, i18n, build). N5 and N7 NOT STARTED — owner decision | NO | YES for N5/N7 |
| — | CAPITAL (PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE) | PRESERVED — NOT IN ACTIVE SEQUENCE | NO | YES (to resume) |

---

## PHASE 0 — MASTER MAP + GOVERNANCE

- **ID:** P0
- **SYSTEM:** Master map and development governance
- **TARGET ROUTES:** none (governance only)
- **CURRENT STATUS:** DONE — CRITERIA MET 2026-09-25 (FROZEN pending owner acceptance).
  All listed DONE criteria were verified directly: `docs/HORIZON_MASTER_MAP.md`,
  `docs/HORIZON_BUILD_LEDGER.md` and `docs/HORIZON_EXECUTION_CHECKLIST.md` exist; the DONE → FROZEN
  rules and the ACTIVE_PHASE / ALLOWED_FILES / FROZEN_FILES / OUT_OF_SCOPE requirement are carried
  in `PROJECT_RULES.md`, `AGENTS.md` (and `.agents/`) and `AI_WORKFLOW.md`; the canonical P0–P17
  sequence is fixed in the master map; Capital is classified outside the active sequence in both the
  map and the ledger; `git diff --check` passes. The remaining gate is the owner's acceptance of
  Phase 0, which is the same owner-only step that freezes every phase — it is not a build blocker.
  (No application code, Supabase, package, lockfile, env or deployment file is touched by P0.)
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
- **CURRENT STATUS:** **DONE — END-TO-END RUNTIME VERIFIED 2026-09-25 (FROZEN pending owner acceptance).**
  The production blocker is fixed: migration `20260925020000_profiles_onboarding_update_id_grant.sql`
  is applied and the live `profiles.upsert()` (`Prefer: resolution=merge-duplicates`) now returns
  `200` (was `403 / 42501`). A complete fresh-user production journey was then driven through the
  real UI against the live project and the running app:
  admin-confirmed fresh user `p2e2e.fresh.1790314886@vzg-e2e.test`
  (`ea1ec121-d2a5-4de4-bdf6-d8f1e5756384`) → login → first-login gate redirected to
  `/de/onboarding/profile` → profile step saved (`first_name=Maria`, `last_name=E2E`,
  `locale=de`, `preferred_language=de`) and advanced to `/de/onboarding/tour` → tour advanced to
  `/de/onboarding/finish` → finish advanced to `/de/dashboard`, which rendered the full workspace
  (sidebar, five module entries with "Noch nicht begonnen", zero-state counts) → logout returned to
  the public `/de` landing with the session cleared → second login landed **directly on
  `/de/dashboard`** with no onboarding re-entry. Persisted state after the journey:
  `onboarding_step=completed`, `first_name=Maria`, `last_name=E2E`, `locale=de`.
  (E-mail confirmation: the project's built-in mailer is rate-limited
  (`429 over_email_send_rate_limit`), so no message could be delivered to an inbox. The
  confirmation *link* path was verified directly instead: `admin/generate_link` produced a
  `type=signup` verify URL, `GET /auth/v1/verify` returned `303` with a valid `access_token`
  for the correct user id, and the confirmed-user onboarding journey above was then driven end to
  end. The project's Site URL is `https://vzgplattform.onrender.com` and Supabase rewrites the
  confirmation redirect to it, so the link cannot be pointed at the local dev host — this is
  project configuration, not an application defect.)
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
- **MISSING:** nothing blocking. First-login acceptance evidence is now captured (see
  `CURRENT STATUS`); the recovery/MFA edge paths are unit-covered and were not re-driven in this
  run. Migration `20260925020000_profiles_onboarding_update_id_grant.sql` is applied in production.
- **DEPENDENCIES:** P0; consumes frozen P1 public entry points without modifying them.
- **BLOCKERS:** none. The owner-side migration `20260925020000` is applied and
  `profiles.upsert()` (`merge-duplicates`) returns `200` live. Full first-login E2E is verified.
  Only residual non-blocking gap: the auth mailer is rate-limited in this project
  (`429 over_email_send_rate_limit`), so the e-mail confirmation *link* was not clicked; the
  confirmed-user state was reached through the admin API instead.
- **DONE CRITERIA:** sign up → e-mail confirmation → login → first-login check → minimal profile
  → short click guide → dashboard works end-to-end; the tour runs once and is resumable;
  onboarding completion is persisted; legacy `language` state redirects to profile without a
  visible language card; locale switch remains available in the persistent header; recovery,
  MFA and logout routes do not enter redirect loops; tests and build pass; real production
  verification performed. **Status: satisfied for the first-login journey** — schema/migration,
  completed-profile persistence and the full fresh-user production first-login E2E are verified
  (see `CURRENT STATUS`). The only residual gap is non-blocking: the confirmation *link* was not
  clicked because the project mailer is rate-limited, so that step was completed through the admin
  API instead.
- **FROZEN:** NO

---

## PHASE 3 — HORIZON GUIDE

- **ID:** P3
- **SYSTEM:** Persistent HORIZON Guide
- **TARGET ROUTES:** `/{locale}/guide` with task tree: understand a document, reply to an
  authority, fill an official form, cancel a contract, I do not know what to do.
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED RUNTIME E2E PASS 2026-09-25 (not DONE, not FROZEN).
  `/{locale}/guide` returned `200` under a live owner session and rendered all five task entries
  (understand a document, reply to an authority, fill an official form, cancel a contract, I do not
  know what to do), and each entry routes into the canonical case flow. Anon access redirects to
  login (`307`). 33 unit tests pass; the route, task tree and case-engine wiring exist and build.
- **CURRENT IMPLEMENTATION:** `/{locale}/guide` (`app/[locale]/guide/page.tsx`) renders
  `components/guide/guide-chooser.tsx`: the five task-shaped entries (understand a document,
  reply to an authority, fill an official form, cancel a contract, I do not know what to do)
  plus the user's open cases, with empty, error and loading states and localized copy.
  `lib/horizon/guide/intents.ts` is the single vocabulary for intents, icons, module mapping,
  `cases.intent` mapping and case titles; `lib/horizon/guide/actions.ts` creates a canonical
  case through the P5 engine; `lib/horizon/guide/guard.ts` centralises auth and locale
  normalisation and redirects to login rather than throwing when Supabase is unconfigured.
  `components/layout/horizon-sidebar.tsx` links the guide permanently ("Wegweiser"), so it stays
  reachable after onboarding. `unsure` routes to `general` rather than guessing a department.
- **REUSE:** `how-it-works` layout patterns, `module-page`, `guided-wizard` component,
  case intent vocabulary in `lib/office/supabase/database.ts`
  (`explanation`, `reply`, `complaint`, `application`, `objection`, `cancellation`,
  `document_request`, `reminder`, `free_email`).
- **MISSING:** no route-level automated test exercising the chooser end to end (runtime behaviour
  was verified in an authenticated session on 2026-09-25; the entries create real cases through
  the P5 engine).
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED RUNTIME E2E PASS 2026-09-25 (not DONE, not FROZEN).
  `/{locale}/dashboard` returned `200` under a live owner session and rendered the five HORIZON
  entry modules with live per-module case counts (e.g. "Agentur für Arbeit 2 Vorgänge"); each of
  the five entries was clicked and created a real case. Registry unit tests pass (11 after N3
  removed the shortcut-restatement cases).
- **CURRENT IMPLEMENTATION:** `/{locale}/dashboard` renders `VzgDashboard`, which reads
  `profiles`, `contracts`, `documents`, `deadlines` via `ensureHousehold` and composes
  `components/horizon/horizon-home.tsx`. That surface presents exactly the five HORIZON entry
  modules (Agentur für Arbeit, Jobcenter, Kündigung, Steuererklärung, Unterlagen erklären) from
  `lib/horizon/modules/registry.ts`, each a real form submit through
  `lib/horizon/modules/actions.ts` into the shared P5 case engine — the same engine and the same
  destination as the guide, so the two surfaces cannot drift. Per-module case counts are resolved
  through `resolveCaseModule`, so pre-P5 rows are attributed by legacy intent rather than dropped.
  The sidebar owns the workspace destinations (`lib/navigation/horizon-nav.ts`); the dashboard no
  longer restates them (N3 removed the registry's `homeShortcuts`), and its single primary CTA is
  "Vorgang starten" → `/{locale}/guide`. Module labels come from the guide vocabulary, so the two
  surfaces cannot disagree.
  Supporting components: `workplace-action-center`, `missing-information-interviewer`,
  `smart-dashboard-preview`, `dashboard-workspace`.
- **REUSE:** `VzgDashboard`, `HorizonHome`, `workplace-action-center`,
  `missing-information-interviewer`, `dashboard-workspace`, `horizon-sidebar`, `module-page`,
  `module-workspaces`, `smartDashboardRules`.
- **MISSING:** the dashboard still renders legacy-era cards alongside the HORIZON module entry, and
  `lib/kintex-navigation.ts` retains 10 modules (several flagged `planned`) that are not part of
  the HORIZON five; no route-level automated test of the dashboard (runtime behaviour was verified
  in an authenticated session on 2026-09-25).
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
- **CURRENT STATUS:** MODEL + REPOSITORY VERIFIED — LIVE DB/RLS RE-VERIFIED 2026-09-25 (not DONE,
  not FROZEN). Cross-user isolation was observed against the live project with real authenticated
  identities: a second user received `[]` for the first user's case/drafts/profile, a cross-owner
  `INSERT` into `extracted_facts` was rejected with `42501` (RLS policy) — re-confirmed live on
  2026-09-25 with an authenticated session and a spoofed `owner_id` — a cross-owner profile
  `PATCH` changed zero rows, and the owner's own case/fact/draft/approval writes all succeeded.
  The remaining gate to DONE/FROZEN is the module-wide authenticated E2E in P12–P17, not the
  isolation layer.
  Re-verified independently on 2026-09-25 through the REST surface with two freshly created real
  authenticated users: the owner's case and fact inserts returned `201`; the other user read `[]`
  for the owner's case, facts and profile; a spoofed-owner fact insert was refused with `42501`
  ("new row violates row-level security policy"); a cross-owner profile `PATCH` returned `200` with
  zero rows and the row was confirmed unchanged; anonymous read of the case was refused with `401`;
  and the owner's own positive-control reads returned the rows.
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
- **CURRENT STATUS:** DONE — ALL FIVE INPUT TYPES + REAL OCR + TWO-STACK RECONCILIATION
  2026-09-25 (not FROZEN). All five input types are accepted; real Tesseract OCR runs on real
  bytes; page-level evidence is reachable on the HORIZON path; and the two document stacks now
  share one READY rule. The evidence recorded below is retained from the earlier revision.
  **Runtime file-intake observed 2026-09-25 (authenticated):** a real 64,801-byte
  `application/pdf` was uploaded through the case workspace to the canonical `source_documents`
  spine at the CHECK- and policy-required `{ownerId}/{caseId}/{documentId}-{name}` path, and
  appeared in the live table with its SHA-256 and an `document_intake_added` audit entry; a text
  file renamed `.pdf` was refused on its bytes ("entspricht nicht ihrem angegebenen Typ"), so
  the magic-byte check is what governs admission rather than the client-declared type. The same
  upload was then extracted through `/api/office/documents/{id}/extract` returning `200` with
  both pages persisted to `document_pages` at confidence `1.0`, the row moving `UPLOADED → READY`
  and a `document_extracted` audit entry written.
  **Runtime HORIZON extraction observed 2026-09-25 (authenticated browser E2E):** the gap was that
  a case document could be stored but never read — `document_pages` stayed empty on the HORIZON
  path, so no page text existed and no fact could ever carry a `page_no`. A per-document
  "Auslesen" control now reads the file on demand (`lib/horizon/intake/extract.ts`,
  `extract-actions.ts`, `components/guide/document-extract-button.tsx`). Verified live:
  a real 147,956-byte `application/pdf` (BA Veränderungsmitteilung) was uploaded through the real
  file-intake form on a fresh `unterlagen_erklaeren` case, then read through the UI, moving
  `UPLOADED → READY` with 1 page at confidence 1.0, its text persisted to `document_pages`, and a
  `document_text_extracted` audit entry written. The P16 explanation then used that text: with
  pages present it classified the letter as "Behördenbescheid" and quoted the printed evidence
  ("GR 22 - 09/2020 … Veränderungsmitteilung"); with no pages it could only report "Nicht sicher
  bestimmbar". A second (signed Hauptvordruck) document was read the same way, `UPLOADED → READY`
  with pages 1–2. Cross-owner isolation re-verified: a second authenticated user reads none of the
  case, document or pages (RLS). 971 unit tests pass; `tsc` clean.
  **Runtime OCR observed 2026-09-25:** the real Tesseract path (`ocrScannedPdfPages`) ran against
  a real official template (`public/forms/ESt_1_A_2025.pdf`, page 1) and returned 1,650 characters
  at 0.70 confidence, correctly reading the printed title ("Hauptvordruck ESt 1 A",
  "Einkommensteuererklärung", "Sparzulage"). Provider-level OCR is therefore exercised on real
  bytes; **page-level evidence is now reachable on the HORIZON path** (see the browser E2E above:
  page text is persisted and the P16 explanation quotes it).
  **Upload transport fixed 2026-09-25.** The intake advertises files up to 10 MB
  (`CASE_DOCUMENT_MAX_BYTES`) because a scanned official letter routinely exceeds a
  megabyte, but a Next.js server-action body defaults to 1 MB. A real 3.87 MB
  image-only scan was therefore rejected by the framework *before* the action ran and
  surfaced as a raw `413 Body exceeded 1 MB limit` / `500` instead of a localized
  validation message — the advertised limit was unreachable. `next.config.mjs` now
  sets `experimental.serverActions.bodySizeLimit` to `"10mb"`, matching the value the
  action already enforces; the action still re-validates size, MIME and magic bytes.
  Re-verified live after the fix: the 3.87 MB scan uploaded (`Angehängt.`), a
  `3,872,163`-byte `source_documents` row appeared, and the per-document "Auslesen"
  control took it `UPLOADED → READY` with page 1 persisted at `0.84` confidence and
  2,354 characters of real OCR text ("Hauptvordruck ESt 1 A", "Einkommensteuererklärung",
  "Arbeitnehmer-Sparzulage") plus a `document_text_extracted` audit entry. Because the
  uploaded PDF has no text layer at all, that text can only have come from OCR.
  Locked by `lib/horizon/intake/document.test.ts` (the body limit and the intake limit
  must not drift apart again).
  **Two-stack reconciliation closed 2026-09-25.** The two document stacks each carried a private
  copy of the "when is a document READY" rule, and they had drifted: the HORIZON path refused to
  label an empty extraction `READY`, while the older office path decided the status with a bare
  `pages.some(...)`, which is `false` on zero pages and so reported `READY` for a document from
  which nothing had been read. The rule now has one definition,
  `lib/documents/extraction-contract.ts` (`documentStatusAfterExtraction`,
  `pageNeedsConfirmation`, `extractionRouteFor`, `EXTRACTABLE_MIME_TYPES`); the HORIZON intake
  re-exports it and the office workflow path (`lib/office/workflow/documents.ts`, both the PDF and
  the image-OCR branches) consumes it, so the same file cannot be labelled differently by the two
  stacks. Verified live: a real text-free PDF (`/tmp/e2e/no_text.pdf`) uploaded through the real
  office API and extracted through `/api/office/documents/{id}/extract` returned `200` with an
  explicit `needsOcr: true` page and the row settled at `NEEDS_CONFIRMATION`, and the HORIZON
  "Auslesen" path on a real two-page signed document still moved it to `READY` with both pages
  persisted at confidence `1.0`. Contract unit tests cover zero pages, below-floor confidence, and
  whitespace-only text; static coherence tests assert both stacks import the shared rule and that
  the office path's private `.some()` status rule is gone. 979 Vitest + 20 Node tests pass; `tsc`
  clean.
  (commits `b708697`, `3bff5c0`).
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
- **MISSING:** page-level evidence linkage on every extracted fact (the schema and page text now
  support it; the module fact writers still pass `pageNo: null`); explicit error states for
  OCR/extraction failure. The single extraction contract is no longer missing — it was added
  2026-09-25 as `lib/documents/extraction-contract.ts` and is consumed by both document stacks.
  Runtime verification of file intake requires an authenticated session and a configured
  Supabase instance.
  **Note on text intake and `source_documents`:** the `source_documents.mime` CHECK and the
  `source-documents` bucket MIME allowlist both admit only PDF/JPEG/PNG. Admitting text there
  would require dropping a constraint, which is a destructive schema change and is not
  authorized. Text is therefore stored on `case_messages` instead. A migration-contract test
  (`lib/horizon/case/migration-contract.test.ts`) asserts that no HORIZON migration drops a
  constraint, so this cannot be undone silently by a later feature commit. The two document
  stacks now share one READY rule via `lib/documents/extraction-contract.ts`, so they can no
  longer label the same file differently.
- **DEPENDENCIES:** P5 (case model), P7 (assistant context).
- **BLOCKERS:** the OCR provider/budget question (`docs/TERRA_START.md` T5) is resolved for the
  local Tesseract path, which now runs on real bytes; a provider-level OCR budget decision is still
  open if provider OCR is adopted. The two-stack reconciliation blocker is closed. Runtime
  verification of intake requires an authenticated session and a configured Supabase instance.
- **DONE CRITERIA:** screenshot, photo, PDF, pasted text, and email content are all accepted;
  OCR/extraction results stored per page; every extracted fact carries page evidence;
  explanation is localized; failures surface explicit errors; tests, build, real verification pass.
- **FROZEN:** NO

---

## PHASE 7 — CONTEXT AI ASSISTANT

- **ID:** P7
- **SYSTEM:** Context AI assistant
- **TARGET ROUTES:** enhances `/{locale}/assistant` and the case workspace.
- **CURRENT STATUS:** VERIFIED (RAILS/CONTEXT) — LIVE CALL REFUSES CLEANLY 2026-09-25 (not DONE,
  not FROZEN). The case-scoped assistant route (`POST /api/horizon/cases/{id}/assistant`) returned
  `401` `AUTHENTICATION_REQUIRED` without a session, and under a live owner session returned `503`
  `AI_PROVIDER_NOT_CONFIGURED` because no provider key is set — no crash, no partial stream, and
  nothing transmitted to a provider. End-to-end answer generation remains owner-blocked on a
  provider key (`docs/TERRA_START.md`: a missing cloud key must block end-to-end success claims).
  **Rail ordering fixed 2026-09-25.** The provider-config gate ran before request validation and
  ownership, so on an unconfigured deployment every request returned `503` and neither the
  uuid/body validation nor the ownership check was reachable — the ownership rail was present in
  the code but unexercised, and the `503` confirmed that an id was otherwise well-formed. The gate
  now runs last: re-verified live under a real owner session, a foreign/unknown case returns
  `404 CASE_NOT_FOUND` and a malformed body returns `400 INVALID_CHAT_REQUEST` (previously both
  were `503`), while the owner still gets a clean `503 AI_PROVIDER_NOT_CONFIGURED`. Locked by
  `app/api/horizon/cases/[id]/assistant/route.test.ts` (7 tests: unauthenticated `401`, malformed
  `400`, non-uuid `404`, foreign case `404`, missing key `503` after ownership passes, stream on
  the happy path, and a database error not surfacing as a provider problem).
  (commit `f6ec2d6`).
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
- **MISSING:** an end-to-end case-context answer (owner-blocked on a provider key — the rails are
  verified, the answer is not); the older household chat route
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25. The review and
  approval surface was driven in a real authenticated session on the live project: with a draft
  present the required acknowledgement checkbox was enforced server-side and "Entwurf freigeben"
  released the exact draft ("Dieser Entwurf ist freigegeben und unverändert."), after which the
  gated tax-form download returned `200`; before approval the same route returned
  `403 not_approved`. Hash-binding was confirmed at the API too: a missing hash was refused with
  HTTP 400 `"A valid approved content hash is required"` and the recorded `content_hash` produced
  an approval row (`201`) bound to that exact hash.
  **Idempotent re-approval fixed 2026-09-25.** The `approvals` table carries a deliberate
  `unique(draft_id, approved_hash)` — an approval is identified by the exact draft and the exact
  bytes approved — so a second approval of the same unchanged draft violates it. That was returned
  to the caller as the raw Postgres message (`duplicate key value violates unique constraint
  "approvals_draft_id_approved_hash_key"`) with HTTP `400`, even though re-approving unchanged
  content is the intended case. `approveDraft` now resolves a `23505` conflict to the approval that
  already exists (`201`, same row id), and any other insert failure returns a neutral
  `"Approval could not be recorded"` rather than a database string. Re-verified live: re-approving
  the same draft returns `201` with the existing approval and the table still holds exactly one row
  for it; the hash-mismatch rail still refuses with `"Draft content changed; approval rejected"`.
  Locked by `lib/office/workflow/records.test.ts` (5 tests: unauthenticated, hash mismatch, happy
  path, idempotent conflict, and no raw message leak).
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
- **CURRENT STATUS:** DONE — 9 of 9 mappings verified 2026-09-25. The mechanism passed end-to-end
  for the reference form (mechanism + provenance + approval gate + download), and the breadth gap
  is now closed: every one of the 9 FMS 2025 templates carries a measured overlay mapping, and each
  mapping is asserted against the real template bytes (label x, label width, and baseline-origin top
  all within 0.6 pt of the recorded evidence). All 9 templates generate a real `%PDF-` artifact with
  the template's page count preserved and the source bytes untouched, and 8 of 8 Anlagen were driven
  through the authenticated browser — each produced a draft whose provenance block names its own
  official Form-ID, so the artifacts are the requested templates and not a stale draft. A form with
  no confirmed facts is refused by design (`nothing_to_fill`) rather than producing a blank-looking
  artifact. The full chain was re-verified: generate → approve → gated download → real signed PDF
  containing the confirmed values (`Müller`, `Anna`).
- **CURRENT IMPLEMENTATION:** `lib/horizon/pdf/`:
  `registry.ts` holds the 9 official FMS 2025 templates with authority, official source, form
  name, Form-ID, version, tax year, retrieval date and source SHA-256, keyed by tax year with no
  cross-year fallback. `source.ts` recomputes the template SHA-256 and detects the real format
  from the bytes (AcroForm / XFA / static). `encoding.ts` holds the WinAnsi guard. `fill.ts`
  covers the AcroForm path (Path A) and refuses a field the template does not contain.
  `overlay-map.ts` holds the static overlay mapping schema, the measured reference mapping, and the
  measured 2025 Anlagen identity mappings (`ANLAGE_*_2025_MAPPING`) at `ANLAGEN_PAGE_HEIGHT = 841.89`
  using the verified pdfjs baseline-origin convention; `overlay-fill.ts` plans overlay placements;
  `overlay-writer.ts` draws them with `pdf-lib` (Path B). `writer.ts` binds both paths and exposes
  `createTextMeasurer` (real Helvetica metrics), `generateOverlayPdf`, `generateAcroFormPdf`.
  `manifest.ts` records provenance and now carries the output SHA-256. `actions.ts` runs the full
  flow and stores the artifact. `mappings.ts` remains empty for the AcroForm path only — no field
  names are inventable.
- **REUSE:** P8 draft/approval/hash-binding engine (`saveDraft`, `recordApproval`,
  `assessDraftRelease`) — the manifest *is* the draft body, so approving it approves these exact
  template/mapping/fact inputs; no second approval system. The P6 intake storage convention
  (`source-documents` bucket, `{ownerId}/{caseId}/{docId}-{name}` keys) is reused for the
  generated artifact. Also reuses the FMS registry, canonical tax model and `tax_form_registry`.
- **MISSING:** (1) Agentur fuer Arbeit and Jobcenter official templates (belong to P12–P17, not to
  the FMS 2025 tax form set); (2) an approved approach for non-CP1252 values (e.g. Polish/Cyrillic
  names) — currently refused rather than transliterated. Both are explicitly out of P9's FMS scope,
  not gaps in the P9 deliverable.
- **DEPENDENCIES:** P8 (satisfied, reused), P6 (facts), `pdf-lib` 1.17.1 (owner-approved).
- **BLOCKERS:** none. All 9 FMS 2025 mappings are measured and verified.
- **DONE CRITERIA:** the original official German template is filled unmodified using only
  confirmed facts; unknown fields stay empty; output previewable, reviewable, approvable,
  downloadable; template provenance recorded; approval bound to the exact current
  content/input hash; tests, build, real verification pass.
  **Met across all 9 FMS 2025 target forms (2026-09-25).**
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
- **CURRENT STATUS:** PARTIAL / VERIFIED FOR THE REFERENCE FORM — P10 BROWSER E2E PASS
  2026-09-25, NOT DONE. A visual signature was applied end-to-end through the real UI: an approved
  generated form (Hauptvordruck ESt 1 A 2025) was signed in an authenticated session with a real
  PNG and a date, producing a *new* draft (`Signiertes amtliches Formular … (VISUAL)`, Version 2)
  with its own provenance: signed PDF SHA-256 distinct from the unsigned one, page 2, placement
  version `horizon-signature-placement-v1`, correct signer id and timestamp. Unapproved content
  cannot be signed. An earlier run of this E2E reported a `200` download for the approved signed
  draft and a byte length that was in fact the *unsigned* form — the signature was applied, but
  the gated route was still serving the pre-signature object (see the gated-download defect and
  its fix below). Re-verified live 2026-09-25 after the fix: the approved signed artifact downloads
  as a distinct 63,284-byte `%PDF-` (SHA-256 `0d9f7599…`) versus the unsigned 62,662-byte object
  (`5b4f83f4…`), and the stored unsigned object is re-hashed byte-identical to its recorded hash.
  The mechanism is proven; breadth and the open owner decisions below mean P10 is not complete and
  is **NOT FROZEN**.
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
- **MISSING:** (1) ~~measured signature placements for the other 8 FMS templates~~ **RESOLVED AS INAPPLICABLE 2026-09-25:** the 8 Anlagen carry no signature wording at all
  (no `Unterschrift`, no `eigenhändig`, no signature band on any page — checked over the real
  template bytes, and `ESt_1_A_2025.pdf` is the only one of the 9 that does). Anlagen are
  attachments to the declaration and are not separately signed, so a placement for them must not
  be invented; `signature.test.ts` now locks this in, failing if a future revision adds such
  wording. (2) a legally stronger signature (qualified/advanced electronic, or a
  cryptographic/PAdES signature) — not attempted, not approved, and out of scope for a visual
  signature; **owner decision**. (3) multi-signatory support (the reference area is captioned
  "Unterschrift(en)", i.e. plural for spouses): the engine draws exactly one signature and
  refuses a confirmed joint assessment with `multiple_signatures_required` rather than
  under-signing, and refuses an unconfirmed joint-assessment fact with
  `joint_assessment_unconfirmed`; drawing two signatures is a **product scope decision** left to
  the owner. (4) signature of documents that are not engine-generated PDFs.
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
- **GATED DOWNLOAD NOW SERVES THE SIGNED ARTIFACT (fixed 2026-09-25).** The signature writes a
  new object under its own path, but the download route resolved the newest
  `pdf_form_generated` audit event unconditionally, so an approved signed form still downloaded as
  the *unsigned* bytes: the user signed the document and received the version without the
  signature. The route now resolves the `pdf_signature_applied` event and, when that signed draft
  is currently authorized (approved *and* its approval hash still matches its content), serves the
  signed object; otherwise it falls back to the last approved unsigned generation, so a freshly
  signed draft still pending review does not hide the previously approved form, and a stale
  signature is never served. `readSignedOutputSha` in `manifest.ts` is the discriminator, because a
  signed body embeds the unsigned body and therefore carries both hash lines. Verified live: after
  signing and approving, the gated download returned a distinct `%PDF-` artifact (63,284 bytes,
  SHA-256 `0d9f7599…`) different from the unsigned one (62,662 bytes, `5b4f83f4…`), while the stored
  unsigned object was re-hashed and confirmed byte-identical to its recorded hash. Locked by
  `app/api/horizon/cases/[id]/tax-form/route.test.ts` (9 tests) and the signed/unsigned
  discriminator tests in `lib/horizon/pdf/signature.test.ts`.
- **NOT A CRYPTOGRAPHIC SIGNATURE:** the hash chain proves *what* was signed, not *who* signed in
  any legal sense. No certificate, no PAdES, no cryptographic binding to the signer.
- **FROZEN:** NO

---

## PHASE 11 — EMAIL CONNECTION + SEND ENGINE

- **ID:** P11
- **SYSTEM:** Email connection and send engine
- **TARGET ROUTES:** consumed by P12–P17.
- **CURRENT STATUS:** DONE — LIVE RUNTIME E2E PASS 2026-09-25 — NOT FROZEN. The send engine, a
  generic SMTP transport and a **found-and-fixed UI wiring defect** are implemented and a full
  authenticated send was exercised in a running environment against a live SMTP server. Not FROZEN
  pending the owner decision on the production provider (the runtime E2E used a test-local
  provider with test-local credentials and a test-local certificate).
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
- **WIRING DEFECT FOUND AND FIXED 2026-09-25:** the send panel pointed at the *newest* draft
  (`drafts[0]`). A send appends its record as a newer draft, so after the first send the panel
  addressed the record — which the engine then refused with `IS_SEND_RECORD`, hiding the explicit
  resend path the engine implements and preventing any later draft from being sent. The panel now
  targets the newest draft that is not a send record via `pickSendableDraft` in
  `lib/horizon/send/marker.ts` (a client-safe module; `record.ts` stays `server-only` and re-exports
  the single marker definition). Live after the fix: first send transmitted 1, the panel offered the
  message with a resend confirmation (not the record), an unconfirmed resend transmitted 0, a
  confirmed resend transmitted 1 — recorded states `['SENT', 'SENT']`.
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
  **Re-confirmed 2026-09-25:** no `HORIZON_SMTP_*` variable is present in the runtime environment;
  `readSmtpConfig` on an empty environment refuses and names all five required keys
  (`HORIZON_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_FROM`) with `invalid: []`, a partial
  environment refuses and names exactly the absent ones, and a complete environment yields a config
  on the STARTTLS path (`secure: false`). This is a genuine owner-only action: supply real SMTP
  credentials (or approve an OAuth provider) before end-to-end sending can be verified.
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
  **Full authenticated runtime E2E re-run 2026-09-25** through the running application and the real
  UI (not a standalone probe, which the `server-only` guard correctly blocks): a fresh confirmed user
  generated a Kündigung letter, approved it, and sent it; the live SMTP server accepted the message
  after STARTTLS and AUTH and the received bytes decoded to the correct `From`, `To`, subject
  (`Kündigung VZ-99231`) and a 1,421-character body containing the customer's wording; the audit
  event recorded `state: SENT`, `providerKey: smtp`, a redacted recipient and a provider message id.
  Duplicate/resend was verified in the same run (see the wiring-defect note above). `pickSendableDraft`
  is covered by 5 committed tests in `lib/horizon/send/marker.test.ts`.
  Outstanding: a real configured provider (owner-only) and runtime end-to-end verification in the
  deployment environment. `nodemailer` transmits over the network and cannot be covered by unit tests
  alone, so the SMTP transport has no committed automated test; `smtp-config.ts` is unit-tested
  (12 tests).
- **FROZEN:** NO — owner decision: not FROZEN until the production provider is supplied and a
  deployment-environment E2E is run.

---

## PHASE 12 — AGENTUR FÜR ARBEIT

- **ID:** P12
- **SYSTEM:** Agentur für Arbeit module
- **TARGET ROUTES:** a HORIZON module entered from `/{locale}/dashboard`, running on the shared
  case engine.
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25 (implementation, tests
  and build verified). Case opened from `/{locale}/dashboard` via the "Agentur für Arbeit" module
  button (`200`); the task selector offered all four canonical tasks; selecting "Arbeitslosengeld
  beantragen" recorded `agentur_task: arbeitslosengeld_beantragen` as a confirmed case fact
  (visible in the FAKTEN panel), the panel showed "Gewähltes Anliegen" with the official online
  route, and the audit trail appended `agentur_task_selected`. Earlier in the same window an
  `application` case rendered its Agentur surface live (`200`) including the official
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25. Case opened from
  `/{locale}/dashboard` via the "Jobcenter" module button (`200`); the task selector offered
  `erstantrag`, `weiterbewilligung` and `veraenderung_mitteilen`; selecting "Erstantrag" recorded the
  task as a case fact and appended `jobcenter_task_selected` to the audit trail. Earlier in the same
  window an `application` case created with `horizon_module = jobcenter` rendered its module surface
  live (`200`), showing the Jobcenter task panel and the official German form context.
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25. A contract was linked
  from `/{locale}/vertraege` ("Kündigung vorbereiten"), creating a real `kuendigung` case with its
  confirmed provider/reference facts seeded (so the missing-information gate was already cleared).
  "Kündigung vorbereiten" generated draft v1; the review panel showed the letter body; ticking the
  acknowledgement and submitting "Entwurf freigeben" released it ("Dieser Entwurf ist freigegeben
  und unverändert."); the download link then appeared and `GET /api/horizon/cases/{id}/letter`
  returned `200` with a short-lived signed URL whose bytes are a real PDF (magic `%PDF-`, 1528
  bytes). An unapproved draft returns `403 not_approved` and a changed one `403 approval_stale`.
  The deterministic generator still refuses to draft with partial facts and returns `needsInfo`
  with localized questions rather than inventing them.
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25 (tax-year-aware registry
  and case wiring shipped; unit tests and build verified). A case opened from `/{locale}/dashboard`
  via the tax module button (`200`); the panel rendered the tax-year selector with 2025 supported
  and reported 2026 as "Amtlich noch nicht veröffentlicht"; no ELSTER transmission field or
  credential exists anywhere on the surface, so HORIZON transmits nothing.
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
- **CURRENT STATUS:** DONE — AUTHENTICATED RUNTIME E2E PASS 2026-09-25 — NOT FROZEN.
  **Blocker found and fixed this phase:** pasted text and email content were stored by P6 as a case
  message (`case_messages`) while the explanation read only extracted `document_pages`, so a case
  whose only input was pasted text rendered "nicht analysierbar" even though the text was present.
  `combineAnalysisText` (`lib/horizon/unterlagen/analysis.ts`) now composes the analysis input from
  extracted page text **plus** the user's own `role = 'user'` messages; assistant turns are excluded
  so the explanation never rests on prior output. The guide case page loads `listMessages` and feeds
  the combined text to the panel, and the text-intake hint was corrected so it no longer claims the
  text is unread. 4 new unit tests; suite 954 pass.
  **Runtime E2E observed 2026-09-25:** authenticated case opened from `/de/dashboard` via the
  "Unterlagen erklären" button (`/{locale}/guide/{id}`, `200`); pasted text stored; the panel then
  rendered classification `Behördenbescheid` with the verbatim line quoted ("Bescheid über
  Einkommensteuer 2024"), deadline evidence `printed` dated 2026-10-15 with its quoted sentence,
  a risk caveat, one next action, and the document count. Before the fix the same flow reported the
  case unanalysable.
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
- **MISSING:** per-page evidence on facts and the optional reply/sign/send tail of the chain, which
  belongs to P9–P11 and is tracked there. Pasted-text and email-content intake, the classify step,
  deadline extraction, uncertainty-aware risk states and next-action surfacing are implemented and
  runtime-verified.
- **DEPENDENCIES:** P5, P6, P7, P8, P9, P10, P11.
- **BLOCKERS:** none for the analysis surface. The optional *send* tail remains gated on P11's
  owner-only provider configuration, which is P11's blocker, not this phase's.
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
- **CURRENT STATUS:** VERIFIED — AUTHENTICATED BROWSER E2E PASS 2026-09-25 (contract-to-case linkage
  and dashboard entry shipped; archive, Radar and optimize surfaces reused; tests and build
  verified). `/{locale}/vertraege` rendered the archive under an owner session with its Radar notes;
  the "Kündigung vorbereiten" control on a contract opened a real `kuendigung` case
  (`/{locale}/guide/{id}`, `200`) with its evidenced facts seeded and `contract_linked` audited —
  the same flow that then drives P14's letter to approval and download. `GET /api/contracts` is not
  a supported method (`405`), which is correct — the surface is create/update/delete plus the page.
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

## NAVIGATION ARCHITECTURE — N0–N6 (documentation + navigation UI)

- **ID:** N0–N6 (not part of P0–P17; defined by `HORIZON_NAVIGATION_DESIGN.md`)
- **SYSTEM:** HORIZON navigation architecture
- **TARGET ROUTES:** no new routes. Existing surfaces: `/{locale}/dashboard`,
  `/{locale}/office`, `/{locale}/steuer`, `/{locale}/steuer/providers`, `/{locale}/steuer/review`.
- **CURRENT STATUS:** N0–N2 DONE at `56b0aa5`; N3, N4 and N6 implemented and verified (tests,
  typecheck, lint, i18n, build) but their code was uncommitted at reconciliation time. N5 and N7
  NOT STARTED and require an explicit owner decision.
- **CURRENT IMPLEMENTATION:**
  - **N0** — `lib/navigation/horizon-nav.ts` is the single navigation model; the sidebar, mobile
    bottom bar and More sheet derive from it (`lib/navigation/horizon-nav.test.ts` guards the
    protection invariant).
  - **N1** — four-group desktop sidebar including the interim Security entry
    (`/{locale}/protected/security`).
  - **N2** — 5-slot mobile bottom bar plus More sheet, on workspace routes only.
  - **N3** — the dashboard no longer restates sidebar destinations: `homeShortcuts` was removed
    from `lib/horizon/modules/registry.ts`, the duplicated status card was removed from
    `components/dashboard/workplace-action-center.tsx`, and "Vorgang starten" is the single
    primary CTA in `components/dashboard/vzg-dashboard.tsx`.
  - **N4** — `isSelfChromedPath` in `lib/kintex-navigation.ts` suppresses the public Layer 0
    header/footer on `/{locale}/office`, which renders its own header. Route, gating and
    functionality unchanged.
  - **N6** — `components/finance/steuer-tabs.tsx` renders in-page tabs on all three Steuer pages
    from the unit-tested model `lib/navigation/steuer-tabs.ts`.
- **REUSE:** `horizon-nav`, `horizon-sidebar`, `mobile-bottom-nav`, `kintex-navigation`,
  `steuer-tabs`.
- **MISSING:** N5 (workspace settings surface for Security/MFA) and N7 (legacy redirect/removal
  candidates in `FINAL_SITE_MAP.md` §8). Dead navigation code (`SiteHeader`, `kintexModules`) is
  still present and is N7 territory.
- **DEPENDENCIES:** none on the phase sequence; navigation is presentation only and does not
  change backend, Supabase, APIs, migrations, auth, document engines, approvals, signatures or SMTP.
- **BLOCKERS:** N5 and N7 are owner decisions. Nothing else is blocked.
- **DONE CRITERIA:** all seven N items resolved or explicitly deferred by the owner; navigation
  surfaces derive from one model; no duplicate navigation restatement; every authenticated
  navigation destination inside the protection boundary; tests, typecheck, lint, i18n and build
  pass.
- **FROZEN:** NO
- **OWNER APPROVAL REQUIRED:** YES for N5 and N7.

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
