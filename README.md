# FinanzBG

FinanzBG is a bilingual Bulgarian/German financial and administrative assistant for people living in Germany. This repository contains the currently available v0 snapshot from the linked project, including the shared design system, i18n foundation, Supabase clients, deterministic opportunity engine, partner adapter guardrails, and the public marketing homepage.

## Development

```bash
pnpm install
pnpm dev
```

The application runs on `http://localhost:3000` by default.

## Production build

```bash
pnpm build
pnpm start
```

## Environment variables

Copy `.env.example` to `.env.local` and provide the Supabase project values if authentication or database access is enabled:

```bash
cp .env.example .env.local
```

## Notes

The v0 project was paused after reaching the free-credit limit while the application foundation was being built. The repository therefore reflects the latest source that was available at that point. A small set of standard Next.js scaffold files and the homepage entry point are included so the extracted source compiles and runs as a standalone project.

FinanzBG provides information and document preparation. It is not a tax advisor, lawyer, or insurance broker; official decisions are made by the relevant authorities.
