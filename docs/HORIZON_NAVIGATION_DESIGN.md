# HORIZON by VZG — Navigation Architecture Design

Status: **APPROVED DESIGN — N0–N7 IMPLEMENTED** (documentation + navigation UI only; no backend
impact).
Source of truth for routes: [`FINAL_SITE_MAP.md`](./FINAL_SITE_MAP.md).
Canonical architecture: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md).
Phase status: [`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md).

This document defines the final navigation architecture. It does not change backend logic,
Supabase, APIs, migrations, document engines, approval logic, signatures, SMTP, or any verified
P2–P17 flow.

N0–N2 landed on `main` at `56b0aa5`. N3, N4 and N6 landed at `015d606`
(`feat(nav): N3/N4/N6 dashboard de-duplication, office chrome, Steuer tabs`). N5 (security settings
surface) and N7 (legacy redirect/removal) landed after explicit owner approval; the route and
product consequences are recorded in `FINAL_SITE_MAP.md` §7 and §8 and in
`HORIZON_ROUTE_PRODUCT_MAP.md`. The UX problems they address are now resolved or explicitly
deferred below.

## Owner decisions (approved)

1. Mobile slot 4 = **Verträge**.
2. **Steuern** stays under "Mehr".
3. **Finanzbildung** stays out of the primary sidebar groups and lives under
   "Mehr / Weitere Dienste".

## Access invariant

Every authenticated navigation destination must also be covered by `protectedPrefixes` in
`lib/supabase/auth-routing.ts`. A public destination inside the workspace shell would show account
controls to an anonymous visitor. This invariant is currently enforced for the workspace by
`lib/kintex-navigation.test.ts` and is extended to the nav model by
`lib/navigation/horizon-nav.test.ts`.

`/{locale}/security` is the **public** Layer 0 trust page. The authenticated MFA surface is
`/{locale}/konto/sicherheit` (N5). The Security navigation entry points at the latter, and the
legacy `/{locale}/protected/security` route redirects there (N7).

---

## DESKTOP_NAV

One grouped sidebar (`components/layout/horizon-sidebar.tsx`). HORIZON workspace first, account
last.

| Group | Entry (bg / de) | Route | Icon |
|---|---|---|---|
| **Arbeitsbereich / Работно пространство** | Начало / Übersicht | `/{locale}/dashboard` | LayoutDashboard |
| | Водач / Wegweiser | `/{locale}/guide` | Compass |
| | Документи / Dokumente | `/{locale}/documents` | FileText |
| **Finanzen / Финанси** | Договори / Verträge | `/{locale}/vertraege` | WalletCards |
| | Данъци / Steuern | `/{locale}/steuer` | Receipt |
| **Konto / Профил** | Профил / Profil | `/{locale}/profil` | UserRound |
| | Сигурност / Sicherheit | `/{locale}/konto/sicherheit` | ShieldCheck |
| **Weitere Dienste / Други услуги** | Обучение / Finanzbildung | `/{locale}/finanzbildung` | GraduationCap |
| Footer | Изход / Abmelden | `POST /auth/logout` | LogOut |

Rules:

- Service modules P12–P17 are **not** destinations. They have no routes; they are case-creation
  actions exposed on `/{locale}/dashboard` and `/{locale}/guide`.
- `/steuer/providers` and `/{locale}/steuer/review` are sub-destinations of Steuern, not top-level
  sidebar items (see PAGE_HIERARCHY).
- `/assistant` and `/{locale}/finanzamt` are legacy and stay out of the primary navigation.

## MOBILE_NAV

Fixed bottom bar, **5 slots** on workspace routes only (never on public Layer 0).

| Slot | Label (bg / de) | Target |
|---|---|---|
| 1 | Начало / Übersicht | `/{locale}/dashboard` |
| 2 | Водач / Wegweiser | `/{locale}/guide` |
| 3 | Документи / Dokumente | `/{locale}/documents` |
| 4 | Договори / Verträge | `/{locale}/vertraege` |
| 5 | Още / Mehr | opens the "More" bottom sheet |

"More" sheet, grouped:

- **Finanzen / Финанси:** Данъци / Steuern → `/{locale}/steuer`
- **Weitere Dienste / Други услуги:** Обучение / Finanzbildung → `/{locale}/finanzbildung`
- **Konto / Профил:** Профил / Profil, Сигурност / Sicherheit
- **App:** language switch (existing `LanguageSwitcher`), Изход / Abmelden

Rules:

- The existing sidebar drawer/`Sheet` remains as the full navigation tree (accessibility, deep
  links); it is no longer the primary mobile path.
- Bottom bar and More sheet derive from the same nav model as the sidebar (single source of truth).
- The workspace header keeps the language switcher.

---

## PAGE_HIERARCHY

```
LEVEL 0 — PUBLIC (GlobalHeader + GlobalFooter; no workspace shell)
  /                                  home
  /how-it-works  /functions  /security  /contact
  /impressum /datenschutz /agb /widerruf /affiliate-hinweis
  /versicherungen  /angebote/business-insurance  /angebote/kfz  /angebote/[offer]
  /go/[offer]                        affiliate redirect

LEVEL 1 — AUTHENTICATED (workspace shell; sidebar on desktop, bottom nav on mobile)
  /dashboard                         Übersicht — overview + module entry (composite)
      └── 5 service modules (actions, no routes) → create case → /guide/{caseId}
  /guide                             Wegweiser — open cases + 5-task chooser
      └── /guide/{caseId}            CASE WORKSPACE — the single work surface
              ├── AgenturTaskPanel        (P12)
              ├── JobcenterTaskPanel      (P13)
              ├── KuendigungPanel         (P14)
              ├── SteuerPanel + OfficialFormPanel (P15)
              ├── UnterlagenPanel         (P16)
              ├── CaseAssistantPanel      (P7)
              ├── SignaturePanel          (P10)
              ├── SendPanel               (P11)
              └── DraftReviewPanel        (P8)
  /documents                         Dokumente
  /vertraege                         Verträge → "Kündigung vorbereiten" creates a case
  /steuer                            Steuern (index + SteuerTabs)
      ├── /steuer/providers          reached via SteuerTabs (N6)
      └── /steuer/review             reached via SteuerTabs (N6)
  /finanzbildung                     Finanzbildung (Weitere Dienste)
  /profil                            Profil
  /konto/sicherheit                  Sicherheit (canonical MFA surface, N5)

LEVEL 2 — AUTH SCREENS (outside workspace shell)
  /auth/login /auth/sign-up /auth/sign-up-success /auth/forgot-password
  /auth/update-password /auth/mfa-verify /auth/error (+ /auth/callback, /auth/logout)
  /onboarding/profile /onboarding/tour /onboarding/finish
```

Depth rule: no workspace section exceeds two levels below Level 1. Deep work happens inside
`/guide/{caseId}` panels rather than in new top-level routes.

---

## LEGACY_HIDDEN_FROM_NAV

Hidden from sidebar, bottom bar and More sheet. N7 either redirected these to a canonical
destination or left them reachable; the disposition per route is in `FINAL_SITE_MAP.md` §7 and §8.

| Route | Why hidden | N7 disposition |
|---|---|---|
| `/{locale}/protected` | pure redirect to `/dashboard` | keep (redirect unchanged) |
| `/{locale}/protected/home-office` | KintexBG alias of `/assistant` | redirect → `/{locale}/assistant` |
| `/{locale}/office` | KintexBG prototype, superseded by `/guide/{caseId}` | redirect → `/{locale}/guide` |
| `/{locale}/office/cases/[id]` | KintexBG case detail | redirect → `/{locale}/guide/{caseId}` |
| `/{locale}/assistant` | superseded by the case-scoped assistant | keep |
| `/{locale}/finanzamt` | PARTIAL, not in the current product flow | keep |
| `/{locale}/check` `/{locale}/uslugi` `/{locale}/produkte` `/{locale}/tarife` | pre-HORIZON marketing tree | redirect (see §8) |
| `/{locale}/za-nas` `/{locale}/app` `/{locale}/kindergeld` | pre-HORIZON marketing tree | keep |
| `/{locale}/anfrage` `/{locale}/zayavka` | legacy lead capture | keep (live lead channel) |
| `/{locale}/email-generator` | superseded by Draft/Review | keep until an approved replacement exists |
| `/{locale}/anspruch` | public; a workspace version is a future decision | keep |
| `/{locale}/onboarding/language` | legacy step, pure redirect | redirect → `/{locale}/onboarding/profile` |

`/{locale}/konto/sicherheit` is the Security navigation target (N5). The legacy
`/{locale}/protected/security` route is not a navigation target and redirects to it.

---

## UX_PROBLEMS_FOUND

Status key: **FIXED** = resolved. **DEFERRED** = deliberately left, with the gate named.

1. Five navigation definitions exist, three rendered, and they disagree (`HorizonSidebar`,
   `homeShortcuts`, the office page's private nav; plus dead `kintexModules` and `SiteHeader`).
   **FIXED** — N0 made `lib/navigation/horizon-nav.ts` the single source for the sidebar, bottom
   bar and More sheet; N3 removed `homeShortcuts`; N7 deleted the `/{locale}/office` page (and its
   private nav) together with the dead `SiteHeader` and the unused `kintexModules` consumers
   (`personal-dashboard`, `smart-dashboard-preview`).
2. Duplicate entries: `homeShortcuts` repeats sidebar destinations (`/guide`, `/documents`,
   `/profil`). **FIXED (N3)** — `homeShortcuts` no longer exists; a regression test asserts the
   dashboard does not restate sidebar destinations.
3. The dashboard is overloaded with competing CTAs and renders the same sections twice.
   **FIXED (N3)** — the duplicated status card was removed from the action centre, the duplicate
   intake options were de-duplicated, and "Vorgang starten" is the single primary CTA.
4. `/{locale}/office` renders double chrome (public header plus its own header) and uses different
   labels for the same concepts. **FIXED** — N4 removed the double chrome by suppressing the public
   Layer 0 header/footer on `/{locale}/office`; N7 then retired the route itself (308 →
   `/{locale}/guide`), so its divergent private nav is gone with it.
5. Mobile has no bottom navigation; section switching needs hamburger → drawer → tap.
   **FIXED (N2)**.
6. Security/MFA is unreachable from primary navigation. **FIXED** — N1 added the Security entry;
   N5 moved it to the canonical workspace surface `/{locale}/konto/sicherheit`, and the legacy
   `/{locale}/protected/security` route now redirects there.
7. `/steuer/providers` and `/steuer/review` are unreachable from any navigation surface.
   **FIXED (N6)** — `SteuerTabs` links both from all three Steuer pages.
8. Public/protected security naming collision, and the Master Map §2.2 still labels the public
   `/{locale}/security` as `AUTH`. **FIXED** — Master Map §2.2 labels `/{locale}/security`
   `PUBLIC`, matching `app/[locale]/security/page.tsx`. N5 keeps the authenticated surface at
   `/{locale}/konto/sicherheit`, so the two no longer share a name.
9. Dead "planned" links: `kintexModules` exposes `/dashboard?module=…` params the dashboard
   ignores. **FIXED (N7)** — the last consumers of the 10-module list
   (`components/finance/personal-dashboard.tsx`, `components/dashboard/smart-dashboard-preview.tsx`)
   were deleted. `kintexModules` itself is retained only as the module list behind
   `isKintexWorkspacePath()`; no navigation reads it.
10. Unlinked public marketing tree still resolves. **FIXED (N7)** — `/check`, `/uslugi`,
    `/produkte`, `/tarife` redirect to canonical Layer 0 or workspace destinations, and their
    legacy pages are deleted.
11. Public routes that read as app features (`/anspruch`, `/email-generator`). **DEFERRED** —
    `/anspruch` stays public and is `REUSE`; `/email-generator` stays public and is `KEEP` until an
    approved workspace replacement exists. The duplicate camelCase catch-all key
    `/{locale}/emailGenerator` was removed by N7.
12. Inconsistent language-switcher placement across surfaces. **DEFERRED** — the office page's own
    6-locale selector went away with the page; any remaining unification is a visual change, out of
    scope for the navigation sequence.
13. Two entry points to the same five modules (`/dashboard` module grid vs `/guide` task tree).
    **OPEN** — both are intentional; consolidating them is a product decision.
14. Brand lockup repeated in four places. **OPEN** — visual, not a navigation-definition problem.

---

## REDESIGN_PLAN

Phased, documentation-first. No backend, Supabase, API, migration, document-engine, approval,
signature or SMTP change. N0–N6 preserved every route; N7 redirects or retires only the legacy
candidates the owner approved in `FINAL_SITE_MAP.md` §8.

- **N0 — One navigation source of truth.** `lib/navigation/horizon-nav.ts` exports the grouped
  destinations; the sidebar, bottom bar, More sheet and dashboard shortcuts derive from it.
  Guard the protection invariant with a test. *(implemented)*
- **N1 — Desktop sidebar regroup.** Apply DESKTOP_NAV: four groups, add the Security entry.
  *(implemented; N5 moved its target to `/{locale}/konto/sicherheit`)*
- **N2 — Mobile bottom navigation.** Add the 5-slot bar + More sheet on workspace routes only;
  keep the drawer as the full tree. *(implemented)*
- **N3 — De-duplicate the dashboard.** Remove shortcuts that duplicate the sidebar; leave one
  dominant CTA. **IMPLEMENTED** at `015d606` (`homeShortcuts` removed from the registry, the
  duplicated status card removed from the action centre, and "Vorgang starten" is the single
  primary action on `/{locale}/dashboard`).
- **N4 — `/{locale}/office` chrome fix.** Remove the double header and divergent nav labels.
  **IMPLEMENTED** at `015d606` (the public Layer 0 header/footer were suppressed on
  `/{locale}/office` via `isSelfChromedPath`). **Superseded by N7**, which retired the route:
  `/{locale}/office` now 308-redirects to `/{locale}/guide`, so there is no page left to chrome.
- **N5 — Security surface.** The interim `/{locale}/protected/security` entry is replaced by the
  canonical workspace settings surface `/{locale}/konto/sicherheit`, rendered by the existing
  `MfaSettings` component and reached from the account group of `lib/navigation/horizon-nav.ts`.
  `/{locale}/protected/security` redirects there. No authentication logic, Supabase behaviour, API
  or schema changed.
- **N6 — Steuer subpages.** Surface `/steuer/providers` and `/steuer/review`. **IMPLEMENTED** at
  `015d606` (a `SteuerTabs` in-page navigation is rendered by all three Steuer pages; the sidebar
  still has exactly one Steuer destination).
- **N7 — Legacy cleanup.** Executed against the candidates in `FINAL_SITE_MAP.md` §8, after owner
  approval. `/{locale}/office` and `/{locale}/office/cases/[id]` redirect to `/{locale}/guide`
  (case id carried); `/check` → `/{locale}/dashboard`; `/uslugi` and `/produkte` →
  `/{locale}/functions`; `/tarife` → `/{locale}/versicherungen`;
  `/{locale}/protected/home-office` → `/{locale}/assistant`; `/{locale}/protected/security` →
  `/{locale}/konto/sicherheit`; `/{locale}/onboarding/language` → `/{locale}/onboarding/profile`.
  Redirects live in the unit-tested `lib/navigation/legacy-redirects.ts` and run in `proxy.ts`
  before the localized catch-all. The removed pages and dead components are deleted rather than
  left as unreachable code. Routes marked KEEP in §8 are untouched.

Guardrails: `isKintexWorkspacePath` and `protectedPrefixes` semantics are unchanged; navigation may
only link protected destinations; public Layer 0 keeps its own header/footer; verified P2–P17 flows
and the `/guide/{caseId}` panel set are untouched. N4 added a separate, narrowly-scoped
`isSelfChromedPath` predicate rather than widening `isKintexWorkspacePath`, so `/office` stayed
outside the protection boundary and the workspace shell never drew on it. N7 then redirected
`/{locale}/office`, so that predicate no longer suppresses chrome on any rendered page; it is kept
as a tested guard for the route should the redirect ever be reverted, and it must not be widened
into a prefix match.
