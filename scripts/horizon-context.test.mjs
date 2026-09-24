#!/usr/bin/env node
/**
 * Tests for the HORIZON phase-scoped context loader (scripts/horizon-context.mjs).
 *
 * Runs on Node built-ins only (`node --test`), matching the loader's no-npm-dependency rule.
 *
 * Usage: node scripts/horizon-context.test.mjs
 */

import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  HorizonContextError,
  REPO_ROOT,
  buildContext,
  extractCanonicalIdentity,
  extractSection,
  ledgerIndexRow,
  ledgerPhaseSection,
  loadIndex,
  outOfScopeSummary,
  readSourceSources,
} from "./horizon-context.mjs"

const LOADER = resolve(dirname(fileURLToPath(import.meta.url)), "horizon-context.mjs")
const index = loadIndex()
const sources = readSourceSources(index)
const phaseIds = Object.keys(index.phases)

/** Run the loader as a real process and capture exit code and output. */
function runLoader(phase) {
  return spawnSync(process.execPath, [LOADER, ...(phase === undefined ? [] : [phase])], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
}

const label = (phase) => `PHASE ${phase.slice(1)} —`

test("P1, P5, P9 and P12 produce context successfully", () => {
  for (const phase of ["P1", "P5", "P9", "P12"]) {
    const result = runLoader(phase)
    assert.equal(result.status, 0, `${phase} must exit 0: ${result.stderr}`)
    assert.ok(result.stdout.includes(`ACTIVE_PHASE:\n${phase}`), `${phase} must report its own id`)
    assert.ok(result.stdout.includes(label(phase)), `${phase} must include its ledger record`)
  }
})

test("output carries exactly the required keys", () => {
  const required = [
    "ACTIVE_PHASE",
    "PHASE_NAME",
    "CANONICAL_IDENTITY",
    "GOVERNANCE",
    "MASTER_MAP_CONTEXT",
    "BUILD_LEDGER_CONTEXT",
    "DEPENDENCIES",
    "FROZEN_SYSTEMS",
    "OWNER_APPROVAL_REQUIREMENTS",
    "OUT_OF_SCOPE",
    "SOURCE_FILES",
  ]
  for (const phase of phaseIds) {
    const keys = Object.keys(buildContext(phase))
    assert.deepEqual(keys, required, `${phase} key set must match the contract exactly`)
  }
})

test("an invalid phase fails non-zero", () => {
  for (const bad of ["bogus", "P999", "P", "phase1", "P0.5", "1"]) {
    const result = runLoader(bad)
    assert.notEqual(result.status, 0, `${bad} must fail`)
    assert.ok(
      result.stderr.includes("HORIZON_CONTEXT_ERROR"),
      `${bad} must report a HORIZON_CONTEXT_ERROR`,
    )
  }
})

test("no phase argument fails non-zero with usage", () => {
  const result = runLoader(undefined)
  assert.notEqual(result.status, 0)
  assert.ok(result.stderr.includes("Usage:"))
})

test("a missing heading fails non-zero", () => {
  const brokenIndex = structuredClone(index)
  brokenIndex.phases.P1.masterMapHeadings = ["99. Heading That Does Not Exist"]
  assert.throws(
    () => buildContext("P1", { index: brokenIndex, sources }),
    (error) => error instanceof HorizonContextError && /was not found/.test(error.message),
  )

  const brokenEngine = structuredClone(index)
  brokenEngine.phases.P9.engines = ["E404"]
  assert.throws(
    () => buildContext("P9", { index: brokenEngine, sources }),
    (error) => error instanceof HorizonContextError && /E404/.test(error.message),
  )
})

test("a missing ledger heading fails non-zero", () => {
  const brokenSources = { ...sources, buildLedger: sources.buildLedger.replace(/^## PHASE 5 —.*$/m, "## PHASE 5 renamed") }
  assert.throws(
    () => buildContext("P5", { index, sources: brokenSources }),
    (error) => error instanceof HorizonContextError && /Ledger heading/.test(error.message),
  )
})

test("the Capital section does not leak into normal phase context", () => {
  const capitalMarkers = [
    "PRESERVED — NOT IN ACTIVE SEQUENCE",
    "capital-core-1.0.0",
    "FinancialFact",
    "PublishBoundary",
    "AdvisorReview",
  ]
  for (const phase of phaseIds) {
    const context = buildContext(phase)
    for (const marker of capitalMarkers) {
      assert.ok(
        !context.MASTER_MAP_CONTEXT.includes(marker),
        `${phase} Master Map context must not contain ${marker}`,
      )
      assert.ok(
        !context.BUILD_LEDGER_CONTEXT.includes(marker),
        `${phase} Ledger context must not contain ${marker}`,
      )
    }
    // The Capital record itself is never extracted, only the one-line out-of-scope rule.
    assert.ok(!context.BUILD_LEDGER_CONTEXT.includes("## CAPITAL"))
  }
})

test("output never contains all 18 phases", () => {
  const allLedgerHeadings = (sources.buildLedger.match(/^## PHASE [0-9]+ —.*$/gm) ?? []).length
  assert.equal(allLedgerHeadings, 18, "ledger is expected to define 18 phase headings")

  for (const phase of phaseIds) {
    const result = runLoader(phase)
    const found = result.stdout.match(/^## PHASE [0-9]+ —/gm) ?? []
    assert.equal(found.length, 1, `${phase} must include exactly one ledger phase record`)
    assert.ok(found.length < allLedgerHeadings, `${phase} must not include every phase`)
  }
})

test("non-requested phases never appear in the output", () => {
  for (const phase of phaseIds) {
    const other = phase === "P1" ? "P5" : "P1"
    const result = runLoader(phase)
    assert.ok(!result.stdout.includes(label(other)), `${phase} output must not include ${other}`)
  }
})

test("dependencies are declared but not expanded", () => {
  // P3 depends on P1, P2 and P5; none of those sections may be loaded.
  const context = buildContext("P3")
  assert.ok(context.DEPENDENCIES.includes("P1"), "P3 dependencies must name P1")
  assert.ok(context.DEPENDENCIES.includes("P5"), "P3 dependencies must name P5")
  for (const dependency of ["P1", "P2", "P5"]) {
    assert.ok(
      !context.BUILD_LEDGER_CONTEXT.includes(label(dependency)),
      `P3 must not expand the ${dependency} record`,
    )
  }
  assert.ok(
    context.DEPENDENCIES.includes("deliberately not loaded"),
    "dependencies must state that sections are not expanded",
  )
})

test("frozen summary reports the ledger FROZEN: YES count only", () => {
  const context = buildContext("P1")
  assert.ok(context.FROZEN_SYSTEMS.includes("Frozen count: YES = 1"))
  assert.ok(context.FROZEN_SYSTEMS.includes("P1 (PUBLIC LAYER 0)"))
  assert.ok(context.FROZEN_SYSTEMS.includes("must not be modified without explicit owner reopening"))
  assert.ok(!context.FROZEN_SYSTEMS.includes("*FROZEN:* NO"), "individual NO rows are not dumped")
})

test("canonical identity has all four distinct names", () => {
  const identity = extractCanonicalIdentity(sources.projectRules, index.identityPattern)
  for (const name of ["Tarifberater24", "VZG CONSULT", "HORIZON by VZG", "VZGplattform"]) {
    assert.ok(identity.includes(name), `identity must include ${name}`)
  }
  assert.equal(identity.split("\n").length, 4, "identity is exactly four lines")
})

test("governance points at the canonical sources", () => {
  const context = buildContext("P5")
  for (const source of [
    "docs/HORIZON_MASTER_MAP.md",
    "docs/HORIZON_BUILD_LEDGER.md",
    "PROJECT_RULES.md",
    "AGENTS.md",
    "AI_WORKFLOW.md",
  ]) {
    assert.ok(context.GOVERNANCE.includes(source), `governance must cite ${source}`)
  }
})

test("the JSON index holds mappings only, not phase requirements", () => {
  const raw = readFileSync(resolve(REPO_ROOT, "docs/HORIZON_CONTEXT_INDEX.json"), "utf8")
  const leakage = [
    "CURRENT STATUS",
    "DONE CRITERIA",
    "CURRENT IMPLEMENTATION",
    "BLOCKERS",
    "**MISSING:**",
  ]
  for (const phrase of leakage) {
    assert.ok(!raw.includes(phrase), `index must not restate "${phrase}"`)
  }
  for (const phase of phaseIds) {
    const entry = index.phases[phase]
    assert.deepEqual(
      Object.keys(entry).sort(),
      ["engines", "masterMapHeadings"],
      `${phase} index entry must contain mappings only`,
    )
  }
})

test("out-of-scope carries the Capital rule and the phase's own exclusion", () => {
  const context = buildContext("P9")
  assert.ok(context.OUT_OF_SCOPE.includes("Capital code"))
  assert.ok(context.OUT_OF_SCOPE.includes("PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE"))

  const summary = outOfScopeSummary(index, "P12")
  assert.ok(summary.extra.some((line) => line.includes("P13")))
  assert.ok(summary.summary.includes("report only"))
})

test("ledger index rows resolve for every phase", () => {
  for (const phase of phaseIds) {
    const row = ledgerIndexRow(sources.buildLedger, phase)
    assert.ok(row, `${phase} must have an index row`)
    assert.equal(row.id, phase)
    assert.ok(row.system.length > 0)
    assert.match(row.frozen, /^(YES|NO)$/)
    assert.ok(row.ownerApproval.length > 0)
  }
})

test("each phase record is non-empty and contains the required fields", () => {
  for (const phase of phaseIds) {
    const section = ledgerPhaseSection(sources.buildLedger, index, phase)
    assert.ok(section, `${phase} record must exist`)
    for (const field of [
      "**ID:**",
      "**SYSTEM:**",
      "**TARGET ROUTES:**",
      "**CURRENT STATUS:**",
      "**CURRENT IMPLEMENTATION:**",
      "**REUSE:**",
      "**MISSING:**",
      "**DEPENDENCIES:**",
      "**BLOCKERS:**",
      "**DONE CRITERIA:**",
      "**FROZEN:**",
    ]) {
      assert.ok(section.includes(field), `${phase} record must contain ${field}`)
    }
  }
})

test("the loader loads only the two canonical documents plus governance sources", () => {
  const context = buildContext("P12")
  for (const source of context.SOURCE_FILES.split("\n")) {
    assert.ok(source.startsWith("- "), "SOURCE_FILES lines are bullets")
  }
  assert.equal(context.SOURCE_FILES.split("\n").length, 5)
})

test("the loader is importable without executing the CLI", () => {
  const output = execFileSync(
    process.execPath,
    ["-e", `import(${JSON.stringify(LOADER)}).then((m) => process.stdout.write(typeof m.buildContext))`],
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
  assert.equal(output, "function")
})

test("extractSection stops at the next peer heading", () => {
  const markdown = ["## A", "body a", "### A1", "body a1", "## B", "body b"].join("\n")
  const section = extractSection(markdown, "A")
  assert.equal(section, ["## A", "body a", "### A1", "body a1"].join("\n"))
})