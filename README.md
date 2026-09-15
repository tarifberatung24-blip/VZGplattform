# KintexBG / VZGplattform

Bilingual Bulgarian/German financial and administrative assistant for people living in Germany. The application helps users understand contracts and official documents, discover relevant benefits and savings opportunities, track deadlines, and prepare next actions in a clear, user-controlled workflow.

> **Product status:** V1 foundation for private customers. The application provides information and document preparation; it is not a tax adviser, lawyer, insurance broker, or official authority.

## Highlights

- **Bulgarian and German UI** with locale-aware routes (`/bg/...` and `/de/...`).
- **Authentication and profiles** backed by Supabase, including Google OAuth support.
- **Contract and document workflows** for upload, OCR, extraction, review, and signed downloads.
- **Benefits and tax-oriented flows** including Kindergeld, Finanzamt requests, tax questionnaire and PDF preparation.
- **Contract Radar** for structured contract reviews, deadlines, history, and user-approved next steps.
- **Office workspace** for case-based document and correspondence workflows.
- **Financial education** content and deterministic opportunity calculations.
- **PWA support** with install metadata and a service worker.
- **Production health endpoint:** [`/api/health`](https://vzgplattform.onrender.com/api/health).

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Styling and UI | Tailwind CSS 4, shadcn/ui primitives, Lucide |
| Internationalization | `next-intl`, Bulgarian (`bg`) and German (`de`) |
| Authentication and data | Supabase Auth, PostgreSQL, Storage, RLS |
| AI and document processing | Groq-compatible AI integration, OCR, PDF.js, Tesseract.js |
| Validation and tests | ESLint, TypeScript, Vitest, repository i18n checks |
| Package manager | pnpm |
| Deployment | Render via GitHub `main` branch |

## Quick start

### Requirements

- Node.js 22 or a compatible modern Node.js release
- pnpm 11+
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
| `SUPABASE_SECRET_KEY` | Server-side operations | Server-only Supabase secret/service key; never expose it to the browser |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Local OAuth | Local callback URL, normally `http://localhost:3000/auth/callback` |
| `GROQ_API_KEY` | AI features | Server-side AI provider key |
| `N8N_OFFER_REQUEST_WEBHOOK_URL` | Offer requests | n8n intake webhook URL |
| `N8N_WEBHOOK_SECRET` | Offer requests | Shared secret used to authenticate webhook delivery |

Public pages and `/api/health` can run without Supabase configuration. Protected routes and integrations require the relevant variables and return a controlled configuration error when they are unavailable.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |
| `pnpm test` | Run the Vitest suite |
| `pnpm i18n:verify` | Check translation parity, usage, and hardcoded strings |
| `pnpm supabase:check` | Validate the configured Supabase project |
| `node scripts/terra-preflight.mjs` | Check Terra/tool readiness before assigned work |

Recommended pre-commit verification:

```bash
pnpm i18n:verify
pnpm typecheck
pnpm lint
pnpm test
```

## Project structure

```text
app/                  Next.js App Router pages and API routes
components/           Shared UI and feature components
i18n/                 Locale routing and request configuration
lib/                  Domain logic, Supabase helpers, validation, and services
messages/             Bulgarian and German translation dictionaries
public/               PWA assets, icons, and service worker
scripts/              Local validation and readiness scripts
supabase/             Migrations, functions, prepared SQL, and RLS tests
docs/                 Product plans, operating notes, and technical scope
proxy.ts              Locale and request proxy
```

## Database and Supabase

Migrations live in `supabase/migrations`. Apply them through the Supabase CLI in the intended environment; do not edit production tables manually or disable Row Level Security as a shortcut.

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Review migration SQL and RLS policies before applying changes to a shared or production project. The repository also contains prepared SQL and RLS tests that are not automatically applied by the normal migration flow.

## Deployment

The production service is deployed from the GitHub `main` branch to Render. A normal deployment flow is:

1. Run the local verification commands.
2. Commit a focused change to a branch or `main`, according to the repository workflow.
3. Push to GitHub and wait for Render to finish the automatic deployment.
4. Verify the health endpoint and the relevant localized route.

Production checks:

```bash
curl -i https://vzgplattform.onrender.com/api/health
curl -I https://vzgplattform.onrender.com/bg/auth/login
curl -I https://vzgplattform.onrender.com/de/auth/login
```

## Documentation

- [`docs/TERRA_START.md`](docs/TERRA_START.md) — Terra readiness and first-work-package guidance
- [`docs/N8N_OFFER_REQUEST_PLAN.md`](docs/N8N_OFFER_REQUEST_PLAN.md) — offer-request webhook contract and operating plan
- [`docs/AFFILIATE_LAUNCH_PLAN.md`](docs/AFFILIATE_LAUNCH_PLAN.md) — affiliate launch scope
- [`docs/PDF_EXPORT_SCOPE.md`](docs/PDF_EXPORT_SCOPE.md) — PDF export scope
- [`PROJECT_RULES.md`](PROJECT_RULES.md) — repository safety and implementation rules
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md) — AI-assisted development workflow

## Security and data handling

Treat uploaded documents, financial profiles, authentication data, and extracted facts as sensitive. Keep secrets server-side, use least-privilege Supabase access, preserve RLS policies, validate webhook signatures, and avoid logging customer content or credentials. Changes affecting authentication, database schema, access policies, payments, or production data require an explicit review.

## License

No open-source license has been declared yet. Until a license is added, the repository should be treated as proprietary and reused only with the repository owner's permission.

## Disclaimer

KintexBG / VZGplattform provides informational support and document preparation. It does not replace professional tax, legal, insurance, or government advice. Official decisions remain with the competent authorities.
