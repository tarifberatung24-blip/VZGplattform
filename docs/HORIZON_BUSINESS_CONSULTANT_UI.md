# HORIZON Business Consultant UI

## Scope

This branch adds the authenticated `/business` workspace and the navigation entry `Business Consultant`. The UI is intentionally one HORIZON workspace, not a second application or second agent system.

The workspace consumes the verified contracts from PR #172:

- `GET/PUT /api/horizon/business-consultant/profile`
- `GET/POST /api/horizon/business-consultant/diagnosis`
- `GET/PATCH /api/horizon/business-consultant/actions`
- `GET/POST /api/horizon/business-consultant/documents`
- `GET/POST /api/horizon/business-consultant/finance`
- `GET /api/horizon/business-consultant/specialists`
- `GET /api/horizon/agent-runs`

The client does not create mock API routes. Empty states show no data, and schema errors are surfaced as a migration/integration notice.

## Workspace areas

- Overview: profile completeness, latest diagnosis, open playbook work, approval count, finance totals and document status.
- Profile: owner-scoped profile fields, services and tools, with strict save feedback.
- Diagnosis: grouped findings and evidence-class badges. AI assumptions and external-verification requirements are not rendered as verified facts.
- 30/60/90 playbook: action status controls call the real PATCH endpoint. The consultant cannot complete an action on behalf of the owner.
- Documents: links to the canonical document center for upload and renders only business-document links returned by the consultant API.
- Finance: deterministic totals returned by the finance API and a manual-entry form using integer cents at the API boundary.
- Activity: real Agent Runs history and specialist roster. Awaiting approval is visible; no external action is implied.

## Known blocker

The current feature branch is based on `origin/main`. PR #172 is not merged into `main`, so the Business Consultant API routes and additive database migration are not present on this branch. The page therefore builds and renders its honest schema-not-ready state, but live profile/diagnosis/action/finance data cannot be verified until PR #172 is integrated and its migration is applied in the target environment.

This branch does not modify or merge PR #172 and does not add a duplicate schema or mock backend.

## Validation

- `pnpm typecheck` passes.
- `pnpm exec vitest run lib/navigation/horizon-nav.test.ts` passes.
- `pnpm build` passes.
- `git diff --check` passes.
- BG/DE message JSON parses successfully.
