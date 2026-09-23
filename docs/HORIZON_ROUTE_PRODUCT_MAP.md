# HORIZON Route / Product Map

Operational mapping of the routes that actually exist in this repository. This is not a
plan: it records what is reachable today, how it is gated, and whether it is part of the
current product.

Canonical architecture lives in [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md).
Implementation status lives in [`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md).
This file does not override either, and it is not a competing master plan.

Locale prefix: every localized route exists for both `bg` and `de` (`/{locale}/...`).
Root-level routes without a locale are redirected to the locale-prefixed form by `proxy.ts`.

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
| `/{locale}/versicherungen` | PUBLIC | Insurance hub (P13/P14) | IMPLEMENTED | KEEP |
| `/{locale}/angebote/business-insurance` | PUBLIC | Firmenversicherung affiliate landing | IMPLEMENTED | KEEP |
| `/{locale}/angebote/kfz` | PUBLIC | Kfz affiliate landing | IMPLEMENTED | KEEP |
| `/{locale}/angebote/[offer]` | PUBLIC | Generic affiliate landing | IMPLEMENTED | REUSE |
| `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/affiliate-hinweis` | PUBLIC | Legal | IMPLEMENTED | KEEP |
| `/{locale}/anfrage`, `/{locale}/zayavka`, `/anfrage`, `/zayavka` | PUBLIC | Lead capture | IMPLEMENTED | LEGACY |
| `/check`, `/uslugi`, `/kindergeld`, `/produkte`, `/tarife`, `/za-nas`, `/app` | PUBLIC | Pre-HORIZON marketing surfaces | LEGACY | LEGACY |

`/check`, `/uslugi`, `/kindergeld`, `/produkte`, `/tarife`, `/za-nas` and `/app` are reachable
only through the legacy marketing tree. They are not linked from the HORIZON workspace
navigation and are not part of the current product.

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
| `/auth/callback`, `/auth/logout` | — | Route handlers, outside the localized tree | IMPLEMENTED | KEEP |

Auth semantics are untouched by TAR-7/TAR-8. `proxy.ts` normalizes a locale-prefixed auth URL
back to the unprefixed handler.

## Onboarding

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/onboarding/language` | AUTH | First login (P2) | IMPLEMENTED | KEEP |
| `/{locale}/onboarding/profile` | AUTH | First login (P2) | IMPLEMENTED | KEEP |
| `/{locale}/onboarding/tour` | AUTH | First login (P2) | IMPLEMENTED | KEEP |
| `/{locale}/onboarding/finish` | AUTH | First login (P2) | IMPLEMENTED | KEEP |

## Authenticated HORIZON workspace

These routes render inside the single workspace shell (`components/finance/workspace-shell.tsx`)
and are the destinations exposed by the workspace navigation
(`components/layout/horizon-sidebar.tsx`).

| Route | Access | Product area | Status | Disposition | In primary nav |
|---|---|---|---|---|---|
| `/{locale}/dashboard` | AUTH | Overview / HORIZON Home (P4) | PARTIAL | KEEP | Yes |
| `/{locale}/guide` | AUTH | Guide (P3) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/guide/[caseId]` | AUTH | Guide case detail (P3) | IMPLEMENTED | KEEP | via Guide |
| `/{locale}/vertraege` | AUTH | Contracts (P17) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/documents` | AUTH | Documents (P6) | PARTIAL | KEEP | Yes |
| `/{locale}/steuer` | AUTH | Steuererklärung (P15) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/steuer/providers` | AUTH | Steuer providers (P15) | IMPLEMENTED | KEEP | via Steuern |
| `/{locale}/steuer/review` | AUTH | Steuer review (P15) | IMPLEMENTED | KEEP | via Steuern |
| `/{locale}/anspruch` | AUTH (proxy) | Sozialleistungen entry | PARTIAL | KEEP | Yes |
| `/{locale}/email-generator` | AUTH (proxy) | Correspondence drafting (P11) | IMPLEMENTED | KEEP | Yes |
| `/{locale}/profil` | AUTH | Profile | IMPLEMENTED | KEEP | Yes |
| `/{locale}/finanzamt` | AUTH | Finanzamt surfaces | PARTIAL | KEEP | No |
| `/{locale}/finanzbildung` | AUTH (proxy) | Financial education | PARTIAL | LEGACY | No |

`/{locale}/dashboard` is `PARTIAL`: it still composites legacy-era blocks around the HORIZON
module entry. Its data, chart and search behaviour is owned by TAR-10 and was not changed by
TAR-7/TAR-8.

`/{locale}/anspruch` and `/{locale}/email-generator` contain no session check in the page body;
they are gated by the proxy against the prefixes in `lib/supabase/auth-routing.ts`.

## Legacy and compatibility surfaces

Reachable, but not part of the HORIZON workspace navigation. Left technically reachable
deliberately: no redirect or deletion was performed, because removing a legacy route is a
product decision with compatibility risk and no evidence of zero use was gathered.

| Route | Access | Product area | Status | Disposition |
|---|---|---|---|---|
| `/{locale}/protected` | REDIRECT | Forwards to `/{locale}/dashboard` (308) | LEGACY | LEGACY |
| `/{locale}/protected/home-office` | AUTH | KintexBG-era home office workspace | LEGACY | LEGACY |
| `/{locale}/protected/security` | AUTH | Legacy security surface | LEGACY | LEGACY |
| `/{locale}/office` | AUTH | KintexBG-era office workspace | LEGACY | LEGACY |
| `/{locale}/office/cases/[id]` | AUTH | KintexBG-era office case | LEGACY | LEGACY |

`/{locale}/protected` is handled in `proxy.ts` and never renders.

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
