# HORIZON by VZG — Navigation Architecture Design

Status: **APPROVED DESIGN** (documentation + navigation UI only; no backend impact).
Source of truth for routes: [`FINAL_SITE_MAP.md`](./FINAL_SITE_MAP.md).
Canonical architecture: [`HORIZON_MASTER_MAP.md`](./HORIZON_MASTER_MAP.md).
Phase status: [`HORIZON_BUILD_LEDGER.md`](./HORIZON_BUILD_LEDGER.md).

This document defines the final navigation architecture. It does not change backend logic,
Supabase, APIs, migrations, document engines, approval logic, signatures, SMTP, or any verified
P2–P17 flow. All existing routes stay reachable; no route is deleted or redirected.

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
`/{locale}/protected/security`. The Security navigation entry points at the latter.

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
| | Сигурност / Sicherheit | `/{locale}/protected/security` | ShieldCheck |
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
  /steuer                            Steuern
      ├── /steuer/providers
      └── /steuer/review
  /finanzbildung                     Finanzbildung (Weitere Dienste)
  /profil                            Profil
  /protected/security                Sicherheit (interim home of MFA)

LEVEL 2 — AUTH SCREENS (outside workspace shell)
  /auth/login /auth/sign-up /auth/sign-up-success /auth/forgot-password
  /auth/update-password /auth/mfa-verify /auth/error (+ /auth/callback, /auth/logout)
  /onboarding/profile /onboarding/tour /onboarding/finish
```

Depth rule: no workspace section exceeds two levels below Level 1. Deep work happens inside
`/guide/{caseId}` panels rather than in new top-level routes.

---

## LEGACY_HIDDEN_FROM_NAV

Hidden from sidebar, bottom bar and More sheet. **None is deleted or redirected.**

| Route | Why hidden |
|---|---|
| `/{locale}/protected` | pure redirect to `/dashboard` |
| `/{locale}/protected/home-office` | KintexBG alias of `/assistant` |
| `/{locale}/office` | KintexBG prototype, superseded by `/guide/{caseId}` |
| `/{locale}/office/cases/[id]` | KintexBG case detail |
| `/{locale}/assistant` | superseded by the case-scoped assistant |
| `/{locale}/finanzamt` | PARTIAL, not in the current product flow |
| `/{locale}/check` `/{locale}/uslugi` `/{locale}/produkte` `/{locale}/tarife` `/{locale}/za-nas` `/{locale}/app` `/{locale}/kindergeld` | pre-HORIZON marketing tree |
| `/{locale}/anfrage` `/{locale}/zayavka` | legacy lead capture |
| `/{locale}/email-generator` | superseded by Draft/Review |
| `/{locale}/anspruch` | public; a workspace version is a future decision |
| `/{locale}/onboarding/language` | legacy step, pure redirect |

`/{locale}/protected/security` is **not** legacy for navigation purposes: it is the interim
Security target until a workspace settings surface exists.

---

## UX_PROBLEMS_FOUND

1. Five navigation definitions exist, three rendered, and they disagree (`HorizonSidebar`,
   `homeShortcuts`, the office page's private nav; plus dead `kintexModules` and `SiteHeader`).
2. Duplicate entries: `homeShortcuts` repeats sidebar destinations (`/guide`, `/documents`,
   `/profil`).
3. The dashboard is overloaded with competing CTAs and renders the same sections twice.
4. `/{locale}/office` renders double chrome (public header plus its own header) and uses different
   labels for the same concepts.
5. Mobile has no bottom navigation; section switching needs hamburger → drawer → tap.
6. Security/MFA is unreachable from primary navigation.
7. `/steuer/providers` and `/steuer/review` are unreachable from any navigation surface.
8. Public/protected security naming collision, and the Master Map §2.2 still labels the public
   `/{locale}/security` as `AUTH`.
9. Dead "planned" links: `kintexModules` exposes `/dashboard?module=…` params the dashboard ignores.
10. Unlinked public marketing tree still resolves.
11. Public routes that read as app features (`/anspruch`, `/email-generator`).
12. Inconsistent language-switcher placement across surfaces.
13. Two entry points to the same five modules (`/dashboard` module grid vs `/guide` task tree).
14. Brand lockup repeated in four places.

---

## REDESIGN_PLAN

Phased, documentation-first. No backend, Supabase, API, migration, document-engine, approval,
signature or SMTP change. All existing routes preserved. No deletions or redirects.

- **N0 — One navigation source of truth.** `lib/navigation/horizon-nav.ts` exports the grouped
  destinations; the sidebar, bottom bar, More sheet and dashboard shortcuts derive from it.
  Guard the protection invariant with a test. *(implemented)*
- **N1 — Desktop sidebar regroup.** Apply DESKTOP_NAV: four groups, add the Security entry at
  `/{locale}/protected/security`. *(implemented)*
- **N2 — Mobile bottom navigation.** Add the 5-slot bar + More sheet on workspace routes only;
  keep the drawer as the full tree. *(implemented)*
- **N3 — De-duplicate the dashboard.** Remove shortcuts that duplicate the sidebar; leave one
  dominant CTA. *(future)*
- **N4 — `/{locale}/office` chrome fix.** Remove the double header and divergent nav labels.
  *(future; route untouched pending the owner's redirect decision)*
- **N5 — Security surface.** Keep the interim `/protected/security` entry; plan a workspace
  settings surface. *(future; owner decision)*
- **N6 — Steuer subpages.** Surface `/steuer/providers` and `/steuer/review`. *(future)*
- **N7 — Legacy cleanup.** Execute the redirect/removal candidates in `FINAL_SITE_MAP.md` §8.
  *(future; requires explicit owner approval)*

Guardrails: `isKintexWorkspacePath` and `protectedPrefixes` semantics are unchanged; navigation may
only link protected destinations; public Layer 0 keeps its own header/footer; verified P2–P17 flows
and the `/guide/{caseId}` panel set are untouched.
