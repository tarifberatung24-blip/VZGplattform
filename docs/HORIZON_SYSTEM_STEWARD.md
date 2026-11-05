# HORIZON System Steward — V1

One read-only AI-assisted system that monitors the HORIZON platform, analyses what
it finds, and produces a structured report. It runs as a manual GitHub Actions
workflow and writes a Markdown and JSON report as a build artifact.

- Entry point: `scripts/steward/run.mjs`
- Workflow: `.github/workflows/horizon-steward.yml` (manual trigger only)
- Tests: `node --test scripts/steward/*.test.mjs`
- Runtime dependencies: none. Node built-ins only (`fetch`, `AbortSignal`, `node:test`).

## What it does

| Section | Source | Nature |
| --- | --- | --- |
| Platform health | `/api/health`, GitHub Actions runs, `main` commit | Observed |
| Errors and risks | Derived from health findings and unavailable sources | Observed |
| German legal updates | Bundesgesetzblatt, BMAS, BAMF, Bundestag feeds | Observed |
| GitHub technology | GitHub repository search API | Recommendation only |
| Product intelligence | None connected | Reported limitation |
| Forum drafts | Derived from verified legal findings | Draft, requires review |

The report separates **verified facts**, **assumptions** and **recommendations**
into distinct lists. Every recommendation carries priority, evidence, expected
benefit, estimated effort, confidence and an action.

## What it deliberately does not do

These are enforced in code, not by prompt instruction, and are asserted by
`scripts/steward/guard.test.mjs`:

- **No writes.** Only `GET` is available through `stewardFetch`. No module imports
  a database client, mailer, or process-spawning module.
- **No arbitrary outbound requests.** Every request passes a host allowlist
  (`STEWARD_ALLOWED_HOSTS`). `file:`, `data:` and `http:` URLs are refused.
- **No customer document access.** Cases are owner-scoped behind RLS and the
  Steward has no path to read them.
- **No publishing.** Forum output is a draft with `publishable: false`. Nothing
  can post, email, or sign.
- **No invented data.** A section with no source reports its limitation instead of
  producing numbers. Product intelligence is the current example.

## The legal-status rule

A proposal must never read as a law. Status is assigned from the **source**, never
from the wording of a title:

| Source | Status | Meaning |
| --- | --- | --- |
| Bundesgesetzblatt | `enacted_and_promulgated` | An enacted, promulgated law |
| Gesetze im Internet | `enacted_and_promulgated` | Consolidated federal law |
| BMAS | `government_proposal` | Ministry news, not law |
| BAMF | `announcement` | Press release, not law |
| Bundestag (hib, Themen) | `parliamentary_process` | A bill in process, not law |

So a Bundestag item titled "Gesetz …" is reported as **not law**, and a
Bundesgesetzblatt correction titled "Entwurf …" is reported as **enacted**. The
report renders the status as an explicit marker (`ENACTED LAW`,
`IN PROCESS — not law`) in every entry.

## Running it

Locally, with a token for the GitHub sections:

```bash
GITHUB_TOKEN=... node scripts/steward/run.mjs --out steward-reports --trigger local
```

Without a token the GitHub sections degrade to "unavailable" and are reported as
such — the run still completes:

```bash
node scripts/steward/run.mjs --out steward-reports --no-github
```

From GitHub: **Actions → HORIZON System Steward → Run workflow**. Inputs:

- `legal_limit` — items read per legal source (default 25, clamped to 1–100)
- `skip_github` — skip the GitHub sections

The workflow uploads `horizon-steward-report-<run_id>` as an artifact, writes the
executive summary to the run page, and **fails if the working tree is dirty**,
which would prove a write occurred.

## Tests

```bash
node --test scripts/steward/*.test.mjs   # 107 tests
```

The suite covers redaction (both that secrets are removed and that prose is not
mangled), the read-only guarantee, feed parsing including malformed input, the
legal status rule, health assessment, licence and maintenance classification,
report structure, and orchestrator failure behaviour.

Tests that need the network skip themselves when a source is unreachable, so a
restricted environment reports what it could not verify rather than failing.

## Known limitations in V1

- **No automatic schedule.** The workflow is manual-only by design; the task
  requires a reviewed manual run before scheduling is considered.
- **Legal coverage is partial.** `gesetze-im-internet.de`, `bmi.bund.de` and
  `bundesfinanzministerium.de` were unreachable from the build environment. They
  stay on the allowlist and are reported as unavailable rather than dropped, so
  coverage is never overstated. Reachability may differ in CI.
- **Product intelligence reports a gap, not data.** No aggregate, anonymised
  source exists. See `PRODUCT_DATA_SOURCES` for what would unblock it.
- **Security assessment is metadata-level.** Licence, archived flag, last push and
  issue count. It is not a vulnerability scan.
- **Technology search returns candidates, not adoptions.** Nothing is installed
  or cloned.

## Adding a source

1. Add the host to `STEWARD_ALLOWED_HOSTS` in `scripts/steward/guard.mjs` with a
   reason.
2. Add the source to `LEGAL_SOURCES` in `legal-monitor.mjs` with its **status** —
   what publishing there means, not what the titles say.
3. If the source is unreachable, list it in `UNVERIFIED_SOURCES` with the reason.
4. Run `node --test scripts/steward/*.test.mjs`.
