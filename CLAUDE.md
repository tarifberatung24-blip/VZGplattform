# HORIZON by VZG — Claude Code entry point

@AGENTS.md

Governance lives in `AGENTS.md`, `PROJECT_RULES.md`, `AI_WORKFLOW.md` and `docs/TERRA_START.md`.
This file only adds what is specific to Claude Code. If the two ever disagree, `AGENTS.md` wins.

## Communication

The owner writes Bulgarian (often by voice, so read transcription errors charitably) and wants execution
first, minimal explanation. Reply in Bulgarian; keep code, commands and paths exact. End each task with the
report block from `AGENTS.md` / the Project instructions (TASK, STATUS, FILES CHANGED, COMMIT, TYPECHECK,
BUILD, TESTS, DEPLOYMENT, HTTP CHECK, BLOCKERS, NOT IMPLEMENTED, NEXT RECOMMENDED STEP). Use `NOT RUN` /
`BLOCKED` instead of implying success.

## Session start (automatic)

A `SessionStart` hook in `.claude/settings.json` runs `node scripts/terra-preflight.mjs` (offline, prints no
secret values). Then declare `ACTIVE_PHASE`, `ALLOWED_FILES`, `FROZEN_FILES / SYSTEMS`, `OUT_OF_SCOPE` and load
phase context with `node scripts/horizon-context.mjs <PHASE>`.

## Code navigation: codebase-memory-mcp

`.mcp.json` registers `codebase-memory-mcp` (install: `npm install -g codebase-memory-mcp`). Prefer it over
blind grep for "who calls X", impact analysis and architecture questions: `search_graph`, `trace_path`,
`get_code_snippet`, `get_architecture`. Index once per machine with `index_repository` on the repo root. It is a
navigation aid, not a source of truth: confirm anything load-bearing in the file itself. Use `rg` for literals
and for `supabase/` SQL (the SQL parser is partial).

## Supabase

`.mcp.json` registers the Supabase MCP for project `mteguzgbiuexmdcrqajj` in **read-only** mode. Schema, RLS,
grants and migrations are never changed through it. Changes go through a reviewed migration file in
`supabase/migrations/` that the owner applies; see `docs/SUPABASE_MIGRATION_HISTORY_REPAIR.md`.

## Verification commands

```bash
node scripts/terra-preflight.mjs
git status --short && git diff --check
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm i18n:verify      # when copy changes
pnpm build            # needs network for Google Fonts; CI is authoritative
```

## Hard stops (also enforced in `.claude/settings.json`)

- No merge, deploy, env/secret, schema/RLS or production change without explicit owner approval.
- Never read or print `.env*` files, tokens or customer data.
- No `git add .`, `reset --hard`, `clean`, force-push or stash of someone else's work.
- Human-facing prose goes through the Humanizer standard (see `AGENTS.md`); the skill is not vendored.
