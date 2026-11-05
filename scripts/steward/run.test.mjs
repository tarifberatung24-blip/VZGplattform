#!/usr/bin/env node
/**
 * Tests for the Steward orchestrator (scripts/steward/run.mjs).
 *
 * The behaviour under test is the failure behaviour. A monitor that throws must
 * not take the run down, a source that is down must not produce a fabricated
 * finding, and a run must still write a report when a section failed. Those are
 * the conditions an unattended schedule will eventually meet.
 *
 * The CLI is exercised as a real process, so the exit code and the written files
 * are verified rather than the internal return value.
 *
 * Usage: node --test scripts/steward/run.test.mjs
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { STEWARD_VERSION, collectSections, runSteward } from "./run.mjs"

const STEWARD_DIR = path.dirname(fileURLToPath(import.meta.url))
const RUNNER = path.join(STEWARD_DIR, "run.mjs")

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "steward-test-"))
}

test("collectSections returns every section even when a source is unavailable", async () => {
  // An invalid base URL makes the health endpoint unreachable without touching
  // the real production deployment.
  const collected = await collectSections({
    baseUrl: "https://not-allowlisted.example",
    token: null,
    attempts: 1,
    timeoutMs: 2_000,
    limitPerSource: 1,
  })

  assert.ok(collected.sections.health, "the health section must still exist")
  assert.ok(collected.sections.legal, "the legal section must still exist")
  assert.ok(collected.sections.technology, "the technology section must still exist")
  assert.ok(collected.sections.product, "the product section must still exist")
  assert.ok(collected.sections.forum, "the forum section must still exist")
  assert.equal(collected.sections.health.health.reachable, false)
})

test("an unreachable health endpoint never produces an ok finding", async () => {
  const collected = await collectSections({
    baseUrl: "https://not-allowlisted.example",
    token: null,
    attempts: 1,
    timeoutMs: 2_000,
    limitPerSource: 1,
  })

  const codes = collected.sections.health.findings.map((finding) => finding.code)
  assert.ok(codes.includes("HEALTH_ENDPOINT_UNREACHABLE"))
  assert.ok(!codes.includes("HEALTH_ENDPOINT_OK"))
})

test("without a token the run still completes and records the limitation", async () => {
  const collected = await collectSections({ token: null, attempts: 1, timeoutMs: 2_000, limitPerSource: 1 })

  assert.equal(collected.sections.technology.available, false)
  assert.match(collected.sections.technology.reason, /GITHUB_TOKEN/)
  assert.ok(collected.assumptions.some((assumption) => /Workflow history was unavailable|unreachability/.test(assumption)))
})

test("assumptions always separate what was not verified", async () => {
  const collected = await collectSections({ token: null, attempts: 1, timeoutMs: 2_000, limitPerSource: 1 })

  assert.ok(collected.assumptions.length > 0, "a run must state its assumptions")
  assert.ok(collected.assumptions.some((assumption) => /not verified against the Render dashboard/.test(assumption)))
})

test("runSteward writes both a JSON and a Markdown report", async () => {
  const outDir = tempDir()
  const result = await runSteward({
    outDir,
    baseUrl: "https://not-allowlisted.example",
    token: null,
    attempts: 1,
    timeoutMs: 2_000,
    limitPerSource: 1,
    executionMode: "manual",
    trigger: "test",
  })

  assert.ok(fs.existsSync(result.jsonPath), "JSON report must exist")
  assert.ok(fs.existsSync(result.mdPath), "Markdown report must exist")

  const report = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"))
  assert.equal(report.stewardVersion, STEWARD_VERSION)
  assert.equal(report.executionMode, "manual")
  assert.equal(report.trigger, "test")
  assert.equal(report.writeOperationsPerformed, false)

  const markdown = fs.readFileSync(result.mdPath, "utf8")
  assert.ok(markdown.includes("# HORIZON System Steward — Report"))

  fs.rmSync(outDir, { recursive: true, force: true })
})

test("a report is still produced when the platform section failed", async () => {
  const outDir = tempDir()
  const result = await runSteward({
    outDir,
    baseUrl: "https://not-allowlisted.example",
    token: null,
    attempts: 1,
    timeoutMs: 2_000,
    limitPerSource: 1,
  })

  // The report exists and names the failure, rather than the run ending without
  // an artifact.
  const report = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"))
  const riskCodes = report.sections.errorsAndRisks.healthFindings.map((finding) => finding.code)
  assert.ok(riskCodes.includes("HEALTH_ENDPOINT_UNREACHABLE"))

  fs.rmSync(outDir, { recursive: true, force: true })
})

test("the CLI runs as a process, exits 0, and writes a report", () => {
  const outDir = tempDir()
  const result = spawnSync(
    process.execPath,
    [RUNNER, "--out", outDir, "--mode", "manual", "--trigger", "cli-test", "--no-github", "--legal-limit", "1"],
    { encoding: "utf8", timeout: 180_000, env: { ...process.env, GITHUB_TOKEN: "" } },
  )

  assert.equal(result.status, 0, `CLI exited ${result.status}: ${result.stderr}`)

  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.schemaVersion, "horizon-steward-report-v1")
  assert.ok(fs.existsSync(parsed.report))
  assert.ok(fs.existsSync(parsed.json))
  assert.deepEqual(parsed.sectionFailures, [])

  fs.rmSync(outDir, { recursive: true, force: true })
})

test("the CLI does not print a secret that is present in the environment", () => {
  const outDir = tempDir()
  const fakeSecret = "ghp_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234"
  const result = spawnSync(
    process.execPath,
    [RUNNER, "--out", outDir, "--no-github", "--legal-limit", "1"],
    {
      encoding: "utf8",
      timeout: 180_000,
      env: { ...process.env, GITHUB_TOKEN: fakeSecret },
    },
  )

  assert.ok(!result.stdout.includes(fakeSecret), "stdout must not contain the token")
  assert.ok(!result.stderr.includes(fakeSecret), "stderr must not contain the token")

  for (const file of fs.readdirSync(outDir)) {
    const content = fs.readFileSync(path.join(outDir, file), "utf8")
    assert.ok(!content.includes(fakeSecret), `${file} must not contain the token`)
  }

  fs.rmSync(outDir, { recursive: true, force: true })
})

test("the Steward writes only inside its output directory", () => {
  const source = fs.readFileSync(RUNNER, "utf8")
  // Any write call must target the configured output directory.
  for (const call of ["fs.writeFile", "fs.mkdir", "fs.appendFile"]) {
    const pattern = new RegExp(`${call}\\(([^)]*)`, "g")
    let match
    while ((match = pattern.exec(source)) !== null) {
      const args = match[1]
      assert.ok(
        args.includes("outDir") || args.includes("jsonPath") || args.includes("mdPath"),
        `${call} must write inside the output directory, found: ${args}`,
      )
    }
  }
})
