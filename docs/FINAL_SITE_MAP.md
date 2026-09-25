# HORIZON by VZG — Final Site Map

Reconciled against `origin/main` @ `56b0aa5` plus the N3/N4/N6 navigation changes present in the
working tree at reconciliation time (those code changes were not yet committed).
Documentation only. This file records what is reachable today and how it is gated; it does not
redesign UI and does not authorize removal or redirect of any route.

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
surface is `/{locale}/protected/security` (legacy section below). `HORIZON_MASTER_MAP.md` §2.2
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
| `/{locale}/onboarding/language` | REDIRECT | Legacy step → `/{locale}/onboarding/profile` | REDIRECT |
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
| `/{locale}/assistant` | AUTH | KintexBG-era home-office chat (P7 predecessor) | PARTIAL | No |
| `/{locale}/finanzamt` | AUTH | Finanzamt surfaces | PARTIAL | No |
| `/{locale}/finanzbildung` | AUTH | Financial education | PARTIAL | No |

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
the public Layer 0 header and footer. Neither appears in `protectedPrefixes`.

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/anspruch` | PUBLIC | Entitlement navigator (P4, touched by P12–P13) | PARTIAL | REUSE |
| `/{locale}/email-generator` | PUBLIC | AI letter generator, KintexBG-era (superseded by Draft/Review) | LEGACY | KEEP |

TAR-7/TAR-8 briefly wrapped these in the workspace shell and listed them in the authenticated
navigation; both the shell match and the navigation entries were removed. Whether they deserve
protected workspace versions is a future product decision.

## 7. Legacy and compatibility surfaces

Reachable, but not part of the HORIZON workspace navigation. Left technically reachable
deliberately: no redirect or deletion was performed, because removing a legacy route is a product
decision with compatibility risk and no evidence of zero use was gathered.

| Route | Access | Product area | Disposition |
|---|---|---|---|
| `/{locale}/protected` | REDIRECT | Forwards to `/{locale}/dashboard` (handled in `proxy.ts`) | LEGACY |
| `/{locale}/protected/home-office` | AUTH | KintexBG-era home office workspace | LEGACY |
| `/{locale}/protected/security` | AUTH | Legacy security surface (authenticated MFA) | LEGACY |
| `/{locale}/office` | PUBLIC SHELL (client-only, no server guard; self-chromed — N4 suppresses the public header/footer) | KintexBG communication prototype | LEGACY |
| `/{locale}/office/cases/[id]` | AUTH | KintexBG-era office case | LEGACY |
| `/check`, `/uslugi`, `/kindergeld`, `/produkte`, `/tarife`, `/za-nas`, `/app` | PUBLIC | Pre-HORIZON marketing surfaces | LEGACY |
| `/{locale}/anfrage`, `/{locale}/zayavka` | PUBLIC | Lead capture | LEGACY |

## 8. Legacy route candidates for later removal or redirect

Report only. Nothing here is deleted or redirected by this document. Each candidate is a
product/compatibility decision for the owner. This list is the input to navigation item **N7**
(`HORIZON_NAVIGATION_DESIGN.md`), which is still NOT STARTED. The **N4** change did not remove or
redirect anything: `/{locale}/office` only stopped drawing the duplicate public chrome.

| Candidate | Current role | Suggested later action | Risk |
|---|---|---|---|
| `/{locale}/office` | KintexBG communication prototype; superseded by the guide case workspace | REDIRECT → `/{locale}/guide` | Client-only shell (no server guard) with its own 6-locale copy; `/api/office/**` still serves other surfaces |
| `/{locale}/office/cases/[id]` | KintexBG case detail | REDIRECT → `/{locale}/guide/{caseId}` | Legacy `cases` display; check no bookmarks rely on it |
| `/{locale}/protected` | Alias | REDIRECT already in place; keep permanently | None |
| `/{locale}/protected/home-office` | Alias of `/{locale}/assistant` | REDIRECT → `/{locale}/assistant` | KintexBG-era copy |
| `/{locale}/protected/security` | Authenticated MFA | REPLACE by a workspace settings surface, then REDIRECT | `/{locale}/security` is the public page; a settings target must exist first |
| `/{locale}/check` | Opportunity-check entry | REDIRECT → `/{locale}/dashboard` or an approved Layer 0 route | None identified |
| `/{locale}/uslugi` | BG-slug services page | REDIRECT → `/{locale}/functions` | BG SEO only |
| `/{locale}/kindergeld` | Kindergeld navigator | KEEP for now | Backed by `/api/kindergeld/draft`; P4 social module not yet delivered |
| `/{locale}/produkte` | Product overview | REDIRECT → `/{locale}/functions` | None identified |
| `/{locale}/tarife` | Tariffs | REDIRECT → `/{locale}/versicherungen` | Uses `affiliate-offers`; must keep its disclosure |
| `/{locale}/za-nas` | BG about page | KEEP | BG copy |
| `/{locale}/app` | PWA install help | KEEP | None identified |
| `/{locale}/anfrage`, `/{locale}/zayavka` | Lead capture → n8n | KEEP | Live lead channel; `/{locale}/contact` overlaps but is a different pipeline |
| `/{locale}/email-generator` | KintexBG letter generator | RETIRE once a workspace replacement is approved | Public and reachable; superseded by P8 draft/review |
| `/{locale}/onboarding/language` | Legacy onboarding step | REMOVE once no persisted `language` step remains | Already a pure redirect; low risk |
| `/{locale}/security` (as `AUTH`) | Mislabeled in the Master Map | Correct the Master Map label to PUBLIC | Documentation only |

## 9. API route handlers

No API route is part of product navigation. Listed for completeness.

`/api/chat`, `/api/contracts`, `/api/contracts/[id]`,
`/api/documents/{analyze,extract,review,upload}`, `/api/generate-letter`, `/api/health`,
`/api/horizon/cases/[id]/{assistant,letter,tax-form}`, `/api/kindergeld/draft`, `/api/leads`,
`/api/office/**`, `/api/optimize/**`, `/api/radar`, `/api/service-requests`, `/api/steuer/pdf`.

## 10. Capital

There is no Capital route. Capital is `PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE` (see
`HORIZON_MASTER_MAP.md`). It must not be exposed in navigation, and no route was added.
