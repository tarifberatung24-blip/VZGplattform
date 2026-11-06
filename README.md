# VZGplattform — HORIZON by VZG

**Canonical identity — these names are distinct:**

- **Legal entity:** Tarifberater24
- **Expert brand:** VZG CONSULT
- **Product:** HORIZON by VZG
- **Codebase:** VZGplattform

See [`PROJECT_RULES.md`](PROJECT_RULES.md) for the binding identity and development rules.

HORIZON is a bilingual Bulgarian/German digital control center for people living in Germany. It brings together contract visibility, document understanding, administrative service requests, case management, deadlines, and user-controlled next steps. Its strategic direction is to help customers **understand, control, and optimize recurring obligations and costs** — with administrative assistance as a connected part of that experience.

> **Product status — 6 November 2026:** HORIZON has a working application foundation with authenticated case workflows, a public Service Center, Alpha Team routing and specialist contracts, and request-to-case provisioning. This is not a claim that every planned module is complete, that every AI provider is configured, or that autonomous background execution is live. Module status is tracked separately in the [Build Ledger](docs/HORIZON_BUILD_LEDGER.md).

HORIZON provides information, analysis support, and document preparation. It is not a tax adviser, lawyer, insurer, insurance broker, credit decision-maker, or government authority.

## Current capabilities

- **Bulgarian and German interface** with locale-aware routes (`/bg/...` and `/de/...`); Bulgarian is the default locale.
- **Authentication and onboarding** backed by Supabase Auth, including Google OAuth, phone/SMS sign-in, and MFA surfaces.
- **HORIZON case workspace** at `/{locale}/guide/[caseId]`, using the canonical owner-scoped case model.
- **Document intake and understanding** for supported files, screenshots/photos, pasted text, and email content; OCR, extraction, review, and evidence-aware case context are implemented across the relevant workflows.
- **Case Assistant** for case-scoped explanation and preparation, subject to authentication, ownership checks, provider configuration, and existing safety controls.
- **HORIZON Alpha Team**: a Conductor/control plane with seven registered specialist roles and versioned SOP/skill contracts. It validates context, routes work, and prepares plans/handoffs to the existing Case Assistant; it is not a second AI pipeline or a durable background-run engine.
- **Service Center** with eight free Tarifberater24 service request categories: Wohnsitzanmeldung, Abmeldung/Ummeldung, Steuererklärung, Krankenkassenwechsel, Gewerbeanmeldung, Führerschein-Umschreibung, Aufenthaltstitel, and Beglaubigungen/Übersetzungen.
- **Service request → case provisioning**: authenticated requests are linked to owner-scoped HORIZON cases, with request-scoped idempotency and retry-repair logic. Database migration rollout remains governed separately; code compatibility paths are retained.
- **Administrative and benefits workflows** including Kindergeld, Finanzamt requests, Agentur für Arbeit, Jobcenter, tax questionnaire/PDF preparation, and case correspondence. Individual flows have different completion and verification states.
- **Contract management and HORIZON Radar** for contract records, signals, deadlines, history, and user-approved next steps.
- **Affiliate and partner surfaces** (`/{locale}/versicherungen`, `/{locale}/angebote/*`, `/go/[offer]`) with marked links and Awin reconciliation.
- **Financial education and deterministic opportunity calculations.**
- **HORIZON System Steward V1**: a manually triggered, read-only GitHub Actions monitor that produces Markdown/JSON reports. It does not access customer cases, write to production, publish content, or run on an automatic schedule.
- **PWA support** with install metadata and a service worker.
- **Production health endpoint:** [`/api/health`](https://vzgplattform.onrender.com/api/health).

## Agent and automation boundaries

The Alpha Team currently provides **registry, routing, case-aware validation, specialist skill contracts, and execution handoff metadata**. The intended workflow is:

```text
User request
  → Alpha Team routing and case/document validation
  → existing Case Assistant
  → evidence / provenance and quality checks
  → user review and approval
  → existing approved action workflow
```

Specialists may analyze, explain, and prepare drafts. Missing evidence or unconfirmed critical facts can block progress. Sending documents, signing, submitting applications, accepting contracts, making payments, placing partner orders, and other external actions remain behind the relevant explicit user approval and existing action controls.

**Persistent Agent Runs / background orchestration is not documented as a shipped production capability.** The Alpha Team blueprint describes persistent runs, event-driven processing, and an operator console as future increments subject to separate architecture, schema/RLS, and owner approval. Do not infer that a workflow engine, autonomous agent loop, or continuous self-learning system is installed.

The System Steward is a separate read-only engineering monitor. Its legal/technology findings distinguish observed facts, assumptions, and recommendations; it is not a customer-facing agent and does not execute recommendations.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 (App Router), React 19, TypeScript |
| Styling and UI | Tailwind CSS 4, shadcn/ui and Base UI primitives, Lucide |
| Internationalization | `next-intl`, Bulgarian (`bg`, default) and German (`de`) |
| Authentication and data | Supabase Auth, PostgreSQL, Storage, RLS |
| AI | Groq via the Vercel AI SDK; optional OpenRouter, Cerebras, local Ollama, Gemini vision where configured |
| Document processing | OCR, `pdfjs-dist`, `tesseract.js`, `pdf-lib` |
| Email and content | `nodemailer` (SMTP), optional per-user Gmail; Puck visual editor (admin) |
| Validation and tests | ESLint, TypeScript, Vitest, `node --test`, repository i18n checks |
| Package manager | pnpm (CI pins 10) |
| Deployment | Render, from GitHub `main` |

## Quick start

### Requirements

- Node.js 22.13 or later (the floor is required by `pdfjs-dist`; CI runs Node 22)
- pnpm 10 or later (CI pins pnpm 10; the lockfile is `lockfileVersion: 9`)
- A Supabase project for authentication and protected features

### Install and run

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Bulgarian and German routes are available under `/bg` and `/de`.

### Production build locally

```bash
pnpm build
pnpm start
```

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`, service-role credentials, OAuth secrets, or webhook secrets.

| Variable | Required for | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth and data | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth and data | Public Supabase anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alternative | Public publishable key, where used by the project |
| `SUPABASE_SECRET_KEY` | Server-side operations | Server-only Supabase secret key; never expose it to the browser (`SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy fallback) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Local OAuth | Local callback URL, normally `http://localhost:3000/auth/callback` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs | Overrides the default site origin used for SEO metadata |
| `GROQ_API_KEY` | AI features | Server-side AI provider key (primary) |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Optional AI | Cloud fallback for model routing |
| `CEREBRAS_API_KEY` / `CEREBRAS_MODEL` | Optional AI | Alternative document-analysis backend |
| `AI_ALLOW_CLOUD_FALLBACK` | AI routing | Keep `false` when customer documents must stay local; cloud is used only after a local failure or timeout |
| `AUTOMATION_WEBHOOK_URL` | Offer requests | Signed automation webhook URL; an `http://` value is refused |
| `AUTOMATION_WEBHOOK_SECRET` | Offer requests | Shared secret used to authenticate webhook delivery |
| `HORIZON_SMTP_*` | Outbound e-mail | SMTP host, port, user, password, and from address; all required together |
| `HORIZON_GOOGLE_*` / `HORIZON_EMAIL_TOKEN_ENCRYPTION_KEY` | Per-user Gmail | Connect a user's own Gmail account; keep secrets server-side |
| `AFFILIATE_OPERATOR_SECRET` | Affiliate callbacks | Enables `POST /api/affiliate/callback`; unset leaves it disabled (503) |
| `AWIN_PUBLISHER_ID` / `AWIN_API_TOKEN` | Affiliate reconciliation | Awin Publisher API for the daily reconciliation; unset disables it (503) |
| `NOTIFICATIONS_CRON_SECRET` | Scheduled runs | Authenticates `POST /api/notifications/run`; unset disables it (503) |
| `EDITOR_ADMIN_EMAILS` | Page editor | Comma-separated e-mails allowed to edit pages at `/{locale}/admin/editor` |

Public pages and `/api/health` can run without Supabase configuration. Protected routes and integrations require the relevant variables and return a controlled configuration error when they are unavailable. See [`.env.example`](.env.example) for the complete, commented list.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run the Vitest suite and the `node --test` scripts |
| `pnpm i18n:verify` | Check translation parity, usage, and hardcoded strings |
| `pnpm supabase:check` | Validate the configured Supabase project |
| `pnpm ai:route "task"` | Route a task to the appropriate local/cloud model |
| `pnpm security:zap` | Run the ZAP security scan helper |
| `node scripts/terra-preflight.mjs` | Check Terra/tool readiness before assigned work |

Recommended pre-commit verification (the same core gates CI runs):

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm i18n:verify
pnpm build
```

## Project structure

```text
app/                  Next.js App Router pages and API routes
components/           Shared UI and feature components
config/               Local AI model routing configuration
i18n/                 Locale routing and request configuration
lib/                  Domain logic, Supabase helpers, validation, and services
messages/             Bulgarian and German translation dictionaries
public/               PWA assets, icons, and service worker
scripts/              Local validation, AI tooling, and read-only Steward
skills/               Project-local agent SOP/skill contracts
supabase/             Migrations, functions, prepared SQL, and RLS tests
docs/                 Product plans, operating notes, and technical scope
proxy.ts              Locale and request proxy
```

## Database and Supabase

Migrations live in `supabase/migrations`. The canonical project is
`mteguzgbiuexmdcrqajj` (`vzg-plattform-deutschland`, `eu-central-1`), recorded in
[`supabase/project.json`](supabase/project.json). Do not edit production tables manually or disable
Row Level Security as a shortcut.

Schema, RLS, grants, and migrations require explicit owner approval and are applied through a
reviewed migration file — never through an agent tool. Some recent request-id and artifact-idempotency
changes include prepared migrations and compatibility behavior; a merged code change alone must not
be treated as proof that a production migration has been applied. See
[`docs/SUPABASE_MIGRATION_HISTORY_REPAIR.md`](docs/SUPABASE_MIGRATION_HISTORY_REPAIR.md) and
[`SUPABASE_CONSOLIDATION_PLAN.md`](SUPABASE_CONSOLIDATION_PLAN.md).

The repository also contains prepared SQL and RLS tests under `supabase/prepared` and
`supabase/tests` that are not applied by the normal migration flow.

## Deployment

The production service is deployed from the GitHub `main` branch to Render. A normal deployment flow is:

1. Run the local verification commands.
2. Commit a focused change to a branch and open a pull request; wait for CI.
3. Merge once CI is green and the owner has approved the change.
4. Wait for Render to finish the automatic deployment.
5. Verify the health endpoint and the relevant localized route.

Production checks:

```bash
curl -i https://vzgplattform.onrender.com/api/health
curl -I https://vzgplattform.onrender.com/bg/auth/login
curl -I https://vzgplattform.onrender.com/de/auth/login
```

`/api/health` returns JSON with a `status`, the deployed `revision` (from `RENDER_GIT_COMMIT`), and
`integrations` / `capabilities` booleans. It never echoes a host, username, or key.

## Documentation

- [`docs/HORIZON_MASTER_MAP.md`](docs/HORIZON_MASTER_MAP.md) — canonical target architecture, product direction, and Phase 0–17 sequence
- [`docs/HORIZON_BUILD_LEDGER.md`](docs/HORIZON_BUILD_LEDGER.md) — evidence-based implementation status per phase
- [`docs/HORIZON_EXECUTION_CHECKLIST.md`](docs/HORIZON_EXECUTION_CHECKLIST.md) — working checklist; it does not override governance
- [`docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md`](docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md) — Alpha Team architecture and future execution increments
- [`docs/HORIZON_SYSTEM_STEWARD.md`](docs/HORIZON_SYSTEM_STEWARD.md) — read-only engineering monitor and report contract
- [`docs/FINAL_SITE_MAP.md`](docs/FINAL_SITE_MAP.md) — reachable routes and access gates
- [`docs/AI_ORCHESTRATION.md`](docs/AI_ORCHESTRATION.md) — multi-model and connector orchestration
- [`docs/TERRA_START.md`](docs/TERRA_START.md) — Terra readiness and first-work-package guidance
- [`docs/AUTOMATION_OFFER_REQUEST_PLAN.md`](docs/AUTOMATION_OFFER_REQUEST_PLAN.md) — offer-request webhook contract and operating plan
- [`docs/AFFILIATE_LAUNCH_PLAN.md`](docs/AFFILIATE_LAUNCH_PLAN.md) — affiliate launch scope
- [`docs/PDF_EXPORT_SCOPE.md`](docs/PDF_EXPORT_SCOPE.md) — PDF export scope
- [`PROJECT_RULES.md`](PROJECT_RULES.md) — repository safety and implementation rules
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md) — AI-assisted development workflow
- [`AGENTS.md`](AGENTS.md) — agent entry point and shipping rules

## Security and data handling

Treat uploaded documents, financial profiles, authentication data, and extracted facts as sensitive.
Keep secrets server-side, use least-privilege Supabase access, preserve RLS policies, validate webhook
signatures, and avoid logging customer content or credentials. Changes affecting authentication,
database schema, access policies, payments, or production data require explicit review.

## License

This repository is proprietary and **all rights are reserved**. No permission is granted to use, copy,
modify, publish, distribute, sublicense, or sell any portion of the software without prior written
permission from the copyright holder. See [`LICENSE`](LICENSE) for the full terms.

## Disclaimer

HORIZON by VZG (a product of Tarifberater24, expert brand VZG CONSULT) provides informational
support, analysis assistance, and document preparation. It does not replace professional tax, legal,
insurance, or government advice. HORIZON is not the insurer, no premium or approval is guaranteed,
no decision is automated, affiliate links are marked, and official decisions remain with the
competent authorities.
