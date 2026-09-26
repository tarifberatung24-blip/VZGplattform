# HORIZON by VZG — Final Site Map

Reconciled against `main` @ `f0bc24f` (which includes the N3/N4/N6 navigation changes at
`015d606` and the N5/N7 cleanup).
Documentation only. This file records what is reachable today and how it is gated; it does not
redesign UI. The removal/redirect candidates in §8 were executed by N7 after owner approval, and
§7 records the resulting disposition of each legacy surface.

Canonical architecture: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md).
Phase status: [`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md).
Working list: [`HORIZON_EXECUTION_CHECKLIST.md`](./HORIZON_EXECUTION_CHECKLIST.md).
Route/product detail: [`HORIZON_ROUTE_PRODUCT_MAP.md`](./HORIZON_ROUTE_PRODUCT_MAP.md).
Navigation architecture: [`HORIZON_NAVIGATION_DESIGN.md`](./HORIZON_NAVIGATION_DESIGN.md).

All localized routes exist for both `bg` and `de` (`/{locale}/...`). Root-level routes without a
locale are forwarded to the locale-prefixed form by `proxy.ts`, except `/api/**`, `/_next/**`,
`/favicon.ico`, `/auth/callback` and `/auth/logout`, which are served directly.

## Access legend

| Value | Meaning |
|---|---|
| PUBLIC | Reachable with no session. |
| AUTH | The page or its API enforces a session. |
| REDIRECT | Not a destination; it forwards only. |

Protection source of truth: `protectedPrefixes` in `lib/supabase/auth-routing.ts`, applied by
`updateSession()` in `lib/supabase/proxy.ts`. `isKintexWorkspacePath()` in
`lib/kintex-navigation.ts` is presentation only — it decides whether the HORIZON shell draws, not
who may enter.

## Route classification index

Every reachable route, grouped by class. Sections 1–10 below are the detail; this index is the
checklist. A route appears in exactly one class.

| Class | Section | Routes |
|---|---|---|
| Public — Layer 0 | §1 | `/{locale}`, `/{locale}/how-it-works`, `/{locale}/functions`, `/{locale}/security`, `/{locale}/contact`, `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/affiliate-hinweis` |
| Public — affiliate / partner | §2 | `/{locale}/versicherungen`, `/{locale}/angebote/business-insurance`, `/{locale}/angebote/kfz`, `/{locale}/angebote/[offer]`, `/go/[offer]`, `/{locale}/go/[offer]` |
| Auth + onboarding | §3 | `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`, `/auth/forgot-password`, `/auth/update-password`, `/auth/mfa-verify`, `/auth/error`, `/auth/callback`, `/auth/logout`, `/{locale}/onboarding/{profile,tour,finish}`, `/{locale}/onboarding` (REDIRECT), `/{locale}/onboarding/language` (REDIRECT) |
| Authenticated workspace | §4 | `/{locale}/dashboard`, `/{locale}/guide`, `/{locale}/guide/[caseId]`, `/{locale}/vertraege`, `/{locale}/documents`, `/{locale}/steuer`, `/{locale}/steuer/providers`, `/{locale}/steuer/review`, `/{locale}/profil`, `/{locale}/konto/sicherheit`, `/{locale}/assistant`, `/{locale}/finanzamt`, `/{locale}/finanzbildung` |
| Service modules (no routes of their own) | §5 | P12–P17 + P7/P10/P11 panels inside `/{locale}/guide/[caseId]` |
| Public outside the workspace shell | §6 | `/{locale}/anspruch`, `/{locale}/email-generator` |
| Legacy / compatibility (reachable; redirects noted) | §7 | `/{locale}/protected`, `/{locale}/protected/home-office` (REDIRECT), `/{locale}/protected/security` (REDIRECT), `/{locale}/office` (REDIRECT), `/{locale}/office/cases/[id]` (REDIRECT), `/check` (REDIRECT), `/uslugi` (REDIRECT), `/produkte` (REDIRECT), `/tarife` (REDIRECT), `/kindergeld`, `/za-nas`, `/app`, `/{locale}/anfrage`, `/{locale}/zayavka` |

Removal/redirect candidates and their executed disposition are in §8; API route handlers in §9;
Capital in §10.

---

## 1. Public — Layer 0

| Route | Access | Purpose | Status |
|---|---|---|---|
| `/{locale}` | PUBLIC | Layer 0 home (redirects a signed-in user to `/{locale}/dashboard`) | IMPLEMENTED |
| `/{locale}/how-it-works` | PUBLIC | Explainer | IMPLEMENTED |
| `/{locale}/functions` | PUBLIC | Functions overview | IMPLEMENTED |
| `/{locale}/security` | PUBLIC | Trust page | IMPLEMENTED |
| `/{locale}/contact` | PUBLIC | Contact form → `/api/leads` | IMPLEMENTED |
| `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/affiliate-hinweis` | PUBLIC | Legal | IMPLEMENTED |

Note: `/{locale}/security` is the public trust page (`PublicLayerPage`). The authenticated MFA
surface is `/{locale}/konto/sicherheit` (legacy section below). `HORIZON_MASTER_MAP.md` §2.2
previously labeled `/{locale}/security` as `AUTH`; that label has been corrected to `PUBLIC` in
the Master Map to match this map and `app/[locale]/security/page.tsx`.

## 2. Public — Affiliate / partner (HORIZON OPTIMIZE)

| Route | Access | Purpose | Status |
|---|---|---|---|
| `/{locale}/versicherungen` | PUBLIC | Insurance hub (partner insurance) | IMPLEMENTED |
| `/{locale}/angebote/business-insurance` | PUBLIC | Firmenversicherung partner landing | IMPLEMENTED |
| `/{locale}/angebote/kfz` | PUBLIC | Kfz partner landing | IMPLEMENTED |
| `/{locale}/angebote/[offer]` | PUBLIC | Generic affiliate landing | IMPLEMENTED |
| `/go/[offer]` | PUBLIC | Affiliate redirect (canonical handler) | IMPLEMENTED |
| `/{locale}/go/[offer]` | PUBLIC | Affiliate redirect (locale mirror) | IMPLEMENTED |

Both `go` routes resolve to the same handler in `app/go/[offer]/route.ts`. An offer redirects only
when it is approved **and** a real HTTPS deeplink is configured; otherwise the handler responds
`503`, and an unknown offer responds `404`. No tracking parameter is invented or appended. See
`lib/affiliate-offers.ts`. These surfaces are classified by North Star stage, not by an
implementation phase; no P0–P17 phase owns them.

## 3. Auth and onboarding

| Route | Access | Purpose | Status |
|---|---|---|---|
| `/auth/login` | PUBLIC | Sign in | IMPLEMENTED |
| `/auth/sign-up` | PUBLIC | Register | IMPLEMENTED |
| `/auth/sign-up-success` | PUBLIC | Register confirmation | IMPLEMENTED |
| `/auth/forgot-password` | PUBLIC | Account recovery request | IMPLEMENTED |
| `/auth/update-password` | AUTH | Set new password | IMPLEMENTED |
| `/auth/mfa-verify` | AUTH | MFA challenge | IMPLEMENTED |
| `/auth/error` | PUBLIC | Auth error surface | IMPLEMENTED |
| `/auth/callback`, `/auth/logout` | route handlers | Code exchange; sign out | IMPLEMENTED |
| `/{locale}/onboarding/language` | REDIRECT | Legacy step → `/{locale}/onboarding/profile` (308 in `proxy.ts`) | REDIRECT |
| `/{locale}/onboarding/profile` | AUTH | First login (P2) | IMPLEMENTED |
| `/{locale}/onboarding/tour` | AUTH | First login (P2) | IMPLEMENTED |
| `/{locale}/onboarding/finish` | AUTH | First login (P2) | IMPLEMENTED |
| `/{locale}/onboarding` (bare/unknown step) | REDIRECT | Resolves the user's real step and forwards | REDIRECT |

`proxy.ts` normalizes a locale-prefixed auth URL back to the unprefixed handler. Auth-flow routes
are excluded from the onboarding gate.

## 4. Authenticated HORIZON workspace

These routes render inside the workspace shell (`components/finance/workspace-shell.tsx`). The
destinations exposed by the workspace navigation (`components/layout/horizon-sidebar.tsx`) are
marked in the last column.

| Route | Access | Product area | Status | In primary nav |
|---|---|---|---|---|
| `/{locale}/dashboard` | AUTH | Overview / HORIZON Home (P4) | PARTIAL | Yes |
| `/{locale}/guide` | AUTH | Guide (P3) | IMPLEMENTED | Yes |
| `/{locale}/guide/[caseId]` | AUTH | Guide case workspace (P3, hosts P6–P17 panels) | IMPLEMENTED | via Guide |
| `/{locale}/vertraege` | AUTH | Contracts (P17) | IMPLEMENTED | Yes |
| `/{locale}/documents` | AUTH | Documents (P6) | PARTIAL | Yes |
| `/{locale}/steuer` | AUTH | Steuererklärung (P15) | IMPLEMENTED | Yes |
| `/{locale}/steuer/providers` | AUTH | Steuer providers (P15) | IMPLEMENTED | via Steuern / SteuerTabs (N6) |
| `/{locale}/steuer/review` | AUTH | Steuer review (P15) | IMPLEMENTED | via Steuern / SteuerTabs (N6) |
| `/{locale}/profil` | AUTH | Profile | IMPLEMENTED | Yes |
| `/{locale}/konto/sicherheit` | AUTH | Account security / MFA (N5) | IMPLEMENTED | Yes |
| `/{locale}/assistant` | AUTH | KintexBG-era home-office chat (P7 predecessor) | PARTIAL | No |
| `/{locale}/finanzamt` | AUTH | Finanzamt surfaces | PARTIAL | No |
| `/{locale}/finanzbildung` | AUTH | Financial education | PARTIAL | No |

`/{locale}/konto/sicherheit` renders the existing `MfaSettings` component behind a session check
and is the `security` destination in `lib/navigation/horizon-nav.ts`. It is the canonical
account-security surface; the legacy `/{locale}/protected/security` route redirects here (N5/N7).
No authentication logic, Supabase behaviour, API or schema changed.

`/{locale}/dashboard` is `PARTIAL`: it still composites legacy-era blocks around the HORIZON
module entry; visual cleanup is out of scope until the owner authorizes it.

`/{locale}/assistant` draws the authenticated shell (`isKintexWorkspacePath()` and
`protectedPrefixes` both cover `/assistant`) but is not in the navigation. The P7 case-scoped
assistant lives in the case workspace (`components/guide/case-assistant-panel.tsx`).

## 5. Service modules (P12–P17)

The five service modules have no routes of their own. Each is entered from `/{locale}/dashboard`
(or the guide) and its work happens in `/{locale}/guide/[caseId]` through the shared case engine.
The surfaces are:

| Module | Phase | Entry | Workspace surface |
|---|---|---|---|
| Agentur für Arbeit | P12 | Dashboard module button | `agentur-panel` in the case workspace |
| Jobcenter | P13 | Dashboard module button | `jobcenter-panel` in the case workspace |
| Kündigung | P14 | Dashboard / `/{locale}/vertraege` | letter panel + `/{locale}/guide/[caseId]` |
| Steuererklärung | P15 | Dashboard / `/{locale}/steuer` | tax-year + `official-form-panel` |
| Unterlagen erklären | P16 | Dashboard module button | explanation panel |
| Contract management | P17 | `/{locale}/vertraege` | archive + `Kündigung vorbereiten` link |
| Context assistant | P7 | case workspace | `case-assistant-panel` |
| Signature | P10 | case workspace | `signature-panel` |
| Send | P11 | case workspace | `send-panel` |

The engines that back these surfaces (case engine, PDF form engine, signature, send, audit/tasks)
are shared; see the Shared Engines list in `HORIZON_EXECUTION_CHECKLIST.md`.

## 6. Public routes outside the workspace shell

Reachable without a session. They are **not** matched by `isKintexWorkspacePath()`, so they draw
the public Layer 0 header and footer, and none appears in `protectedPrefixes`.

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/anspruch` | PUBLIC | Entitlement navigator (P4, touched by P12–P13) | PARTIAL | REUSE |
| `/{locale}/email-generator` | PUBLIC | AI letter generator, KintexBG-era (superseded by Draft/Review) | LEGACY | KEEP |

TAR-7/TAR-8 briefly wrapped these in the workspace shell and listed them in the authenticated
navigation; both the shell match and the navigation entries were removed. Whether they deserve
protected workspace versions is a future product decision.

The duplicate camelCase catch-all key `/{locale}/emailGenerator`, which resolved the same
`EmailGeneratorPage`, was removed by N7. The hyphenated `/{locale}/email-generator` route is
unchanged.

## 7. Legacy and compatibility surfaces

Reachable, but not part of the HORIZON workspace navigation. N7 redirected the approved candidates
to a canonical destination; the remaining surfaces were kept reachable because removing them is a
product decision with compatibility risk and no evidence of zero use was gathered. Redirects live
in `lib/navigation/legacy-redirects.ts` and are applied by `proxy.ts` before the localized
catch-all renders.

| Route | Access | Product area | Disposition |
|---|---|---|---|
| `/{locale}/protected` | REDIRECT | Forwards to `/{locale}/dashboard` (handled in `proxy.ts`) | LEGACY |
| `/{locale}/protected/home-office` | REDIRECT | → `/{locale}/assistant` | LEGACY |
| `/{locale}/protected/security` | REDIRECT | → `/{locale}/konto/sicherheit` | LEGACY |
| `/{locale}/office` | REDIRECT | → `/{locale}/guide` (KintexBG communication prototype, superseded by the guide case workspace) | LEGACY |
| `/{locale}/office/cases/[id]` | REDIRECT | → `/{locale}/guide/{caseId}` (case id carried; handled by its own page) | LEGACY |
| `/check` | REDIRECT | → `/{locale}/dashboard` | LEGACY |
| `/uslugi` | REDIRECT | → `/{locale}/functions` | LEGACY |
| `/produkte` | REDIRECT | → `/{locale}/functions` | LEGACY |
| `/tarife` | REDIRECT | → `/{locale}/versicherungen` | LEGACY |
| `/{locale}/onboarding/language` | REDIRECT | → `/{locale}/onboarding/profile` | LEGACY |
| `/kindergeld`, `/za-nas`, `/app` | PUBLIC | Pre-HORIZON marketing surfaces, kept reachable | LEGACY |
| `/{locale}/anfrage`, `/{locale}/zayavka` | PUBLIC | Lead capture → n8n, kept reachable (live lead channel) | LEGACY |

N7 deleted the superseded pages rather than leaving unreachable code: `/{locale}/office`,
`/{locale}/office/cases/[id]`, `/{locale}/onboarding/language`, `/check`, `/produkte`, `/tarife`,
`/uslugi` and `/{locale}/protected/home-office`. `/{locale}/protected/security` was deleted and
re-created as `/{locale}/konto/sicherheit`. Every one of those paths redirects per the table above.
Dead components removed in the same pass: `components/marketing/site-header.tsx`,
`components/dashboard/smart-dashboard-preview.tsx`, `components/finance/personal-dashboard.tsx` and
the `components/office/**` set. `/api/office/**` handlers were kept.

## 8. Legacy route candidates for later removal or redirect

Executed by N7 after owner approval. Each row records the current disposition; KEEP rows remain
open product decisions, not pending work. `/api/office/**` handlers were deliberately **not**
touched: the HORIZON guide and office share the case engine, so those APIs still serve live
surfaces.

| Candidate | Current role | Disposition | Notes / risk |
|---|---|---|---|
| `/{locale}/office` | KintexBG communication prototype; superseded by the guide case workspace | **REDIRECTED** → `/{locale}/guide` | Client-only shell (no server guard) with its own 6-locale copy; `/api/office/**` still serves the guide |
| `/{locale}/office/cases/[id]` | KintexBG case detail | **REDIRECTED** → `/{locale}/guide/{caseId}` | Office and HORIZON share the `cases` table (both keyed on `owner_id`); case-id compat verified |
| `/{locale}/protected` | Alias | **KEPT** (redirect already in place) | None |
| `/{locale}/protected/home-office` | Alias of `/{locale}/assistant` | **REDIRECTED** → `/{locale}/assistant` | KintexBG-era copy |
| `/{locale}/protected/security` | Authenticated MFA | **REDIRECTED** → `/{locale}/konto/sicherheit` | Replaced by the N5 workspace settings surface |
| `/{locale}/check` | Opportunity-check entry | **REDIRECTED** → `/{locale}/dashboard` | None identified |
| `/{locale}/uslugi` | BG-slug services page | **REDIRECTED** → `/{locale}/functions` | BG SEO only |
| `/{locale}/produkte` | Product overview | **REDIRECTED** → `/{locale}/functions` | None identified |
| `/{locale}/tarife` | Tariffs | **REDIRECTED** → `/{locale}/versicherungen` | `affiliate-offers` disclosure preserved on the target |
| `/{locale}/onboarding/language` | Legacy onboarding step | **REDIRECTED** → `/{locale}/onboarding/profile` | Was already a pure redirect; low risk |
| `/{locale}/emailGenerator` | Duplicate camelCase catch-all key for the same `EmailGeneratorPage` | **REMOVED** | No navigation linked the camelCase form |
| `/{locale}/kindergeld` | Kindergeld navigator | **KEEP** | Backed by `/api/kindergeld/draft`; P4 social module not yet delivered |
| `/{locale}/za-nas` | BG about page | **KEEP** | BG copy |
| `/{locale}/app` | PWA install help | **KEEP** | None identified |
| `/{locale}/anfrage`, `/{locale}/zayavka` | Lead capture → n8n | **KEEP** | Live lead channel; `/{locale}/contact` overlaps but is a different pipeline |
| `/{locale}/email-generator` | KintexBG letter generator | **KEEP (RETIRE on approval)** | Public and reachable; superseded by P8 draft/review |

The public/authenticated security naming collision is resolved: `HORIZON_MASTER_MAP.md` §2.2 labels
`/{locale}/security` `PUBLIC`, matching `app/[locale]/security/page.tsx`, and the authenticated
surface is now `/{locale}/konto/sicherheit`.

## 9. API route handlers

No API route is part of product navigation. Listed for completeness.

`/api/chat`, `/api/contracts`, `/api/contracts/[id]`,
`/api/documents/{analyze,extract,review,upload}`, `/api/generate-letter`, `/api/health`,
`/api/horizon/cases/[id]/{assistant,letter,tax-form}`, `/api/kindergeld/draft`, `/api/leads`,
`/api/office/**`, `/api/optimize/**`, `/api/radar`, `/api/service-requests`, `/api/steuer/pdf`.

## 10. Capital

There is no Capital route. Capital is `PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE` (see
`HORIZON_MASTER_MAP.md`). It must not be exposed in navigation, and no route was added.
