#!/usr/bin/env node
/**
 * Tests for the platform health monitor (scripts/steward/health-monitor.mjs).
 *
 * The assessment logic is tested with constructed inputs rather than live calls,
 * because the cases that matter — a revision mismatch, a missing token, a failed
 * workflow — are exactly the ones a healthy production environment will not
 * produce on demand. `assessHealth` is pure, so it can be exercised directly.
 *
 * One live check against production is included and skipped rather than failed
 * when the network is unavailable, so the suite states what it really verified.
 *
 * Usage: node --test scripts/steward/health-monitor.test.mjs
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  HEALTH_SEVERITY,
  assessHealth,
  collectPlatformHealth,
  readHealthEndpoint,
  readMainCommit,
  readWorkflowRuns,
} from "./health-monitor.mjs"

const healthyInput = (overrides = {}) => ({
  health: {
    reachable: true,
    attempts: 1,
    status: 200,
    revision: "abcdef1234567890",
    serviceStatus: "ok",
    integrations: { awin: true },
    capabilities: { send: true, automationHandoff: true },
    error: null,
  },
  workflows: {
    available: true,
    reason: null,
    runs: [],
    failedRuns: [],
    inProgress: [],
    latestByWorkflow: [{ name: "CI", conclusion: "success" }],
  },
  mainCommit: { available: true, sha: "abcdef1234567890", shortSha: "abcdef1" },
  pullRequests: { available: true, pullRequests: [] },
  ...overrides,
})

const codes = (result) => result.findings.map((finding) => finding.code)

test("an unreachable health endpoint is critical", () => {
  const result = assessHealth(
    healthyInput({ health: { reachable: false, attempts: 3, status: 0, error: "request timed out", revision: null, serviceStatus: null } }),
  )

  assert.equal(result.overall, HEALTH_SEVERITY.CRITICAL)
  assert.ok(codes(result).includes("HEALTH_ENDPOINT_UNREACHABLE"))
})

test("a deployed revision behind main is a warning, not a failure", () => {
  // Render deploys a few minutes after a merge, so a brief gap is expected.
  const result = assessHealth(
    healthyInput({
      health: { ...healthyInput().health, revision: "1111111111" },
      mainCommit: { available: true, sha: "2222222222", shortSha: "2222222" },
    }),
  )

  assert.equal(result.overall, HEALTH_SEVERITY.WARNING)
  assert.ok(codes(result).includes("DEPLOYED_REVISION_BEHIND_MAIN"))
})

test("a deployed revision matching main is reported as ok", () => {
  const result = assessHealth(healthyInput())
  assert.ok(codes(result).includes("DEPLOYED_REVISION_MATCHES_MAIN"))
  assert.equal(result.overall, HEALTH_SEVERITY.OK)
})

test("an unknown deployed revision is a warning, because the running code cannot be confirmed", () => {
  const result = assessHealth(
    healthyInput({ health: { ...healthyInput().health, revision: "unknown" } }),
  )

  assert.ok(codes(result).includes("DEPLOYED_REVISION_UNKNOWN"))
  assert.equal(result.overall, HEALTH_SEVERITY.WARNING)
})

test("a failed workflow is critical and names the run", () => {
  const result = assessHealth(
    healthyInput({
      workflows: {
        available: true,
        reason: null,
        runs: [],
        inProgress: [],
        latestByWorkflow: [{ name: "CI", conclusion: "failure" }],
        failedRuns: [{ name: "CI", branch: "main", sha: "abcdef1234", url: "https://github.com/x/y/actions/runs/1" }],
      },
    }),
  )

  assert.equal(result.overall, HEALTH_SEVERITY.CRITICAL)
  const finding = result.findings.find((item) => item.code === "WORKFLOW_RUN_FAILED")
  assert.ok(finding)
  assert.match(finding.detail, /CI/)
  assert.match(finding.detail, /actions\/runs\/1/)
})

test("missing GitHub permissions are reported as unknown, not as a pass", () => {
  const result = assessHealth(
    healthyInput({
      workflows: { available: false, reason: "GITHUB_TOKEN is not available; workflow run history was not read", runs: [], failedRuns: [], latestByWorkflow: [] },
      mainCommit: { available: false, reason: "GITHUB_TOKEN is not available", sha: null },
      pullRequests: { available: false, reason: "GITHUB_TOKEN is not available", pullRequests: [] },
    }),
  )

  assert.ok(codes(result).includes("WORKFLOW_HISTORY_UNAVAILABLE"))
  assert.ok(codes(result).includes("MAIN_COMMIT_UNAVAILABLE"))
  // An unverified CI state must never be presented as green.
  assert.ok(!codes(result).includes("WORKFLOW_RUNS_GREEN"))
})

test("a disabled send capability is surfaced as a warning", () => {
  const result = assessHealth(
    healthyInput({ health: { ...healthyInput().health, capabilities: { send: false } } }),
  )

  assert.ok(codes(result).includes("SEND_CAPABILITY_DISABLED"))
})

test("open pull requests are surfaced so pending change is visible", () => {
  const result = assessHealth(
    healthyInput({ pullRequests: { available: true, reason: null, pullRequests: [{ number: 1, title: "x" }] } }),
  )

  assert.ok(codes(result).includes("OPEN_PULL_REQUESTS"))
})

test("findings are sorted most severe first", () => {
  const result = assessHealth(
    healthyInput({
      health: { reachable: false, attempts: 1, status: 0, error: "down", revision: null, serviceStatus: null },
    }),
  )

  const severities = result.findings.map((finding) => finding.severity)
  const rank = { critical: 0, warning: 1, unknown: 2, ok: 3 }
  for (let i = 1; i < severities.length; i += 1) {
    assert.ok(rank[severities[i - 1]] <= rank[severities[i]], "findings must be sorted by severity")
  }
})

test("without a token the GitHub readers degrade to unavailable instead of throwing", async () => {
  const workflows = await readWorkflowRuns({ token: null })
  const mainCommit = await readMainCommit({ token: null })

  assert.equal(workflows.available, false)
  assert.match(workflows.reason, /GITHUB_TOKEN/)
  assert.equal(mainCommit.available, false)
  assert.equal(mainCommit.sha, null)
})

test("a refused host is reported as a failure rather than throwing", async () => {
  const health = await readHealthEndpoint({ baseUrl: "https://not-allowlisted.example", attempts: 1, timeoutMs: 2_000 })

  assert.equal(health.reachable, false)
  assert.ok(health.error)
})

test("reads the live production health endpoint", async (t) => {
  const health = await readHealthEndpoint({ attempts: 2, timeoutMs: 60_000 })

  if (!health.reachable) {
    t.skip(`production health endpoint was not reachable from this environment: ${health.error}`)
    return
  }

  assert.equal(health.status, 200)
  assert.ok(typeof health.revision === "string" && health.revision.length > 0)
  assert.equal(health.serviceStatus, "ok")
})

test("collectPlatformHealth always returns an assessable shape, even with no token", async () => {
  const result = await collectPlatformHealth({ token: null, attempts: 1, timeoutMs: 60_000 })

  assert.ok(Array.isArray(result.findings))
  assert.ok(Object.values(HEALTH_SEVERITY).includes(result.overall))
  assert.ok(result.health)
  assert.equal(result.workflows.available, false)
})
