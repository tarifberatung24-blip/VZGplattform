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

## Working style (adapted from karpathy-skills, awesome-claude-code)

1. **Think before coding:** restate the goal and the done-criterion in one line; read the code you will touch first.
2. **Simplest thing that works:** no new dependency, abstraction or migration without a demonstrated need.
3. **Surgical changes:** touch only what the task needs; no drive-by refactors of frozen phases.
4. **Verify, then claim:** run `/verify`; report only what was actually run and observed.

## Project commands and guard

- `/verify` runs every gate and prints the report block; `/ship` commits by name, pushes and opens the PR via REST;
  `/migration-review` and `/security-review` are the HORIZON checklists.
- `scripts/claude-guard.mjs` runs before every Bash/Write/Edit call and blocks hard-stop violations anywhere in a
  command (force push, `reset --hard`, `git add .`, reading `.env`, `supabase db push`, secrets in files). It is
  tested by `scripts/claude-guard.test.mjs`. If it blocks something legitimate, ask the owner; do not bypass it.

## Hard stops (also enforced in `.claude/settings.json`)

- No merge, deploy, env/secret, schema/RLS or production change without explicit owner approval.
- Never read or print `.env*` files, tokens or customer data.
- No `git add .`, `reset --hard`, `clean`, force-push or stash of someone else's work.
- Human-facing prose goes through the Humanizer standard (see `AGENTS.md`); the skill is not vendored.
