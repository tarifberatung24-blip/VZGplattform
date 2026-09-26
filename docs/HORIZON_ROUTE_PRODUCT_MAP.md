# HORIZON Route / Product Map

Operational mapping of the routes that actually exist in this repository. This is not a
plan: it records what is reachable today, how it is gated, and whether it is part of the
current product.

Canonical architecture lives in [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md).
Implementation status lives in [`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md).
This file does not override either, and it is not a competing master plan.

Locale prefix: every localized route exists for both `bg` and `de` (`/{locale}/...`).
Root-level routes without a locale are redirected to the locale-prefixed form by `proxy.ts`.
`proxy.ts` also applies the N7 legacy redirects (`lib/navigation/legacy-redirects.ts`) before the
localized catch-all renders; rows marked `REDIRECT` are not destinations.

## Legend

| Field | Meaning |
|---|---|
| ACCESS | `PUBLIC` = no session needed. `AUTH` = the page or its API enforces a session. `REDIRECT` = not a destination, only forwards. |
| STATUS | `IMPLEMENTED` = route renders a working surface. `PARTIAL` = surface exists but has known gaps recorded in the build ledger. `LEGACY` = pre-HORIZON surface kept reachable for compatibility. |
| DISPOSITION | `KEEP` = current, leave alone. `REUSE` = current, expected to be extended. `REPLACE` = will be superseded by a later phase. `LEGACY` = not in primary navigation; do not extend. |

Access for `AUTH` rows was verified by reading each page's own session check or, where the
page defers to the middleware, `lib/supabase/auth-routing.ts`. `AUTH (proxy)` means the page
body has no session check and relies on the middleware gate.

## Public application (Layer 0)

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}` | PUBLIC | Layer 0 home | IMPLEMENTED | KEEP |
| `/{locale}/how-it-works` | PUBLIC | Layer 0 explanation | IMPLEMENTED | KEEP |
| `/{locale}/functions` | PUBLIC | Layer 0 functions | IMPLEMENTED | KEEP |
| `/{locale}/security` | PUBLIC | Layer 0 trust | IMPLEMENTED | KEEP |
| `/{locale}/contact` | PUBLIC | Layer 0 contact | IMPLEMENTED | KEEP |
| `/{locale}/versicherungen` | PUBLIC | Insurance hub, partner insurance (HORIZON OPTIMIZE) | IMPLEMENTED | KEEP |
| `/{locale}/angebote/business-insurance` | PUBLIC | Firmenversicherung partner landing (HORIZON OPTIMIZE) | IMPLEMENTED | KEEP |
| `/{locale}/angebote/kfz` | PUBLIC | Kfz partner landing (HORIZON OPTIMIZE) | IMPLEMENTED | KEEP |
| `/{locale}/angebote/[offer]` | PUBLIC | Generic affiliate landing | IMPLEMENTED | REUSE |
| `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/affiliate-hinweis` | PUBLIC | Legal | IMPLEMENTED | KEEP |
| `/{locale}/anfrage`, `/{locale}/zayavka`, `/anfrage`, `/zayavka` | PUBLIC | Lead capture | IMPLEMENTED | LEGACY |
| `/check`, `/uslugi`, `/produkte`, `/tarife` | REDIRECT | Pre-HORIZON marketing surfaces | LEGACY | LEGACY |
| `/kindergeld`, `/za-nas`, `/app` | PUBLIC | Pre-HORIZON marketing surfaces | LEGACY | LEGACY |

`/check` → `/{locale}/dashboard`, `/uslugi` and `/produkte` → `/{locale}/functions`, `/tarife` →
`/{locale}/versicherungen`; the redirects live in `lib/navigation/legacy-redirects.ts` and are
applied by `proxy.ts`. `/kindergeld`, `/za-nas` and `/app` stay reachable. None of them is linked
from the HORIZON workspace navigation and none is part of the current product.

The insurance hub and the two partner landings are classified by North Star stage, not by an
implementation phase. `HORIZON_MASTER_MAP.md` places contract comparison and partner handoff in
`DISCOVER → TRACK → WARN → COMPARE → OPTIMIZE → RENEW` and in `STAGE B — HORIZON OPTIMIZE`, which
names vehicle and business insurance among the examples. No phase in the approved P0 to P17
sequence covers insurance partner surfaces, so none is assigned. `P13` is Jobcenter and `P14` is
Kündigung.

## Authentication

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/auth/login` | PUBLIC | Sign in | IMPLEMENTED | KEEP |
| `/auth/sign-up` | PUBLIC | Register | IMPLEMENTED | KEEP |
| `/auth/sign-up-success` | PUBLIC | Register confirmation | IMPLEMENTED | KEEP |
| `/auth/forgot-password` | PUBLIC | Account recovery | IMPLEMENTED | KEEP |
| `/auth/update-password` | AUTH | Account recovery | IMPLEMENTED | KEEP |
| `/auth/mfa-verify` | AUTH | MFA | IMPLEMENTED | KEEP |
| `/auth/error` | PUBLIC | Auth error surface | IMPLEMENTED | KEEP |
| `/auth/callback`, `/auth/logout` | n/a | Route handlers, outside the localized tree | IMPLEMENTED | KEEP |

Auth semantics are untouched by TAR-7/TAR-8. `proxy.ts` normalizes a locale-prefixed auth URL
back to the unprefixed handler.

## Onboarding

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/onboarding/language` | REDIRECT | Legacy language step | REDIRECT → `/{locale}/onboarding/profile` | REMOVED FROM UI |
| `/{locale}/onboarding/profile` | AUTH | First login (P2) | IMPLEMENTED | KEEP |
| `/{locale}/onboarding/tour` | AUTH | First login (P2) | IMPLEMENTED | KEEP |
| `/{locale}/onboarding/finish` | AUTH | First login (P2) | IMPLEMENTED | KEEP |

The legacy `/language` page was deleted by N7; `proxy.ts` redirects the path to `/profile`.

## Authenticated HORIZON workspace

These routes render inside the single workspace shell (`components/finance/workspace-shell.tsx`).
The routes the shell wraps are those matched by `isKintexWorkspacePath()` in
`lib/kintex-navigation.ts`; the destinations exposed by the workspace navigation
(`components/layout/horizon-sidebar.tsx`) are marked in the last column.

That predicate is presentation only. It decides whether the HORIZON shell draws; it does not grant
or deny access. Actual protection comes from `protectedPrefixes` in
`lib/supabase/auth-routing.ts`, applied by `updateSession()` in `lib/supabase/proxy.ts`. Every
route in the workspace table below is inside the protection boundary. The two sets differ only at
the edges: `/protected` is matched by the shell but excluded from protection (it redirects), and
`/auth/update-password` and `/onboarding` are protected but outside the workspace shell. The
public routes that the shell must not wrap are in the separate "Public routes outside the workspace
shell" section, not in this table.

| Route | Access | Product area | Status | Disposition | In primary nav |
|---|---|---|---|---|---|
| `/{locale}/dashboard` | AUTH | Overview / HORIZON Home (P4) | PARTIAL | KEEP | Yes |
| `/{locale}/guide` | AUTH | Guide (P3) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/guide/[caseId]` | AUTH | Guide case detail (P3) | IMPLEMENTED | KEEP | via Guide |
| `/{locale}/vertraege` | AUTH | Contracts (P17) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/documents` | AUTH | Documents (P6) | PARTIAL | KEEP | Yes |
| `/{locale}/steuer` | AUTH | Steuererklärung (P15) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/steuer/providers` | AUTH | Steuer providers (P15) | IMPLEMENTED | KEEP | via SteuerTabs (N6) |
| `/{locale}/steuer/review` | AUTH | Steuer review (P15) | IMPLEMENTED | KEEP | via SteuerTabs (N6) |
| `/{locale}/profil` | AUTH | Profile | IMPLEMENTED | KEEP | Yes |
| `/{locale}/konto/sicherheit` | AUTH | Account security / MFA (N5) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/assistant` | AUTH | AI home-office chat (P7, KintexBG-era surface) | PARTIAL | LEGACY | No |
| `/{locale}/finanzamt` | AUTH | Finanzamt surfaces | PARTIAL | KEEP | No |
| `/{locale}/finanzbildung` | AUTH | Financial education | PARTIAL | LEGACY | No |

`/{locale}/assistant` renders `home-office-workspace` and is matched by `isKintexWorkspacePath()`
and by `protectedPrefixes` (`/assistant`), so it draws the authenticated shell. It predates the
case-scoped assistant surface and is not in the primary navigation; the P7 work lives in the case
workspace (`components/guide/case-assistant-panel.tsx`) reached through `/guide/{caseId}`.

`/{locale}/security` is **PUBLIC** (the Layer 0 trust page) and is listed in the public table
above. `HORIZON_MASTER_MAP.md` section 2.2 previously labeled it `AUTH`, contradicting
`app/[locale]/security/page.tsx` (it renders `PublicLayerPage`); that label has now been corrected
to `PUBLIC` in the Master Map. The authenticated MFA surface is `/{locale}/konto/sicherheit`
(N5), and the legacy `/{locale}/protected/security` route redirects there.

`/{locale}/dashboard` is `PARTIAL`: it still composites legacy-era blocks around the HORIZON
module entry. N3 removed the dashboard's duplicate restatement of sidebar destinations and reduced
it to one primary CTA ("Vorgang starten"); the remaining legacy-era blocks are a visual change that
is out of scope until the owner authorizes it. The dashboard's data, chart and search behaviour was
not changed.

## Public routes outside the workspace shell

Reachable without a session. They are **not** matched by `isKintexWorkspacePath()`, so they draw
the public Layer 0 header and footer and never the authenticated shell. Neither route appears in
`protectedPrefixes`, and `updateSession()` only redirects when `isProtectedAppPath()` returns true.

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/anspruch` | PUBLIC | Entitlement navigator (P4, touched by P12–P13) | PARTIAL | REUSE |
| `/{locale}/email-generator` | PUBLIC | AI letter generator, KintexBG-era (P8, superseded by Draft/Review) | LEGACY | KEEP |

Both were previously recorded as `AUTH (proxy)` in this document, which contradicted
`HORIZON_MASTER_MAP.md` and the proxy. Their classification is corrected here to `PUBLIC`, matching
the Master Map. Their access was not changed by TAR-7/TAR-8, and no authenticated equivalent was
created.

TAR-7/TAR-8 briefly wrapped these two routes in the workspace shell and listed them in the
authenticated navigation. That combination showed an anonymous visitor the authenticated sidebar and
logout controls while hiding the public chrome. Both the shell match and the navigation entries were
removed in the same pass. Whether they deserve protected workspace versions is a future product
decision.

Setting `finanzbildung` aside, since it is both protected and legacy: the table above lists only
routes inside the protection boundary. Verify any change to that list against
`protectedPrefixes` in `lib/supabase/auth-routing.ts` before adding an entry.

## Legacy and compatibility surfaces

Reachable, but not part of the HORIZON workspace navigation. N7 redirected the approved candidates
to a canonical destination and kept the rest reachable, because removing them is a product decision
with compatibility risk and no evidence of zero use was gathered. Redirects live in
`lib/navigation/legacy-redirects.ts` and are applied by `proxy.ts`.

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/protected` | REDIRECT | Forwards to `/{locale}/dashboard` (308) | LEGACY | LEGACY |
| `/{locale}/protected/home-office` | REDIRECT | → `/{locale}/assistant` | LEGACY | LEGACY |
| `/{locale}/protected/security` | REDIRECT | → `/{locale}/konto/sicherheit` | LEGACY | LEGACY |
| `/{locale}/office` | REDIRECT | → `/{locale}/guide` (KintexBG-era office workspace) | LEGACY | LEGACY |
| `/{locale}/office/cases/[id]` | REDIRECT | → `/{locale}/guide/{caseId}` | LEGACY | LEGACY |
| `/check`, `/uslugi`, `/produkte`, `/tarife` | REDIRECT | Pre-HORIZON marketing surfaces | LEGACY | LEGACY |

`/{locale}/protected` is handled in `proxy.ts` and never renders. The N4 `isSelfChromedPath`
suppression on `/{locale}/office` is now inert because N7 redirects the route, but it is retained
as a tested guard. The full per-route disposition, including the kept surfaces
(`/kindergeld`, `/za-nas`, `/app`, the lead-capture pair, `/email-generator`), is in
[`FINAL_SITE_MAP.md`](./FINAL_SITE_MAP.md) §7–§8.

## Affiliate deeplinks

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/go/[offer]` | PUBLIC | Affiliate redirect (canonical handler) | IMPLEMENTED | KEEP |
| `/{locale}/go/[offer]` | PUBLIC | Affiliate redirect (locale mirror) | IMPLEMENTED | KEEP |

Both resolve to the same handler. An offer redirects only when it is approved **and** a real
HTTPS deeplink is configured; otherwise the handler responds 503, and an unknown offer responds
404. No tracking parameter is invented or appended. See `lib/affiliate-offers.ts`.

## API route handlers

No API route is part of the product navigation. They are listed for completeness and were not
modified by TAR-7/TAR-8.

`/api/chat`, `/api/contracts`, `/api/contracts/[id]`, `/api/documents/{analyze,extract,review,upload}`,
`/api/generate-letter`, `/api/health`, `/api/horizon/cases/[id]/{assistant,letter,tax-form}`,
`/api/kindergeld/draft`, `/api/leads`, `/api/office/**`, `/api/optimize/**`, `/api/radar`,
`/api/service-requests`, `/api/steuer/pdf`.

## Capital

There is no Capital route. Capital is `PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE`
(see `HORIZON_MASTER_MAP.md`). It must not be exposed in navigation and no route was added.
