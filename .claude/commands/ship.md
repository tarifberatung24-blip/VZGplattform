---
description: Commit the named files, push the branch and open a PR through the GitHub REST API
---
Ship the current work as one reviewable PR. Steps:

1. Refuse if the branch is `main`; create `type/short-name` from `origin/main` first.
2. Stage files **by name** only (never `git add .` / `-A`). Show `git diff --cached --stat`.
3. Commit with a conventional message (`feat|fix|design|copy|chore(scope): …`) and the attribution lines from the session.
4. `git push -u origin <branch>`.
5. Open the PR with REST, because GraphQL is blocked in these sessions:
   `gh api repos/tarifberatung24-blip/VZGplattform/pulls --input <json>` with title, head, base `main`, and a Bulgarian body: what changed, how it was verified, what is NOT verified (production, migrations).
6. Poll `gh api repos/.../commits/<branch>/check-runs` until CI finishes and report the result.
7. Do **not** merge. Ask the owner in one line: "Сливам ли #N, става ли?" and merge only after a clear yes. $ARGUMENTS
