# VZGplattform — HORIZON by VZG

Canonical identity, never interchangeable: legal entity **Tarifberater24**, expert brand
**VZG CONSULT**, product **HORIZON by VZG**, codebase **VZGplattform**. See
[`PROJECT_RULES.md`](PROJECT_RULES.md) for the full definition.

Bilingual Bulgarian/German financial and administrative operating center for people living in
Germany. The application helps users understand contracts and official documents, discover relevant
benefits and savings opportunities, track deadlines, and prepare next actions in a clear,
user-controlled workflow.

> **Product status:** V1 foundation for private customers. The application provides information and
> document preparation; it is not a tax adviser, lawyer, insurance broker, or official authority.

## Highlights

- **Bulgarian and German UI** with locale-aware routes (`/bg/...` and `/de/...`); Bulgarian is the default locale.
- **Authentication and profiles** backed by Supabase, including Google OAuth, SMS/phone sign-in, and MFA.
- **HORIZON case workspace** (`/{locale}/guide/[caseId]`) that hosts document intake, extraction, review, drafting, signature, send, and audit panels behind one case engine.
- **Document workflows** for upload, OCR, extraction, review, and signed downloads.
- **Benefits and tax-oriented flows** including Kindergeld, Finanzamt requests, the tax questionnaire, and PDF form preparation.
- **HORIZON Radar** for contract signals, deadlines, history, and user-approved next steps.
- **Affiliate and partner surfaces** (`/{locale}/versicherungen`, `/{locale}/angebote/*`, `/go/[offer]`) with marked links and an Awin reconciliation job.
- **Financial education** content and deterministic opportunity calculations.
- **PWA support** with install metadata and a service worker.
- **Production health endpoint:** [`/api/health`](https://vzgplattform.onrender.com/api/health).

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 (App Router), React 19, TypeScript |
| Styling and UI | Tailwind CSS 4, shadcn/ui and Base UI primitives, Lucide |
| Internationalization | `next-intl`, Bulgarian (`bg`, default) and German (`de`) |
| Authentication and data | Supabase Auth, PostgreSQL, Storage, RLS |
| AI | Groq via the Vercel AI SDK; optional OpenRouter, Cerebras, local Ollama, Gemini vision |
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

Public pages and `/api/health` can run without Supabase configuration. Protected routes and
integrations require the relevant variables and return a controlled configuration error when they
are unavailable. See [`.env.example`](.env.example) for the complete, commented list.

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

Recommended pre-commit verification (the same gates CI runs):

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
scripts/              Local validation and readiness scripts
skills/               Project-local agent skills (behavior, not credentials)
supabase/             Migrations, functions, prepared SQL, and RLS tests
docs/                 Product plans, operating notes, and technical scope
proxy.ts              Locale and request proxy
```

## Database and Supabase

Migrations live in `supabase/migrations`. The canonical project is
`mteguzgbiuexmdcrqajj` (`vzg-plattform-deutschland`, `eu-central-1`), recorded in
[`supabase/project.json`](supabase/project.json). Do not edit production tables manually or disable
Row Level Security as a shortcut.

Schema, RLS, grants, and migrations require an explicit owner approval and are applied through a
reviewed migration file — never through an agent tool. See
[`docs/SUPABASE_MIGRATION_HISTORY_REPAIR.md`](docs/SUPABASE_MIGRATION_HISTORY_REPAIR.md) and
[`SUPABASE_CONSOLIDATION_PLAN.md`](SUPABASE_CONSOLIDATION_PLAN.md). The repository also contains
prepared SQL and RLS tests under `supabase/prepared` and `supabase/tests` that are not applied by
the normal migration flow.

## Deployment

The production service is deployed from the GitHub `main` branch to Render. A normal deployment flow
is:

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

- [`docs/HORIZON_MASTER_MAP.md`](docs/HORIZON_MASTER_MAP.md) — canonical target build map and phase order
- [`docs/HORIZON_BUILD_LEDGER.md`](docs/HORIZON_BUILD_LEDGER.md) — implementation status per phase
- [`docs/HORIZON_EXECUTION_CHECKLIST.md`](docs/HORIZON_EXECUTION_CHECKLIST.md) — the plain working list
- [`docs/FINAL_SITE_MAP.md`](docs/FINAL_SITE_MAP.md) — every reachable route and how it is gated
- [`docs/AI_ORCHESTRATION.md`](docs/AI_ORCHESTRATION.md) — multi-model and connector orchestration
- [`docs/TERRA_START.md`](docs/TERRA_START.md) — Terra readiness and first-work-package guidance
- [`docs/AUTOMATION_OFFER_REQUEST_PLAN.md`](docs/AUTOMATION_OFFER_REQUEST_PLAN.md) — offer-request webhook contract and operating plan
- [`docs/AFFILIATE_LAUNCH_PLAN.md`](docs/AFFILIATE_LAUNCH_PLAN.md) — affiliate launch scope
- [`docs/PDF_EXPORT_SCOPE.md`](docs/PDF_EXPORT_SCOPE.md) — PDF export scope
- [`PROJECT_RULES.md`](PROJECT_RULES.md) — repository safety and implementation rules
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md) — AI-assisted development workflow
- [`AGENTS.md`](AGENTS.md) — agent entry point and shipping rules

## Security and data handling

Treat uploaded documents, financial profiles, authentication data, and extracted facts as sensitive. Keep secrets server-side, use least-privilege Supabase access, preserve RLS policies, validate webhook signatures, and avoid logging customer content or credentials. Changes affecting authentication, database schema, access policies, payments, or production data require an explicit review.

## License

This repository is proprietary and **all rights are reserved**. No permission is granted to use, copy, modify, publish, distribute, sublicense, or sell any portion of the software without prior written permission from the copyright holder. See [`LICENSE`](LICENSE) for the full terms.

## Disclaimer

HORIZON by VZG (a product of Tarifberater24, expert brand VZG CONSULT) provides informational
support and document preparation. It does not replace professional tax, legal, insurance, or
government advice. HORIZON is not the insurer, no premium or approval is guaranteed, no decision is
automated, affiliate links are marked, and official decisions remain with the competent authorities.
