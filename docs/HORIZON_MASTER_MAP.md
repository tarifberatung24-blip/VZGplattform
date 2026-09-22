# HORIZON by VZG — Canonical Master Map

Status: **CANONICAL TARGET ARCHITECTURE** (documentation only)
Owner: Tarifberater24 (VZG CONSULT)
Base: `main` @ `f6a8eb777e630106c934856a74de3796c1ad506c`
Scope: target architecture, current-state inventory, shared-engine design, technology and workflow map.

Canonical identity — keep these four names distinct and never use them interchangeably:

| Concept | Name |
| --- | --- |
| LEGAL ENTITY | `Tarifberater24` |
| EXPERT BRAND | `VZG CONSULT` |
| PRODUCT | `HORIZON by VZG` |
| CODEBASE | `VZGplattform` |

This document is the single canonical TARGET build map. Implementation status lives in
[`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md). Governance rules live in
`PROJECT_RULES.md`, `AGENTS.md`, and `AI_WORKFLOW.md`.

This document does not authorize implementation. It records facts and target design only.

## Product North Star — Control → Optimization → Capital

HORIZON by VZG is not only an administrative assistant. Its long-term product direction is a
**management control center for contracts, recurring mandatory expenses, important dates, and
personal financial decisions for people living in Germany**.

### Core customer outcome — know, control, optimize

The user should be able to see and manage, in one place:

- which contracts they currently have and with which providers;
- what each contract costs per month / year;
- contract start and end dates where evidenced;
- cancellation deadlines (Kündigungsfrist) where evidenced;
- price-guarantee periods (Preisgarantie) where evidenced;
- renewal / review dates and other important lifecycle events;
- which facts are confirmed, which are missing, and which need user verification.

The product lifecycle is:

```text
DISCOVER → TRACK → WARN → COMPARE → OPTIMIZE → RENEW
```

HORIZON should help the user reduce avoidable recurring costs over time by surfacing relevant
alternatives from approved partner / affiliate networks when a contract, guarantee period, or
financial product reaches a review point. Examples include energy, internet/mobile, vehicle and
business insurance, banking products, and credit products. Any comparison or partner handoff must
remain transparent, evidence-based, and subject to the applicable legal / product boundaries.

The intended economic loop is:

```text
better contract visibility
→ timely review
→ lower recurring mandatory costs where a better option exists
→ measurable household savings
→ stronger long-term financial position
```

### Contract lifecycle and recurring-cost optimization

HORIZON should treat every confirmed contract as a lifecycle object, not as a one-time comparison.
The target is that, for the typical multi-year contract cycle, the user is warned early enough before
Kündigungsfrist, Vertragsende, Preisgarantie expiry, renewal, or another evidenced review point to
re-check the market and decide whether to keep, renegotiate, switch, or cancel.

Optimization opportunities may include, when supported by an approved partner and applicable product/legal boundaries:

- electricity and gas tariffs with better total cost / conditions;
- internet and mobile contracts;
- Kfz and other insurance products;
- health-insurance options where relevant, especially for self-employed users;
- bank accounts with lower or no recurring account fees;
- credit/refinancing products with lower effective interest or total cost than a user's evidenced current credit;
- other recurring mandatory-cost products where the comparison is transparent and evidence-based.

The objective is not perpetual switching for its own sake. The objective is to give the user recurring
control over unavoidable household/business costs and a documented opportunity to improve terms when
a materially better option exists.

Affiliate revenue is a business model layer, not a reason to fabricate a recommendation. An offer is
shown as an active partner opportunity only when an approved partner and a real configured deeplink
exist. Partner compensation and sponsored links must be disclosed clearly.

### Administrative capabilities are supporting systems

Document explanation, Behörden workflows, forms, case management, approvals, deadlines, and the
P12–P17 modules remain important because they help the user manage real-life obligations in Germany.
They support the broader control-center model; they are not the complete product vision by
themselves.

### Future Capital Layer — separate later stage

After the contract-control and cost-optimization layers are stable, HORIZON may resume the preserved
Capital work as a separate financial analysis and long-term wealth-building layer.

Target purpose:

```text
confirmed household facts + savings capacity
→ risk / scenario analysis
→ long-term planning views
→ user-controlled investment decisions
→ long-term capital accumulation
```

The Capital Layer may support research, scenario modelling, risk analysis, compounding projections,
portfolio/asset comparison, and long-term planning around traditional financial instruments such as
shares, ETFs, securities, and similar regulated market assets.

**Cryptocurrency is explicitly outside the intended product direction.**

Capital outputs must not present uncertain forecasts as guaranteed outcomes. Personalized investment
recommendation, execution, custody, suitability, or regulated advisory functionality requires a
separate explicit product/legal decision before implementation. Existing BlackRock/Aladdin-related
research in this repository is architectural/reference material only and must not imply affiliation,
licensed access, or a production integration unless separately verified and authorized.

### Directional roadmap

```text
STAGE A — HORIZON CONTROL
Contracts + documents + cases + dates + reminders + lifecycle visibility

STAGE B — HORIZON OPTIMIZE
Partner network + transparent comparisons + renewal timing + recurring-cost reduction

STAGE C — HORIZON CAPITAL
Separate later layer for analysis, scenarios, risk and long-term wealth planning
```

Current implementation work remains governed by the approved Phase 0–17 sequence. This North Star
defines the direction the product is moving toward; it does not authorize jumping ahead of the
active phase or bypassing safety, legal, RLS, approval, or evidence requirements.

---

## 0. First principle — state model

The project is developed sequentially from this one Master Map. Every system moves through:

```text
NOT_STARTED → AUDITED → PLANNED → IN_PROGRESS → TESTING → DONE → FROZEN
```

`BLOCKED` may be used when an external dependency prevents completion.

### Definition of DONE

A module is **NOT DONE merely because code exists.** DONE requires all applicable items:

- user journey complete
- correct routes complete
- frontend complete enough to use
- backend complete
- persistence/data complete where required
- authorization/RLS complete where required
- integrations complete where required
- loading / error / empty states complete
- user approval boundaries complete
- applicable legal / safety boundaries complete
- tests pass
- build passes
- real functional verification passes
- no known critical blocker remains

If a flow has not been verified end-to-end, it is not DONE.

### Definition of FROZEN

Once a module is DONE and is explicitly accepted by the owner, it is marked **FROZEN**.
A FROZEN module must not be modified, renamed, refactored, redesigned, extended, migrated,
or replaced unless the owner explicitly reopens it. A FROZEN module must never be modified
silently as collateral work for another task.

---

## 1. Canonical phase sequence

The active build sequence is exactly this order. A later phase must not be started merely
because its files already exist.

| Phase | System |
| --- | --- |
| PHASE 0 | MASTER MAP + GOVERNANCE |
| PHASE 1 | PUBLIC LAYER 0 |
| PHASE 2 | AUTH + FIRST LOGIN + ONBOARDING |
| PHASE 3 | HORIZON GUIDE |
| PHASE 4 | HORIZON HOME + FIVE ENTRY MODULES |
| PHASE 5 | SHARED CASE ENGINE |
| PHASE 6 | DOCUMENT INTAKE / OCR / EXPLANATION |
| PHASE 7 | CONTEXT AI ASSISTANT |
| PHASE 8 | DRAFT / REVIEW / USER APPROVAL |
| PHASE 9 | OFFICIAL PDF FORM ENGINE |
| PHASE 10 | SIGNATURE ENGINE |
| PHASE 11 | EMAIL CONNECTION + SEND ENGINE |
| PHASE 12 | AGENTUR FÜR ARBEIT |
| PHASE 13 | JOBCENTER |
| PHASE 14 | KÜNDIGUNG |
| PHASE 15 | STEUERERKLÄRUNG |
| PHASE 16 | UNTERLAGEN ERKLÄREN |
| PHASE 17 | CONTRACT MANAGEMENT |

### Capital — preserved, outside the active sequence

Existing Capital work must be preserved untouched and is classified as:

**PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE**

Capital may only be resumed by explicit owner instruction. It is not part of the active
Phase 0–17 sequence and must not be added to it.

Current Capital evidence on `main`:
`lib/capital/**` (domain model, provenance, confirmation lifecycle, deterministic
`capital-core-1.0.0` engine, reserve scenario, neutral goal feasibility, snapshot hash,
`AdvisorReview` and `PublishBoundary` contracts, P0 runtime orchestrator and source adapters).
`DOCUMENT_FEASIBILITY_AUDIT.md` records that persistence, UI, and runtime data integration
are not completed. No UI route exposes Capital.

---

## 2. Current-state route inventory

Facts only. Nothing here is deleted, redirected, or renamed. Branding drift is reported, not fixed.

### 2.1 Routing mechanics (as implemented)

- `app/[locale]/[[...slug]]/page.tsx` is a catch-all that maps a slug to a shared
  component from the non-localized `app/*` tree. Localized URLs therefore serve the same
  page components as the non-localized files.
- `proxy.ts` redirects every non-localized, non-API path to `/{locale}{path}`, using the
  `finanzbg_locale` cookie or the default locale (`bg`). It also:
  - redirects `/{locale}/auth/callback` and `/{locale}/auth/logout` to the unlocalized handler (307);
  - redirects `/protected` (and `/{locale}/protected`) to `/dashboard`;
  - preserves `/api`, `/_next`, and `/favicon.ico` untouched.
- Two i18n systems coexist: `i18n/routing.ts` (`next-intl`, locales `bg`+`de`, default `bg`)
  and `lib/i18n/routing.ts` + `lib/i18n/dictionaries.ts` (custom `bg`+`de`, cookie `finanzbg_locale`).
- The catch-all key `emailGenerator` (camelCase) resolves `/{locale}/emailGenerator`, while
  `app/[locale]/email-generator/page.tsx` serves `/{locale}/email-generator`. Both exist.

### 2.2 Page routes

Legend — Access: `PUBLIC`, `AUTH` (server redirect to login), `PROTECTED` (auth + data).
Status: `ACTIVE`, `PARTIAL` (UI present, end-to-end unverified), `LEGACY` (pre-HORIZON branding/era).
Destination: target HORIZON phase. Disposition: `KEEP`, `REUSE`, `REPLACE LATER`, `LEGACY`.

| ROUTE | ACCESS | CURRENT PURPOSE | CURRENT BRANDING | LOCALE BEHAVIOR | MAIN COMPONENT | BACKEND / DATA DEPS | STATUS | TARGET DESTINATION | DISPOSITION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | PUBLIC | root, redirects to locale | VZGplattform (metadata) | redirect → cookie/default `bg` | — (proxy) | none | ACTIVE | Phase 1 | REPLACE LATER |
| `/{locale}` | PUBLIC | marketing home | mixed HAMMAL / VZG CONSULT | `bg`/`de` via catch-all | `app/page.tsx` `Hero`, `OpportunityCheck`, `FinancialOsOverview` | none | ACTIVE | Phase 1 | REPLACE LATER |
| `/{locale}/check` | PUBLIC | opportunity check entry | KintexBG-era | `bg`/`de` | `app/check/page.tsx` | client-only | PARTIAL | Phase 1 | LEGACY |
| `/{locale}/uslugi` | PUBLIC | services (BG slug) | mixed | `bg`/`de` | `app/uslugi/page.tsx` | `module-workspaces` | ACTIVE | Phase 1 | LEGACY |
| `/{locale}/anspruch` | PUBLIC | entitlement navigator | mixed, DE copy | `bg`/`de` | `app/anspruch/page.tsx` | `EntitlementNavigator` | PARTIAL | Phase 4 / 12–13 | REUSE |
| `/{locale}/kindergeld` | PUBLIC | Kindergeld navigator | `KintexBG` in title | `bg`/`de` | `app/kindergeld/page.tsx` | `/api/kindergeld/draft`, `kindergeld_cases` | PARTIAL | Phase 4 (social module) | REUSE |
| `/{locale}/produkte` | PUBLIC | product overview | mixed | `bg`/`de` | `app/produkte/page.tsx` | static | ACTIVE | Phase 1 | LEGACY |
| `/{locale}/tarife` | PUBLIC | tariffs | KintexBG-era | `bg`/`de` | `app/tarife/page.tsx` | `affiliate-offers` | ACTIVE | Phase 17 (partner) | LEGACY |
| `/{locale}/za-nas` | PUBLIC | about (BG slug) | HAMMAL in messages | `bg`/`de` | `app/za-nas/page.tsx` | static | ACTIVE | Phase 1 | LEGACY |
| `/{locale}/zayavka` | PUBLIC | service request (BG) | mixed | `bg`/`de` | `app/zayavka/page.tsx` | `/api/service-requests` → n8n | PARTIAL | Phase 1 / 17 | LEGACY |
| `/{locale}/anfrage` | PUBLIC | service request (DE) | mixed | `bg`/`de` | re-export of `zayavka` | `/api/service-requests` → n8n | PARTIAL | Phase 1 / 17 | LEGACY |
| `/{locale}/angebote/{offer}` | PUBLIC | affiliate offer landing | mixed | `bg`/`de` | `affiliate-offer-landing` | `lib/affiliate-offers`, `/go/{offer}` | ACTIVE | Phase 17 | KEEP |
| `/{locale}/contact` | PUBLIC | contact form | `Tarifberater24` | `bg`/`de` | `app/[locale]/contact/page.tsx` | `/api/leads`, `leads` table | ACTIVE | Phase 1 | REUSE |
| `/{locale}/how-it-works` | PUBLIC | explainer | `KintexBG · BY VZG CONSULT` | `bg`/`de` | `app/[locale]/how-it-works/page.tsx` | static | ACTIVE | Phase 1 | REPLACE LATER |
| `/{locale}/email-generator` | PUBLIC | AI letter generator | KintexBG-era | `bg`/`de` | `app/[locale]/email-generator/page.tsx` | `/api/generate-letter` (Cerebras) | PARTIAL | Phase 8 (superseded by Draft/Review) | LEGACY |
| `/{locale}/datenschutz` | PUBLIC | privacy | mixed | `bg`/`de` | `legal-page` | static | ACTIVE | Phase 1 (legal) | REUSE |
| `/{locale}/agb` | PUBLIC | terms | mixed | `bg`/`de` | `legal-page` | static | ACTIVE | Phase 1 (legal) | REUSE |
| `/{locale}/impressum` | PUBLIC | imprint | mixed | `bg`/`de` | `legal-page` | static | ACTIVE | Phase 1 (legal) | REUSE |
| `/{locale}/widerruf` | PUBLIC | withdrawal | mixed | `bg`/`de` | `legal-page` | static | ACTIVE | Phase 1 (legal) | KEEP |
| `/{locale}/affiliate-hinweis` | PUBLIC | affiliate disclosure | mixed | `bg`/`de` | `legal-page` | static | ACTIVE | Phase 1 (legal) | LEGACY |
| `/{locale}/app` | PUBLIC | PWA install help | VZGplattform | `bg`/`de` | `pwa-install-help` | none | ACTIVE | Phase 1 (PWA) | KEEP |
| `/{locale}/auth/login` | PUBLIC | login | `KintexBG` | `bg`/`de` | `app/auth/login/page.tsx` | Supabase Auth | ACTIVE | Phase 2 | REPLACE LATER |
| `/{locale}/auth/sign-up` | PUBLIC | sign-up | `KintexBG` | `bg`/`de` | `app/auth/sign-up/page.tsx` | Supabase Auth | ACTIVE | Phase 2 | REPLACE LATER |
| `/{locale}/auth/sign-up-success` | PUBLIC | confirm e-mail notice | `KintexBG` | DE-only text | `app/auth/sign-up-success/page.tsx` | none | ACTIVE | Phase 2 | REPLACE LATER |
| `/{locale}/auth/error` | PUBLIC | expired/invalid link | `KintexBG` | DE-only text | `app/auth/error/page.tsx` | none | ACTIVE | Phase 2 | REPLACE LATER |
| `/{locale}/auth/forgot-password` | PUBLIC | password reset request | `KintexBG` | `bg`/`de` | `app/auth/forgot-password/page.tsx` | Supabase Auth | ACTIVE | Phase 2 | REUSE |
| `/{locale}/auth/update-password` | PUBLIC | set new password | `KintexBG` | `bg`/`de` | `app/auth/update-password/page.tsx` | Supabase Auth | ACTIVE | Phase 2 | REUSE |
| `/{locale}/auth/mfa-verify` | PUBLIC | MFA challenge | `KintexBG` | DE-only text | `app/auth/mfa-verify/page.tsx` | Supabase MFA | ACTIVE | Phase 2 (security) | KEEP |
| `/{locale}/dashboard` | PROTECTED | main dashboard | VZGplattform / mixed | `bg`/`de` | `VzgDashboard` | `profiles`, `contracts`, `documents`, `deadlines`, `ensureHousehold` | PARTIAL | Phase 4 (HORIZON HOME) | REPLACE LATER |
| `/{locale}/protected` | PROTECTED | alias | — | redirect | proxy → `/dashboard` | none | LEGACY | Phase 4 | LEGACY |
| `/{locale}/assistant` | AUTH | AI home-office chat | KintexBG | `bg`/`de` | `home-office-workspace` | `/api/chat` (Groq) | PARTIAL | Phase 7 (Context AI Assistant) | REUSE |
| `/{locale}/protected/home-office` | AUTH | alias of assistant | KintexBG | `bg`/`de` | `home-office-workspace` | `/api/chat` (Groq) | PARTIAL | Phase 7 | LEGACY |
| `/{locale}/security` | AUTH | account security / 2FA | BG copy only | BG-only text | `mfa-settings` | Supabase MFA | PARTIAL | Phase 2 (security) | KEEP |
| `/{locale}/protected/security` | AUTH | alias of security | BG copy only | BG-only text | `mfa-settings` | Supabase MFA | PARTIAL | Phase 2 (security) | LEGACY |
| `/{locale}/profil` | AUTH | financial profile form | mixed | `bg`/`de` | `profile-form` | `profiles`, `ensureHousehold` | PARTIAL | Phase 2 / 4 (Profile) | REUSE |
| `/{locale}/finanzamt` | AUTH | Finanzamt requests | mixed DE copy | DE-only copy | `finanzamt-request-form` | `finanzamt_requests` | PARTIAL | Phase 15 | REUSE |
| `/{locale}/steuer` | AUTH | tax questionnaire + registry | mixed | DE-only copy | `tax-questionnaire`, `tax-form-registry`, `tax-pipeline-review` | `tax_form_registry`, `tax_cases` | PARTIAL | Phase 15 | REUSE |
| `/{locale}/steuer/providers` | AUTH | provider/ELSTER status | mixed | DE-only copy | `provider-audit-timeline` | `provider_integrations`, `provider_submission_*` | PARTIAL | Phase 15 | REUSE |
| `/{locale}/steuer/review` | AUTH | ELSTER review package | mixed | DE-only copy | `elster-review-package` | `canonical-tax-model` | PARTIAL | Phase 15 | REUSE |
| `/{locale}/vertraege` | AUTH | contracts workspace | mixed | DE-only copy | `contracts-workspace`, `contract-center-workspace` | `contracts`, `ensureHousehold` | PARTIAL | Phase 17 | REUSE |
| `/{locale}/documents` | AUTH | documents workspace | mixed | `bg`/`de` | `documents-workspace`, `document-intake`, `document-facts-review` | `documents`, `/api/documents/*` | PARTIAL | Phase 6 / 16 | REUSE |
| `/{locale}/finanzbildung` | AUTH | financial education | mixed | `bg`/`de` | `financial-education-page` | `financial_education_lessons` | PARTIAL | Phase 4 (secondary) | REUSE |
| `/{locale}/office` | PUBLIC SHELL (no server guard) | KintexBG communication prototype | `KintexBG` | `bg`/`de`/`ru`/`pl`/`sr`/`ro` (inline) | `app/[locale]/office/page.tsx`, `CaseWorkspace` | `/api/office/*` | PARTIAL | Phase 5 (shared case engine) | REUSE |
| `/{locale}/office/cases/{id}` | AUTH | case detail | KintexBG | `bg`/`de` | `app/[locale]/office/cases/[id]/page.tsx` | `getCaseDetail`, `cases`, `source_documents` | PARTIAL | Phase 5 | REUSE |

Distinct page URL patterns: **43** (28 public, 15 authenticated).
`page.tsx` files: **48** (38 non-localized + 10 localized-only).

### 2.3 Route handlers (`route.ts`)

| ROUTE | ACCESS | PURPOSE | DATA / INTEGRATION | STATUS | DESTINATION |
| --- | --- | --- | --- | --- | --- |
| `/api/health` | PUBLIC | health, `RENDER_GIT_COMMIT` revision | none | ACTIVE | keep |
| `/api/chat` | AUTH | streaming AI chat | Groq via `@ai-sdk/groq`, quota, rate limit | PARTIAL | Phase 7 |
| `/api/contracts` | AUTH | contract list/create | `contracts`, household | PARTIAL | Phase 17 |
| `/api/contracts/{id}` | AUTH | contract update | `contracts` | PARTIAL | Phase 17 |
| `/api/documents/upload` | AUTH | validated upload | canonical-project guard, private bucket | PARTIAL | Phase 6 |
| `/api/documents/extract` | AUTH | text extraction | `lib/documents/extraction` | PARTIAL | Phase 6 |
| `/api/documents/analyze` | AUTH | Groq/Cerebras analysis | `document_analysis_results` | PARTIAL | Phase 6 |
| `/api/documents/review` | AUTH | fact confirmation | `document_reviews` | PARTIAL | Phase 8 |
| `/api/generate-letter` | AUTH | letter generation (Cerebras) | `CEREBRAS_API_KEY` | PARTIAL | Phase 8 |
| `/api/kindergeld/draft` | AUTH | Kindergeld draft | `kindergeld_cases`, locales `bg`/`de` | PARTIAL | Phase 4 |
| `/api/leads` | PUBLIC | lead intake | `leads` | ACTIVE | Phase 1 |
| `/api/service-requests` | PUBLIC | offer request → n8n webhook | `N8N_OFFER_REQUEST_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | PARTIAL | Phase 17 / automation |
| `/api/radar` | AUTH | contract radar signals | `contract_radar_history`, deterministic `lib/kintex-radar` | PARTIAL | Phase 17 |
| `/api/optimize/start` | AUTH | optimize session start | `optimize_sessions` | PARTIAL | Phase 17 |
| `/api/optimize/{sessionId}` | AUTH | session read | `optimize_sessions` | PARTIAL | Phase 17 |
| `/api/optimize/{sessionId}/confirm` | AUTH | session confirm | `optimize_sessions`, partner mapping | PARTIAL | Phase 17 |
| `/api/steuer/pdf` | AUTH | tax PDF readiness | `tax-pipeline`, `canonical-tax-model` | PARTIAL | Phase 9 / 15 |
| `/api/office/cases` | AUTH | case list/create | `cases` (owner-scoped) | PARTIAL | Phase 5 |
| `/api/office/cases/{id}` | AUTH | case read/update | `cases` | PARTIAL | Phase 5 |
| `/api/office/cases/{id}/detail` | AUTH | case detail | `cases`, repositories | PARTIAL | Phase 5 |
| `/api/office/cases/{id}/documents` | AUTH | document upload | `source-documents` bucket | PARTIAL | Phase 5/6 |
| `/api/office/cases/{id}/documents/list` | AUTH | document list | `source_documents` | PARTIAL | Phase 5/6 |
| `/api/office/cases/{id}/messages` | AUTH | case messages + AI routing | `case_messages`, `routeWithGroq` | PARTIAL | Phase 5/7 |
| `/api/office/cases/{id}/drafts` | AUTH | draft list | `correspondence_drafts` | PARTIAL | Phase 8 |
| `/api/office/cases/{id}/workflow` | AUTH | confirm facts / generate draft | `extracted_facts`, `correspondence_drafts` | PARTIAL | Phase 5/8 |
| `/api/office/documents/{id}/extract` | AUTH | PDF extraction | `document_pages` | PARTIAL | Phase 6 |
| `/api/office/documents/{id}/ocr` | AUTH | Tesseract OCR | `document_pages` | PARTIAL | Phase 6 |
| `/api/office/documents/{id}/signed-url` | AUTH | signed private URL | Storage, 300 s | PARTIAL | Phase 6 |
| `/api/office/drafts/{id}/approve` | AUTH | hash-bound approval | `approvals`, SHA-256 `approved_hash` | PARTIAL | Phase 8 |
| `/api/office/drafts/{id}/export` | AUTH | text export | `correspondence_drafts` | PARTIAL | Phase 8/9 |
| `/auth/callback` | PUBLIC | OAuth/e-mail code exchange, MFA routing | Supabase Auth | ACTIVE | Phase 2 |
| `/auth/logout` | PUBLIC | sign out | Supabase Auth | ACTIVE | Phase 2 |
| `/go/{offer}` | PUBLIC | affiliate redirect | `lib/affiliate-offers` | ACTIVE | Phase 17 |

Route handler files: **33** — 30 under `/api/*`, 2 auth handlers (`/auth/callback`, `/auth/logout`),
and 1 public redirect (`/go/{offer}`).

### 2.4 Legacy inventory (report only — do not delete yet)

Legacy / pre-HORIZON route patterns (approx. **12**): `/{locale}/check`, `/{locale}/uslugi`,
`/{locale}/produkte`, `/{locale}/za-nas`, `/{locale}/tarife`, `/{locale}/zayavka`,
`/{locale}/anfrage`, `/{locale}/angebote/{offer}`, `/{locale}/email-generator`,
`/{locale}/office`, `/{locale}/affiliate-hinweis`, `/{locale}/protected`.

Legacy platform references (report only — do not delete yet):
`KintexBG` (~77 occurrences), `HAMMAL` (~26 occurrences),
Supabase project refs `ambhlmdrfsgdbbljjsic` (`kintex-assistant-eu`) and
`numyqalfphyrnedlfzfs` (`ai-home-office-v1-eu`), `finanzberaterbg.de` `metadataBase`,
`lib/kintex-*.ts`, `lib/office/**` naming, `source-documents` bucket.

---

## 3. Target site map

These are TARGET routes. They are not required to exist yet. Nothing is redirected or renamed now.

### 3.1 LAYER 0 — PUBLIC

```text
/{locale}
├── /
├── /how-it-works
├── /functions
├── /security
├── /contact
├── /auth/login
├── /auth/sign-up
└── legal pages   (impressum, datenschutz, agb, widerruf, affiliate-hinweis)
```

- Public Layer 0 must be usable in every supported UI locale.
- `/functions` replaces the current sprawl of separate product/marketing routes.
- `/security` is a public trust page and is distinct from the authenticated
  `/{locale}/security` account-security page.

### 3.2 LAYER 1 — FIRST LOGIN / ONBOARDING

```text
/{locale}/onboarding
├── /language
├── /profile
├── /tour
└── /finish
```

Expected flow:

```text
SIGN UP
→ EMAIL CONFIRMATION
→ LOGIN
→ FIRST-LOGIN CHECK
→ LANGUAGE
→ MINIMAL PROFILE
→ SHORT CLICK GUIDE
→ DASHBOARD
```

- Onboarding is a short first-login tour, aligned with the feasibility audit; not seven mandatory screens.
- First-login state must be persisted (profile-level), so the tour runs once and is resumable.
- No onboarding route exists today.

### 3.3 PERSISTENT HORIZON GUIDE

```text
/{locale}/guide
```

Task tree:

- understand a document
- reply to an authority
- fill an official form
- cancel a contract
- I do not know what to do

The guide must remain permanently accessible after onboarding (header, dashboard, and help entry points).

### 3.4 HORIZON HOME

```text
/{locale}/dashboard
```

Primary user modules:

- Agentur für Arbeit
- Jobcenter
- Kündigung
- Steuererklärung
- Unterlagen erklären
- My Cases
- Profile
- Settings / Security

The five user modules are Agentur für Arbeit, Jobcenter, Kündigung, Steuererklärung and
Unterlagen erklären. My Cases, Profile and Settings/Security are account surfaces, not user modules.

---

## 4. Shared engine architecture

The five user modules must **not** become five duplicated backend systems. All five consume
one shared case-and-document core.

### 4.1 HORIZON CASE ENGINE — core spine

```text
case
→ source documents
→ extracted facts
→ messages
→ drafts
→ approvals
→ tasks
→ audit
```

### 4.2 Shared engines

For every engine: PURPOSE · EXISTING REUSABLE CODE · EXISTING DATABASE SUPPORT ·
MISSING PARTS · DEPENDENT MODULES · TARGET STATUS · COMPLETION CRITERIA.

#### E1 — Case Engine

- **PURPOSE:** one case backbone for every module; ownership, state machine, timeline.
- **EXISTING REUSABLE CODE:** `lib/office/repositories/cases.ts` (owner-scoped CRUD, audit on archive),
  `lib/office/repositories/case-detail.ts`, `lib/office/repositories/documents.ts`,
  `lib/office/supabase/audit.ts`, `lib/office/supabase/ownership.ts`,
  `lib/workplace/state-machine.ts` (14 statuses, 10 guarded actions),
  `app/api/office/cases/*`.
- **EXISTING DATABASE SUPPORT:** `cases`, `platform_cases`, `case_messages`, `tasks`,
  `platform_tasks`, `audit_events`, `platform_audit_events`, `source_documents`, `document_pages`.
- **MISSING PARTS:** a single canonical case model (assistant `cases` uses `owner_id`;
  platform `platform_cases` uses household scoping — two overlapping models exist);
  module-to-case typing for Agentur/Jobcenter/Kündigung/Steuer; unified status vocabulary
  (`CaseStatus` vs `workplaceStatuses` vs platform case status).
- **DEPENDENT MODULES:** Phases 4–17.
- **TARGET STATUS:** AUDITED.
- **COMPLETION CRITERIA:** one documented case model; every module creates cases through it;
  ownership enforced by RLS and repository; audited transitions; tests for cross-tenant isolation.

#### E2 — Document Intake / OCR

- **PURPOSE:** accept screenshot, photo, PDF, pasted text, email content and produce page-level text.
- **EXISTING REUSABLE CODE:** `lib/documents/validation.ts` (canonical-project guard),
  `lib/documents/extraction.ts`, `lib/contracts/extraction.ts`,
  `lib/office/workflow/pdf-extraction.ts`, `lib/office/workflow/pdf-ocr.ts`,
  `lib/office/workflow/ocr-provider.ts` (Tesseract `deu+eng`),
  `lib/office/repositories/documents.ts` (bucket `source-documents`, PDF/JPEG/PNG, ≤10 MB, owner-prefixed path),
  `app/api/documents/*`, `app/api/office/documents/*`.
- **EXISTING DATABASE SUPPORT:** `documents`, `document_pages`, `source_documents`,
  `document_analysis_results`, private Storage buckets (`documents`, `source-documents`;
  migration `…124031_documents_storage_bucket`).
- **MISSING PARTS:** pasted-text and email-content intake; page-level source linkage for every fact;
  a deterministic extraction contract shared by both document stacks.
- **DEPENDENT MODULES:** Phases 6, 8, 16, 17; feeds E3/E5.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** all five input types accepted; OCR/extract results stored per page;
  every extracted fact carries page evidence; failures produce explicit error states.

#### E3 — Translation Layer

- **PURPOSE:** explain German content in the user's conversation language and produce German output.
- **EXISTING REUSABLE CODE:** `lib/office/workflow/deterministic.ts` (`DeterministicTranslator`),
  `lib/office/workflow/interfaces.ts` (`Translator`), `lib/office/locales.ts`,
  `lib/i18n/*`, `messages/{bg,de}.json`.
- **EXISTING DATABASE SUPPORT:** `profiles.locale`, `profiles.conversation_locale`,
  `profiles.output_locale`, `cases.ui_locale`, `cases.conversation_locale`
  (migration `…005500_add_profile_locale_preferences`, vocabulary `bg,de,ru,pl,sr,ro`).
- **MISSING PARTS:** real translation provider (the deterministic translator only prefixes a
  translation label for non-`de`); the three language concepts are not persisted as distinct
  first-class concepts; no per-document translation storage.
- **DEPENDENT MODULES:** Phases 6, 7, 8, 12–17.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** UI / conversation / output language are independently stored and honored;
  translation is always marked as translation, never as the authoritative original.

#### E4 — Risk / Urgency Engine

- **PURPOSE:** deterministic deadlines, urgency, and uncertainty-aware risk signals.
- **EXISTING REUSABLE CODE:** `lib/kintex-radar.ts` (deterministic `Europe/Berlin` calendar-date
  signals, `attention` / `info` tones), `lib/workplace/state-machine.ts` (blocker codes
  `UNCONFIRMED_FACTS`, `MISSING_DOCUMENT`, `MISSING_INFO`, `NO_APPROVAL`),
  `lib/status.ts`, `lib/office/workflow/deterministic.ts`.
- **EXISTING DATABASE SUPPORT:** `deadlines`, `contract_radar_history`, `radar_events`, `tasks`.
- **MISSING PARTS:** fraud/scam assessment with uncertainty-aware states
  (`risk signals detected` / `no obvious risk signals` / `cannot determine`);
  one urgency vocabulary shared across modules.
- **DEPENDENT MODULES:** Phases 6, 14, 16; used by all five modules.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** deterministic, source-backed, versioned; never makes an unsupported
  accusation; explicit `cannot determine` state; deadlines computed in `Europe/Berlin` calendar dates.

#### E5 — Context AI Assistant

- **PURPOSE:** explanation, translation, extraction assistance, missing-question generation,
  drafting, and summarization inside the active case context.
- **EXISTING REUSABLE CODE:** `lib/office/ai/routing.ts` (`language-router-intent-v1`),
  `lib/office/ai/interviewer.ts` (`missing-info-interviewer-v1`, max 3 questions),
  `lib/office/ai/guards.ts` (quota via `consume_ai_quota`, Groq circuit breaker),
  `lib/office/ai/groq-draft-generator.ts`, `lib/home-office/groq-provider.ts`,
  `lib/home-office/cerebras-provider.ts`, `lib/home-office/provider.ts` (demo fallback),
  `app/api/chat/route.ts`, `lib/rate-limit.ts`.
- **EXISTING DATABASE SUPPORT:** `usage_counters`, `consume_ai_quota` RPC,
  `cases`, `extracted_facts`, `case_messages`, `document_analysis_results`.
- **MISSING PARTS:** persistent case context for the assistant; model/prompt version registry;
  per-module guard rails.
- **DEPENDENT MODULES:** Phases 7, 8, 12–17.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** AI never decides authorization, final approval, send execution,
  deterministic financial/tax arithmetic, or database tenant access; every AI output is a draft
  with provenance and version.

#### E6 — Draft → Review → Approval

- **PURPOSE:** produce a German draft, require explicit review, bind approval to immutable content.
- **EXISTING REUSABLE CODE:** `lib/office/workflow/deterministic.ts`
  (`DeterministicDraftGenerator`, `DeterministicSafetyReviewer`, required fact keys
  `recipient`, `subject`, `request`), `lib/workplace/state-machine.ts`
  (`DRAFT_READY → USER_REVIEW → APPROVED`), `lib/office/workflow/approval.ts`
  (`approvalMatches`), `app/api/office/cases/{id}/workflow`, `app/api/office/drafts/{id}/approve`,
  `app/api/office/drafts/{id}/export`.
- **EXISTING DATABASE SUPPORT:** `correspondence_drafts` (`content_hash`, `input_facts_hash`,
  `review_status`, `version`, `translation`), `platform_correspondence_drafts`, `approvals`
  (`approved_hash`), `platform_approvals`.
- **MISSING PARTS:** review UI wired end-to-end; required acknowledgement step;
  explicit blocking when facts are unconfirmed.
- **DEPENDENT MODULES:** Phases 8, 12–17.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** approval is hash-bound to the exact reviewed content;
  any content change requires re-approval; missing facts block; nothing sends without approval.

#### E7 — Official PDF Form Engine

- **PURPOSE:** fill the original official German form template with confirmed facts; generate cover text.
- **EXISTING REUSABLE CODE:** `lib/fms-2025-registry.ts` (official FMS form manifest),
  `lib/canonical-tax-model.ts`, `lib/tax-pipeline.ts`, `lib/tax-questionnaire-schema.ts`,
  `components/finance/tax-form-registry.tsx`, `components/finance/tax-pipeline-review.tsx`,
  `app/api/steuer/pdf`.
- **EXISTING DATABASE SUPPORT:** `tax_form_registry` (official source, verification_status,
  mapping_status, technical_pdf_status), `official_sources`, `tax_cases`.
- **MISSING PARTS:** an actual PDF writer — **no PDF generation library is present in `package.json`**
  (no pdfkit / pdf-lib / jspdf / puppeteer / pdfmake). `/api/steuer/pdf` returns readiness only.
  Form-field mapping for Agentur für Arbeit, Jobcenter and Kündigung.
- **DEPENDENT MODULES:** Phases 9, 12, 13, 15.
- **TARGET STATUS:** NOT_STARTED (readiness metadata only).
- **COMPLETION CRITERIA:** the original official template is used unmodified; only confirmed facts fill
  fields; unknown fields remain empty; output is previewable, reviewable, approvable, downloadable.

#### E8 — Signature Engine

- **PURPOSE:** optional user signature on an approved document.
- **EXISTING REUSABLE CODE:** none found in application code.
- **EXISTING DATABASE SUPPORT:** none found.
- **MISSING PARTS:** provider selection, applicable-form verification, signature record, audit.
- **DEPENDENT MODULES:** Phases 10, 14, 15.
- **TARGET STATUS:** NOT_STARTED.
- **COMPLETION CRITERIA:** provider explicitly approved; a simple "I accept" button is never
  presented as a signature; signature events are auditable and cannot be forged.

#### E9 — Email Connection & Send

- **PURPOSE:** connect an approved mail channel and send or submit only after explicit approval.
- **EXISTING REUSABLE CODE:** `app/api/office/drafts/{id}/export` (download only);
  `app/api/service-requests/route.ts` (outbound webhook with shared secret).
- **EXISTING DATABASE SUPPORT:** `correspondence_drafts.attachments`, `approvals`.
- **MISSING PARTS:** mailbox connection (Gmail/IMAP/SMTP), send engine, delivery status,
  retry/idempotency, audit. **No mail-sending dependency exists in `package.json`.**
- **DEPENDENT MODULES:** Phases 11, 12–17.
- **TARGET STATUS:** NOT_STARTED.
- **COMPLETION CRITERIA:** the channel is lawfully configured; send requires a current approval hash;
  every send is idempotent and audited; failure is surfaced, never silently invented or retried.

#### E10 — Audit / Tasks / Deadlines

- **PURPOSE:** append-only audit, task queue with idempotency, deterministic deadlines.
- **EXISTING REUSABLE CODE:** `lib/office/supabase/audit.ts`, `lib/office/workflow/records.ts`,
  `lib/workplace/state-machine.ts`, `lib/kintex-radar.ts`, `lib/status.ts`.
- **EXISTING DATABASE SUPPORT:** `audit_events`, `platform_audit_events`, `tasks`, `platform_tasks`,
  `deadlines`, `usage_counters`.
- **MISSING PARTS:** one audit table (two overlapping models exist); task idempotency used
  consistently at all call sites; notification delivery.
- **DEPENDENT MODULES:** all phases.
- **TARGET STATUS:** PARTIAL.
- **COMPLETION CRITERIA:** every consequential action writes one audit row; tasks are idempotent
  and cancellable; deadlines are deterministic and timezone-stable.

---

## 5. AI / program / workflow map

Where each technology belongs. Technology classification is normative.

### 5.1 APPLICATION (runtime, user-facing)

| Technology | Role | Evidence on `main` |
| --- | --- | --- |
| Next.js 16 App Router | application framework and routing | `app/**`, `next.config.mjs` |
| React 19 | UI runtime | `components/**`, `"use client"` modules |
| TypeScript 5.7 | type safety | `tsconfig.json`, `pnpm typecheck` |
| Tailwind CSS 4 | styling | `app/globals.css`, `postcss.config.mjs` |
| next-intl 4 | UI message layer | `i18n/routing.ts`, `i18n/request.ts` |
| Custom dictionaries | second locale layer | `lib/i18n/dictionaries.ts`, `messages/*.json` |
| PWA | installable shell | `public/manifest.json`, `pwa-service-worker` |

### 5.2 DATA / SECURITY

| Technology | Role | Evidence |
| --- | --- | --- |
| Supabase Auth | identity, sessions, MFA | `lib/supabase/{client,server,proxy}.ts`, `app/auth/*` |
| PostgreSQL | persistent data | `supabase/migrations/**` |
| Private Storage | document originals | buckets `documents` and `source-documents`, signed URLs (300 s) |
| RLS | tenant isolation | `enable row level security` + owner policies; `supabase/tests/rls/kintex_b2c_isolation.sql` |
| Canonical project | `mteguzgbiuexmdcrqajj` / `vzg-plattform-deutschland` / `eu-central-1` | `supabase/project.json`, `lib/documents/validation.ts` |

### 5.3 AI RUNTIME

Evidence found in the repository:

| Provider | Evidence | Function |
| --- | --- | --- |
| Groq (Groq-compatible) | `@ai-sdk/groq`, `lib/home-office/groq-provider.ts`, `lib/office/ai/*`, `app/api/chat/route.ts` | extraction, routing, interviewing, drafting |
| Cerebras | `lib/home-office/cerebras-provider.ts`, `lib/contracts/extraction.ts`, `app/api/generate-letter/route.ts` | alternative Bescheid/document analysis |

Also declared in `.env.example`: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
(optional OpenRouter-compatible credentials). No OpenRouter client code was found in `lib/` or `app/`.

AI **may** perform:

- explanation
- translation
- document extraction assistance
- missing-question generation
- drafting
- summarization

AI **must NOT** decide:

- authorization
- final user approval
- consequential send execution
- deterministic financial / tax arithmetic
- database tenant access

### 5.4 AUTOMATION

`n8n` is intended for bounded orchestration only:

- approved webhooks
- notifications
- email workflow coordination
- delivery-status handling
- scheduled follow-ups
- document pipeline coordination

Current evidence: `app/api/service-requests/route.ts` posts to `N8N_OFFER_REQUEST_WEBHOOK_URL`
with `N8N_WEBHOOK_SECRET`; documented in `docs/N8N_OFFER_REQUEST_PLAN.md`.
n8n must never bypass application authorization, RLS, or user approval.

### 5.5 DEVELOPMENT TOOLS (BUILD-TIME, not end-user runtime)

These are build-time tools and must never be presented as end-user runtime components:

`ChatGPT`, `OpenHands`, `AionUi`, `OpenClaw`, `Manus`, `Gordon`, `v0`, `GitHub`, `Render`.

- GitHub `main` in `tarifberatung24-blip/VZGplattform` is the single source of truth.
- Render is the current production deployment authority, deploying from GitHub `main`
  (`/api/health` reports `RENDER_GIT_COMMIT`; README cites `vzgplattform.onrender.com`).
- v0 and Vercel are not production authority; `app/layout.tsx` still declares
  `generator: "v0.app"` and `lib/kintex-smart-dashboard.ts` still declares `deployment: "Vercel"`.

---

## 6. Language architecture

Three different concepts must be modeled, stored, and honored independently:

| Concept | Meaning | Example |
| --- | --- | --- |
| `UI_LANGUAGE` | language of navigation, buttons, labels | Bulgarian |
| `CONVERSATION_LANGUAGE` | language the user speaks with HORIZON | Bulgarian |
| `OUTPUT_LANGUAGE` | language of the produced official document | German |

Example: UI = Bulgarian, Conversation = Bulgarian, Official document output = German.

### 6.1 CURRENT vs TARGET

| Dimension | CURRENT | TARGET |
| --- | --- | --- |
| UI locales | `bg`, `de` (`i18n/routing.ts`, `lib/i18n/dictionaries.ts`, `messages/{bg,de}.json`) | `bg`, `de` initially; expansion only by approved phase |
| Default UI locale | `bg` | unchanged |
| Locale cookie | `finanzbg_locale` | rename deferred; not in this task |
| DB locale vocabulary | `bg`, `de`, `ru`, `pl`, `sr`, `ro` (`profiles.locale` / `conversation_locale` / `output_locale`; `lib/office/locales.ts`; `cases.ui_locale` / `conversation_locale`) | keep vocabulary; separate UI / conversation / output explicitly |
| Office prototype locales | inline `bg,de,ru,pl,sr,ro` in `app/[locale]/office/page.tsx` | folded into the shared language layer |
| API locale validation | `bg`/`de` only (`app/api/kindergeld/draft/route.ts` `allowedLocales`) | derived from the language layer |

**Current support is narrower than the database vocabulary**: the UI route layer supports `bg`
and `de`, while `profiles` and the office prototype already support `bg, de, ru, pl, sr, ro`.

Do not expand languages in this task. Document CURRENT vs TARGET only.

---

## 7. User-module target workflows

Target behavior only. Nothing here is to be built yet.

### 7.1 AGENTUR FÜR ARBEIT

Use the official name **Agentur für Arbeit**.

```text
Information
→ choose process / form
→ AI-guided questions
→ confirmed facts
→ fill original official German template
→ generate German cover text
→ preview
→ user review
→ required acknowledgement
→ explicit user approval
→ PDF download OR approved send
```

### 7.2 JOBCENTER

Same shared architecture as Agentur für Arbeit. No duplicated engine.

Jobcenter-specific parts:

- information
- knowledge
- form registry
- required fields
- recipient rules

### 7.3 KÜNDIGUNG

```text
contract upload / select
→ extract provider / customer / contract facts
→ identify termination data only when evidenced
→ explain
→ generate Kündigungsschreiben
→ preview
→ approval
→ optional signature
→ download / send
```

Missing terms must remain missing. **Never invent Kündigungsfristen.**

### 7.4 STEUERERKLÄRUNG

```text
information
→ official forms
→ guided collection
→ deterministic calculations where approved
→ AI explanation / drafting
→ review
→ PDF package
→ manual submission
```

Until an approved ELSTER integration exists: **NO automatic ELSTER submission.**
Manual submission is to the competent Finanzamt.
Current code is a contract only: `lib/elster-provider.ts` exposes `ElsterProvider` and
`UnconfiguredElsterProvider`; `elsterCredentialPolicy` states that no ELSTER passwords,
certificate passwords, `.pfx` files, private keys, or credential data are collected or stored.

### 7.5 UNTERLAGEN ERKLÄREN

Input may be: screenshot, photo, PDF, pasted text, email content.

```text
UPLOAD
→ OCR / PARSE
→ EXTRACT
→ CLASSIFY
→ TRANSLATE
→ EXPLAIN
→ DEADLINE
→ RISK / URGENCY
→ NEXT ACTION
→ OPTIONAL REPLY
→ REVIEW
→ APPROVAL
→ OPTIONAL SIGN
→ OPTIONAL SEND
```

Fraud/scam handling must use uncertainty-aware states:

- risk signals detected
- no obvious risk signals
- cannot determine

Never make an unsupported accusation.

### 7.6 CONTRACT MANAGEMENT (Phase 17)

Existing contract surfaces (`/{locale}/vertraege`, `contracts-workspace`,
`contract-center-workspace`) are the reuse basis: contract archive, provider/cost visibility,
cancellation deadlines, deterministic Radar signals, and user-approved next steps.
Contract management remains distinct from Kündigung (Phase 14) but shares the same case engine.

---

## 8. Branding drift audit (report only)

Branding drift exists in application code and must **not** be fixed in Phase 0.

| Term | Approx. occurrences in `app components lib i18n messages public` | Where |
| --- | ---: | --- |
| `KintexBG` | 77 | auth pages, office prototype, kindergeld, footer/nav, tests, `globals.css` |
| `HAMMAL` | 26 | `components/brand/logo.tsx`, `global-header.tsx`, `global-footer.tsx`, `messages/{bg,de}.json` |
| `VZG CONSULT` | 19 | metadata, auth pages, headers |
| `VZGplattform` | 15 | metadata, PWA, README |
| `HORIZON` | 3 | `lib/capital/intake/categories*.ts` only — not user-facing |
| `Tarifberater24` | 3 | `lib/legal-profile.ts`, `app/[locale]/contact/page.tsx` |
| `finanzberaterbg.de` | 3 | `app/layout.tsx` `metadataBase`, other metadata |

Also present: `docs/TERRA_START.md` still names the product `HAMMAL by VZG`;
`README.md` title is `KintexBG / VZGplattform`; `app/[locale]/[[...slug]]/page.tsx` emits
`title: "KintexBG — BY VZG CONSULT"` for workspace paths; `lib/kintex-smart-dashboard.ts`
declares `appName: "KintexBG"` and `deployment: "Vercel"` (Render is the actual authority);
`app/layout.tsx` declares `generator: "v0.app"`.

The product name `HORIZON by VZG` appears in **no** user-facing surface yet.

---

## 9. Canonical Supabase facts and discrepancies

Canonical project identity:

| Field | Value |
| --- | --- |
| projectRef | `mteguzgbiuexmdcrqajj` |
| project | `VZGplattform` (`vzg-plattform-deutschland`) |
| region | `eu-central-1` |
| runtime URL | `https://mteguzgbiuexmdcrqajj.supabase.co` |

Source: `supabase/project.json`, `SUPABASE_CONSOLIDATION_PLAN.md`, `docs/TERRA_START.md`.
Legacy / superseded refs (do not use for new configuration): `ambhlmdrfsgdbbljjsic`, `numyqalfphyrnedlfzfs`.

No remote SQL was executed, no migration was applied, no RLS was changed, no customer content
was read, and no service-role credential was used. This section inspects repository migration
contracts only.

### 9.1 Repository migration history

```text
20260909112037_kintex_assistant_baseline.sql
20260910005500_add_profile_locale_preferences.sql
20260911231544_add_atomic_ai_quota.sql
20260912134830_platform_schema_additive.sql
20260912135743_financial_education_lessons.sql
20260914120650_document_processing_hardening.sql
20260914124021_document_flow_tables.sql
20260914124031_documents_storage_bucket.sql
20260914215037_ensure_kintex_household_rpc.sql
20260915003013_kindergeld_cases.sql
20260915003021_contract_radar_pilot.sql
20260915090000_optimize_sessions.sql
20260916000000_contact_leads_table.sql
20260916070000_unified_leads_public_and_authenticated.sql
```

Prepared (not part of the normal migration flow): `supabase/prepared/*`, `supabase/baseline/*`.

### 9.2 Table families present in repository migrations

- Assistant core (baseline): `profiles`, `cases`, `source_documents`, `document_pages`,
  `case_messages`, `extracted_facts`, `correspondence_drafts`, `approvals`, `tasks`,
  `audit_events`, `usage_counters`.
- Platform additions: `households`, `providers`, `contracts`, `documents`, `deadlines`,
  `financial_profiles`, `family_members`, `opportunity_checks`, `tax_cases`, `contract_reviews`,
  `benefit_cases`, `official_sources`, `tax_form_registry`, `finanzamt_requests`,
  `provider_integrations`, `provider_submission_attempts`, `provider_submission_events`,
  `provider_receipts`, `platform_cases`, `platform_tasks`, `platform_correspondence_drafts`,
  `platform_approvals`, `platform_audit_events`.
- Later additions: `financial_education_lessons`, `document_analysis_results`, `document_reviews`,
  `kindergeld_cases`, `contract_radar_history`, `radar_events`, `optimize_sessions`, `leads`.

### 9.3 Discrepancies to REPORT (not fix)

1. **`tax_assessments` is absent from repository migration history.** A full-text search for
   `tax_assessments` across the repository returned no match. The repository instead has
   `tax_cases` (platform additive) and `benefit_cases`. This is a metadata-vs-repository
   discrepancy and is reported, not corrected.
2. **Two overlapping case/task/audit/draft/approval models coexist:** assistant
   `cases`, `tasks`, `audit_events`, `correspondence_drafts`, `approvals` (owner-scoped) and
   platform `platform_cases`, `platform_tasks`, `platform_audit_events`,
   `platform_correspondence_drafts`, `platform_approvals` (household-scoped). No repository
   record designates which is canonical for HORIZON.
3. **RLS coverage cannot be confirmed by static grep alone.** `platform_schema_additive.sql`
   enables RLS through a dynamic `execute format('alter table public.%I enable row level security', …)`
   block, so plain pattern counts undercount coverage. Repository evidence shows explicit RLS on
   `official_sources` and `tax_form_registry` plus the dynamic loop. Actual deployed RLS state
   was not inspected and must not be assumed.
4. **`ensure_kintex_household` naming** is used by `lib/supabase/household.ts`
   (`supabase.rpc("ensure_kintex_household")`) with migration `…215037_ensure_kintex_household_rpc.sql`.
   The legacy name persists in the canonical project.
5. **Two Storage buckets/prefixes** exist for documents: `documents` and `source-documents`.
6. **Prepared SQL and baseline SQL** are not applied by the normal migration flow; whether they
   match the deployed schema is unverified.

---

## 10. Governance summary

- `docs/HORIZON_MASTER_MAP.md` (this file) is the canonical target build map.
- [`docs/HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md) tracks implementation status.
- Work proceeds sequentially by approved phase; only one active implementation phase unless the
  owner explicitly authorizes otherwise.
- A later phase must not be started merely because its files already exist.
- DONE requires the complete definition in §0. Accepted DONE modules become FROZEN.
- FROZEN modules cannot be changed without explicit owner reopening.
- Unrelated refactoring of previous phases is prohibited.
- Before every task the agent must identify: `ACTIVE_PHASE`, `ALLOWED_FILES`,
  `FROZEN_FILES / SYSTEMS`, `OUT_OF_SCOPE`.
- Capital is preserved but outside the current active build sequence.
- GitHub `main` remains source of truth. Render remains current production deployment authority.
- No DB / schema / RLS / env / deployment change without explicit owner authorization.