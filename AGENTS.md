# VZGplattform agent entry point

Short on purpose. Rules that protect the product stay; ceremony that only slows work is gone.
If a rule here gets in the way of a normal change, say so in one line and propose a fix to this file.

Four names, never interchangeable: LEGAL ENTITY `Tarifberater24`, EXPERT BRAND `VZG CONSULT`,
PRODUCT `HORIZON by VZG`, CODEBASE `VZGplattform`. The owner writes Bulgarian: answer in Bulgarian,
short, result first. Code, commands and paths stay exact.

## Canonical build map and phase governance

- `docs/HORIZON_MASTER_MAP.md` is the target build map, `docs/HORIZON_BUILD_LEDGER.md` the status per
  phase, `docs/HORIZON_EXECUTION_CHECKLIST.md` the plain working list. `PROJECT_RULES.md` and
  `AI_WORKFLOW.md` hold the project rules; the product direction is **CONTROL → OPTIMIZE → CAPITAL**.
- Phases P0 to P17 run in order, one active at a time. A later phase does not start because its files exist.
- DONE is defined in `PROJECT_RULES.md`. An accepted DONE module is FROZEN: it changes only when the owner
  reopens it. Design, copy and bug-fix work that touches frozen surfaces is fine when the owner asks for it;
  say which surface in one line.
- `public.cases` is the owner-scoped case model. `platform_*` is legacy: no deletes, no destructive
  migrations, no new workflows on it; bridge it with thin adapters.
- GitHub `main` is the single source of truth. Render deploys it to production a few minutes after a merge.
- For phase work, load only that phase: `node scripts/horizon-context.mjs P5` (not the whole map and ledger).
  For design, copy and bug fixes no phase declaration is needed.

## Shipping

1. Work in a clone or worktree, never in a ZIP export. Branch from fresh `origin/main`.
2. Check before pushing: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm i18n:verify` when copy
   changes. A check that was not run is reported as not run.
3. Commit by file name, push the branch, open the PR, wait for CI.
4. When CI is green and the owner asked for the change to go live, squash-merge it. That request is the
   approval. Schema, RLS, environment variables and production infrastructure always need an explicit
   approval of their own, in the same message that names them.
5. If a command is blocked or fails, try once more with the obvious fix, then stop and say exactly what
   blocked it and what the owner can do. Do not retry the same thing three times.
6. If `git push` asks for the wrong account, use
   `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`.

## Hard stops

- Never read or print `.env*`, tokens, keys or customer data.
- No `git add .`, `git reset --hard`, `git clean`, force-push, or stash of someone else's work. Preserve
  pre-existing dirty changes; do not commit unrelated work.
- Do not weaken security or safety rules. Regulated statements keep their exact substance: HORIZON is not
  the insurer, no guaranteed premium or approval, no automated decision, affiliate links are marked, and
  privacy and consent texts stay accurate (see the cookie notice and the privacy page).
- Do not install dependencies, rewrite the lockfile or upgrade tools without a reason tied to the task.
  Use the existing pnpm lockfile.
- One writer per module at a time.

## Human-facing prose

Website copy, labels, empty states, errors, e-mails and documentation prose in German, Bulgarian and
English follow the Humanizer standard (<https://github.com/blader/humanizer/blob/main/SKILL.md>); the
skill itself is not vendored. Prose only: never change code, identifiers, routes, prices, dates, URLs,
affiliate IDs or the meaning of legal text. Never invent facts, savings, guarantees or citations. Bulgarian
and German are written independently, not translated word for word.

## Report

End a task with a few lines in Bulgarian: what changed, what was checked with exact numbers, what was not
run or is blocked, and the next step. This replaces the long report block mentioned in `CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
