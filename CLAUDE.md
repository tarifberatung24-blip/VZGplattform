# HORIZON by VZG — Claude Code entry point

Governance lives in `AGENTS.md`, `PROJECT_RULES.md`, `AI_WORKFLOW.md` and `docs/TERRA_START.md`. If this file and
`AGENTS.md` ever disagree, `AGENTS.md` wins. `AGENTS.md` is deliberately not imported here, so it does not cost
tokens on every message. Read it (and `PROJECT_RULES.md`) once, before the first of these:
- starting or changing a phase task (it holds the phase, frozen-module and `public.cases` rules);
- changing governance, security, auth, RLS or deployment files;
- writing or editing human-facing prose (it holds the Humanizer standard).

Always true without reading it: one writer per module; inspect the latest `main` first; keep `Tarifberater24`,
`VZG CONSULT`, `HORIZON by VZG` and `VZGplattform` distinct; `public.cases` is the canonical case model; Render
deploys from GitHub `main`; no merge, deploy, env, schema or RLS change without explicit owner approval.

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

## Browser verification: bdg (optional dev tool)

`bdg` (browser-debugger-cli) drives a real Chromium from the shell and reads the DOM, network and console. It is a
developer tool, not a project dependency: nothing is added to `package.json` or the lockfile. Install from the owner's
fork (MIT, upstream `szymdzum/browser-debugger-cli`):

```bash
git clone --depth 1 https://github.com/hesreallyhim/browser-debugger-cli-fork ~/tools/bdg
cd ~/tools/bdg && npm ci --ignore-scripts && npm run build && npm link
```

Rules:
- Only local development hosts (`localhost`, `127.0.0.1`). Never point it at production.
- Never sign in with real credentials through it. Use test data from the project's own seed files only.
- Set `CHROME_PATH` when no Chrome is installed. In containers set `BDG_NO_SANDBOX=1`.
- Use a named session and always stop it:

```bash
bdg http://localhost:3000 --headless --session horizon
bdg dom query h1 --session horizon
bdg peek --session horizon -q
bdg stop --session horizon
```

Reviewed and deliberately not vendored (MIT, reviewed 2026-10-11):
- `hesreallyhim/github-api-usage-monitor`: a GitHub Action that reports rate-limit usage. HORIZON makes no
  meaningful GitHub API volume, and adding it would give a third-party action access to our workflows. Revisit only
  if rate limits become a real problem.
- `hesreallyhim/executor-fork`: an initiative workflow system of about 60 scripts. It overlaps `AGENTS.md`,
  `PROJECT_RULES.md`, `AI_WORKFLOW.md` and `claude-guard`. Its `scripts/lint-prompt-injection.py` and
  `skills/executor/scripts/exec-scan-secrets` are worth adopting only if third-party skill files are ever loaded here.

## Token discipline

The owner's plan limits are a real constraint. Context is re-sent on every request, so keep it small.
- Limit command output: `pnpm test 2>&1 | tail -40`, `pnpm lint 2>&1 | tail -30`. Report only failures and counts.
- Read only the lines needed (`offset`/`limit`, `rg -n`). Do not re-read a file just after editing it.
- No screenshots unless the visual result is the point; prefer `read_page`, `get_page_text` or `bdg dom`.
- Do routine steps (PR, merge checks, lint fixes) on Sonnet; keep Opus for architecture and hard debugging.
- One task per session. `/clear` between unrelated tasks; `/compact` only after exploration or a milestone.
- Replies in Bulgarian, short, plain words. No recap of steps the owner already saw.

## Compact instructions

When compacting, keep: the active task and its done-criterion, `ACTIVE_PHASE` / `ALLOWED_FILES` / `FROZEN_FILES`,
open PR numbers and their state, owner decisions (what was approved or deferred), failing test output and the
exact error, and the next step. Drop exploration chatter, file dumps and successful command output.

## Hard stops (also enforced in `.claude/settings.json`)

- No merge, deploy, env/secret, schema/RLS or production change without explicit owner approval.
- Never read or print `.env*` files, tokens or customer data.
- No `git add .`, `reset --hard`, `clean`, force-push or stash of someone else's work.
- Human-facing prose goes through the Humanizer standard (see `AGENTS.md`); the skill is not vendored.
