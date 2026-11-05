/**
 * HORIZON System Steward — orchestrator.
 *
 * Runs the monitors, assembles the report, and writes it to disk. Designed to be
 * safe to run unattended:
 *
 *  - a failing section never aborts the run; it is recorded as unavailable and
 *    the remaining sections still run, because a partial report is useful and an
 *    absent report is not;
 *  - every section has its own timeout budget, so one hanging source cannot
 *    consume the whole run;
 *  - the process exits non-zero only when the run itself could not produce a
 *    report, not when a source was down;
 *  - nothing is written outside the output directory, and no request can change
 *    remote state (see guard.mjs).
 *
 * Usage:
 *   node scripts/steward/run.mjs --out <dir> [--mode manual] [--legal-limit N]
 */

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { collectPlatformHealth } from "./health-monitor.mjs"
import { collectLegalFindings } from "./legal-monitor.mjs"
import { collectTechnologyIntelligence } from "./tech-intel.mjs"
import { collectProductIntelligence, buildForumDrafts } from "./product-intel.mjs"
import { buildReport, renderMarkdown, REPORT_SCHEMA_VERSION } from "./report.mjs"
import { validateForumDraft } from "./forum-contract.mjs"

export const STEWARD_VERSION = "1.0.0"

/**
 * Run a section, converting a thrown error into a recorded failure.
 *
 * A monitor that throws is a defect, but it must not take the run down with it,
 * so the failure becomes a section-level result the report can show.
 */
async function runSection(name, fn, onError) {
  const started = Date.now()
  try {
    const value = await fn()
    return { name, ok: true, value, elapsedMs: Date.now() - started, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { name, ok: false, value: onError ? onError(message) : null, elapsedMs: Date.now() - started, error: message }
  }
}

/**
 * Resolve the GitHub token.
 *
 * `null` is a meaningful value here — "run without GitHub access" — so a plain
 * `??` chain would be wrong: it treats an explicit `null` as "not provided" and
 * falls through to the environment variable, which makes `--no-github`
 * ineffective whenever `GITHUB_TOKEN` happens to be set. The presence of the key
 * is therefore checked rather than its value.
 */
function resolveToken(options) {
  if (Object.prototype.hasOwnProperty.call(options, "token")) return options.token
  return process.env.GITHUB_TOKEN ?? null
}

/** Collect every section. Order is fixed so the report is reproducible. */
export async function collectSections(options = {}) {
  const token = resolveToken(options)
  const startedAt = new Date().toISOString()

  const healthResult = await runSection("platformHealth", () => collectPlatformHealth(options), () => null)
  const legalResult = await runSection(
    "legal",
    () => collectLegalFindings(options),
    () => ({ sources: [], findings: [], relevantFindings: [], enactedFindings: [], unavailableSources: [] }),
  )
  const techResult = await runSection(
    "technology",
    () => collectTechnologyIntelligence({ ...options, token }),
    (message) => ({ available: false, reason: `technology section failed: ${message}`, topics: [], recommendations: [] }),
  )
  const productResult = await runSection("product", () => collectProductIntelligence(options), () => ({
    available: false,
    reason: "product intelligence section failed",
    findings: [],
    whatWouldUnblock: [],
  }))

  const forumResult = await runSection(
    "forum",
    async () => {
      const findings = legalResult.value?.enactedFindings ?? []
      const relevant = (legalResult.value?.relevantFindings ?? []).filter((finding) => finding.relevant)
      // Enacted findings first: a law that exists is a better post than a bill.
      const ordered = [...findings.filter((f) => f.relevant), ...relevant.filter((f) => !f.isEnactedLaw)]
      const drafts = buildForumDrafts(ordered, options)

      // Validate every draft against the forum contract before it is written.
      const invalid = drafts.drafts
        .map((draft) => ({ title: draft.title, ...validateForumDraft(draft) }))
        .filter((check) => !check.valid)
      if (invalid.length > 0) {
        throw new Error(`forum draft(s) failed contract validation: ${JSON.stringify(invalid)}`)
      }
      return drafts
    },
    () => ({ drafts: [], draftCount: 0, requiresHumanReview: true, publishable: false }),
  )

  const verifiedFacts = [
    healthResult.ok && healthResult.value?.health?.reachable
      ? `Production health endpoint responded ${healthResult.value.health.status} with revision ${healthResult.value.health.revision ?? "unknown"}.`
      : null,
    healthResult.ok && healthResult.value?.mainCommit?.available
      ? `Repository main was at ${healthResult.value.mainCommit.shortSha} when the run started.`
      : null,
    legalResult.ok
      ? `${legalResult.value.sources.filter((source) => source.reachable).length} of ${legalResult.value.sources.length} configured legal sources were read.`
      : null,
    techResult.ok && techResult.value?.available
      ? `${techResult.value.recommendations.length} repositories were assessed through the GitHub search API.`
      : null,
  ].filter(Boolean)

  const assumptions = [
    "A source that could not be read may still be reachable from a different network; unreachability is reported per source rather than assumed to be permanent.",
    "Repository metadata (stars, last push, licence) describes activity, not code quality; no repository was reviewed in depth.",
    "The deployed revision is taken from RENDER_GIT_COMMIT as reported by the health endpoint; it is not verified against the Render dashboard.",
    ...(healthResult.ok && healthResult.value?.workflows?.available === false
      ? ["Workflow history was unavailable, so CI state could not be confirmed for this run."]
      : []),
    ...(legalResult.ok && legalResult.value?.unavailableSources?.length
      ? ["Legal coverage is partial: the unavailable sources listed in section 4 were not examined."]
      : []),
  ]

  const sectionFailures = [healthResult, legalResult, techResult, productResult, forumResult]
    .filter((result) => !result.ok)
    .map((result) => ({ section: result.name, error: result.error }))

  return {
    startedAt,
    sections: {
      health: healthResult.value,
      legal: legalResult.value,
      technology: techResult.value,
      product: productResult.value,
      forum: forumResult.value,
    },
    verifiedFacts,
    assumptions,
    sectionFailures,
    token,
  }
}

/** Run the Steward and write the report. Returns a summary for the CLI. */
export async function runSteward(options = {}) {
  const startedAt = new Date()
  const outDir = options.outDir ?? path.join(".openhands", "steward-reports")

  const collected = await collectSections(options)

  const report = buildReport(collected.sections, {
    now: new Date().toISOString(),
    startedAt: collected.startedAt,
    durationMs: Date.now() - startedAt.getTime(),
    executionMode: options.executionMode ?? "manual",
    trigger: options.trigger ?? "cli",
    runId: options.runId ?? process.env.GITHUB_RUN_ID ?? null,
    stewardVersion: STEWARD_VERSION,
    nodeVersion: process.version,
    environment: process.env.STEWARD_ENVIRONMENT ?? "unknown",
    verifiedFacts: collected.verifiedFacts,
    assumptions: collected.assumptions,
    env: process.env,
    secrets: [collected.token].filter(Boolean),
  })

  const markdown = renderMarkdown(report)

  await fs.mkdir(outDir, { recursive: true })
  const stamp = report.generatedAt.replace(/[:.]/g, "-")
  const jsonPath = path.join(outDir, `steward-report-${stamp}.json`)
  const mdPath = path.join(outDir, `steward-report-${stamp}.md`)

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  await fs.writeFile(mdPath, `${markdown}\n`, "utf8")

  return {
    report,
    markdown,
    jsonPath,
    mdPath,
    sectionFailures: collected.sectionFailures,
    schemaVersion: REPORT_SCHEMA_VERSION,
  }
}

function parseArgs(argv) {
  const args = { outDir: undefined, executionMode: "manual", trigger: "cli", legalLimit: undefined, token: undefined }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--out") args.outDir = argv[++i]
    else if (arg === "--mode") args.executionMode = argv[++i]
    else if (arg === "--trigger") args.trigger = argv[++i]
    else if (arg === "--legal-limit") args.legalLimit = Number(argv[++i])
    else if (arg === "--no-github") args.token = ""
  }
  return args
}

/** CLI entry point. */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const options = {
    outDir: args.outDir,
    executionMode: args.executionMode,
    trigger: args.trigger,
    ...(args.legalLimit ? { limitPerSource: args.legalLimit } : {}),
    ...(args.token === "" ? { token: null } : {}),
  }

  const result = await runSteward(options)

  // Structured, single-line summary on stdout so a workflow log stays readable.
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        schemaVersion: result.schemaVersion,
        report: result.mdPath,
        json: result.jsonPath,
        overallHealth: result.report.executiveSummary.overallHealth,
        recommendations: result.report.executiveSummary.recommendationsTotal,
        critical: result.report.executiveSummary.recommendationsCritical,
        sectionFailures: result.sectionFailures,
      },
      null,
      2,
    )}\n`,
  )

  // A failed section is reported in the artifact, not as a process failure: the
  // report was still produced, and a red run would obscure that.
  process.exitCode = 0
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`steward run failed: ${error instanceof Error ? error.stack : String(error)}\n`)
    process.exitCode = 1
  })
}
