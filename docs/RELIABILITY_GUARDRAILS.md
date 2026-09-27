# HORIZON Reliability Guardrails

Status: **MANDATORY ENGINEERING POLICY**

These guardrails prevent verified work from being overwritten by stale documentation, agent assumptions, environment-specific notes, or unvalidated direct changes.

## 1. Change path

- AI-authored implementation uses a focused branch and pull request.
- No direct write to `main` unless the owner explicitly authorizes that exact direct write.
- Merge, deployment, production environment changes, migrations, RLS changes, and secret changes remain owner-gated.
- One writer per module. Parallel agents may review, but must not edit the same files concurrently.

## 2. Evidence hierarchy

When sources disagree, use this order:

1. verified production/runtime evidence;
2. passing integration/E2E tests;
3. passing unit tests and build/typecheck;
4. current code;
5. implementation ledger/checklist;
6. plans, research notes, and historical audits.

A document may not mark something missing when the same phase records it as runtime-verified. Status changes and documentation reconciliation belong in the same PR.

## 3. Integration state vocabulary

Do not collapse these states:

- **CODE_READY** — implementation exists and local/static validation passes.
- **CONFIG_READY** — required provider/env configuration exists in the target environment.
- **E2E_VERIFIED** — the real end-to-end flow was exercised.
- **PRODUCTION_ACTIVE** — merged, deployed, configured, and verified in production.

A feature is never called production-active merely because its code or tests exist.

## 4. Frozen surfaces

A FROZEN surface is read-only until the owner explicitly reopens it. A maintenance task may not change a frozen UI, legal surface, route contract, or business rule as collateral work.

## 5. Provider and secret boundaries

- Business logic must be provider-neutral where practical.
- Provider configuration is resolved as complete pairs; never combine a URL from one provider family with a secret from another.
- Missing or partial configuration fails closed.
- Secrets never enter browser code, logs, committed files, customer payloads, or AI prompts.
- Legacy provider names may exist only behind an explicit compatibility boundary.

## 6. Accessibility invariants

- Never disable browser/user zoom.
- WCAG 2.2 AA remains the baseline.
- Critical status or meaning cannot rely on color alone.
- Reduced-motion behavior must remain available where motion is used.

## 7. Legacy endpoint policy

Every legacy route/API must be one of:

- supported canonical behavior;
- explicit compatibility redirect/adapter;
- explicit retired/gone behavior.

Permanent placeholder failures such as a successful readiness check followed by a hard-coded `501` are not allowed.

## 8. Database and irreversible effects

- Schema evolution is additive unless the owner explicitly approves a destructive change and rollback plan.
- Migration files are code artifacts; creating one does not mean it has been applied.
- Apply migrations to staging/test first when available.
- RLS/ownership tests are mandatory for new user-scoped tables or write paths.
- External sends, offer acceptance, financial actions, and other consequential effects require the existing user-approval boundaries.

## 9. Agent behavior files

Stable repository instructions live only in:

- `PROJECT_RULES.md`
- `AGENTS.md`
- `AI_WORKFLOW.md`
- this document

Do not add personality/disposition files such as `SOUL.md`. Do not commit temporary sandbox limitations as permanent product architecture unless they are independently verified runtime constraints.

## 10. Required CI

Before owner review, the PR must pass:

- `pnpm governance:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm i18n:verify`
- `pnpm test`
- `pnpm build`

A green build does not replace runtime verification for flows that depend on authentication, external providers, database state, or production configuration.

## 11. Handoff

Every implementation handoff states separately:

- what changed;
- what was tested;
- what was not tested;
- whether configuration exists;
- whether migrations were applied;
- whether production was changed;
- rollback point / base commit;
- remaining blockers.
