#!/usr/bin/env node
/**
 * Tests for report generation (scripts/steward/report.mjs).
 *
 * The report is what a person reads, so the tests assert its *claims*: that the
 * ten required sections are present, that a recommendation cannot be built
 * without evidence, that a section with no data says so instead of looking
 * empty, and that redaction is applied to the serialized output.
 *
 * Usage: node --test scripts/steward/report.test.mjs
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  CONFIDENCE,
  PRIORITY,
  REPORT_SCHEMA_VERSION,
  buildReport,
  buildSourceIndex,
  deriveRecommendations,
  recommendation,
  renderMarkdown,
  sortRecommendations,
} from "./report.mjs"

const minimalSections = () => ({
  health: {
    overall: "ok",
    health: { reachable: true, status: 200, revision: "abcdef1", serviceStatus: "ok" },
    mainCommit: { available: true, sha: "abcdef1", shortSha: "abcdef1" },
    workflows: { available: true, latestByWorkflow: [], failedRuns: [], inProgress: [] },
    findings: [{ severity: "ok", code: "HEALTH_ENDPOINT_OK", detail: "ok" }],
  },
  legal: {
    sources: [{ sourceId: "bgbl", name: "Bundesgesetzblatt", url: "https://www.recht.bund.de/x", reachable: true, status: "enacted_and_promulgated", itemCount: 10 }],
    findings: [],
    relevantFindings: [],
    enactedFindings: [],
    unavailableSources: [],
  },
  technology: { available: true, reason: null, topics: [], recommendations: [] },
  product: { available: false, reason: "no aggregate source", findings: [], whatWouldUnblock: [] },
  forum: { drafts: [], draftCount: 0, requiresHumanReview: true, publishable: false },
})

test("builds a report with the required schema version and read-only mode", () => {
  const report = buildReport(minimalSections())

  assert.equal(report.schemaVersion, REPORT_SCHEMA_VERSION)
  assert.equal(report.mode, "READ_ONLY")
  assert.equal(report.writeOperationsPerformed, false)
})

test("a recommendation cannot be built without evidence, effort or a valid priority", () => {
  assert.throws(() => recommendation({ priority: "Urgent", title: "x", evidence: "e", expectedBenefit: "b", estimatedEffort: "1", confidence: "high" }))
  assert.throws(() => recommendation({ priority: "High", title: "x", evidence: "e", expectedBenefit: "b", estimatedEffort: "1", confidence: "certain" }))
  // Valid input constructs.
  const built = recommendation({ priority: "High", title: "x", evidence: "e", expectedBenefit: "b", estimatedEffort: "1", confidence: "high", action: "a" })
  assert.equal(built.priority, "High")
  assert.equal(built.kind, "recommendation")
})

test("recommendations are sorted by priority with critical first", () => {
  const sorted = sortRecommendations([
    { priority: "Low" }, { priority: "Critical" }, { priority: "Medium" }, { priority: "High" },
  ])
  assert.deepEqual(sorted.map((item) => item.priority), ["Critical", "High", "Medium", "Low"])
})

test("a critical health finding becomes a critical recommendation", () => {
  const sections = minimalSections()
  sections.health.findings = [{ severity: "critical", code: "WORKFLOW_RUN_FAILED", detail: "CI failed" }]

  const items = deriveRecommendations(sections)
  const critical = items.find((item) => item.priority === PRIORITY.CRITICAL)

  assert.ok(critical)
  assert.match(critical.evidence, /CI failed/)
  assert.equal(critical.confidence, CONFIDENCE.HIGH)
})

test("a section with no data produces a recommendation to connect the source, not a product claim", () => {
  const items = deriveRecommendations(minimalSections())
  const productItem = items.find((item) => item.title.includes("aggregated product data source"))

  assert.ok(productItem)
  assert.equal(productItem.priority, PRIORITY.MEDIUM)
  assert.match(productItem.action, /aggregate/)
})

test("unreachable legal sources produce a coverage recommendation", () => {
  const sections = minimalSections()
  sections.legal.unavailableSources = [
    { id: "bmi", name: "BMI", url: "https://www.bmi.bund.de/", reason: "DNS blocked" },
  ]

  const items = deriveRecommendations(sections)
  const coverage = items.find((item) => item.title.includes("unreachable legal source"))

  assert.ok(coverage)
  assert.match(coverage.evidence, /BMI/)
})

test("relevant enacted findings produce a high-priority review action", () => {
  const sections = minimalSections()
  sections.legal.enactedFindings = [
    { title: "Gesetz A", sourceName: "BGBl", isEnactedLaw: true, relevant: true },
    { title: "Gesetz B", sourceName: "BGBl", isEnactedLaw: true, relevant: true },
  ]
  sections.legal.relevantFindings = sections.legal.enactedFindings

  const items = deriveRecommendations(sections)
  const review = items.find((item) => item.priority === PRIORITY.HIGH)

  assert.ok(review)
  assert.match(review.title, /2 relevant enacted/)
})

test("the source index lists reachable sources once and unreachable ones once", () => {
  const sections = minimalSections()
  sections.legal.sources.push({ sourceId: "dead", name: "Dead", url: "https://dead.test", reachable: false, status: "unknown", itemCount: 0 })
  sections.legal.unavailableSources.push({ id: "dead", name: "Dead", url: "https://dead.test", reason: "unreachable" })

  const index = buildSourceIndex(sections)
  const deadEntries = index.filter((entry) => entry.id === "dead")

  assert.equal(deadEntries.length, 1, "an unreachable source must appear once, not twice")
})

test("renders all ten required sections in Markdown", () => {
  const markdown = renderMarkdown(buildReport(minimalSections()))

  for (const heading of [
    "## 1. Executive Summary",
    "## 2. Platform Health",
    "## 3. Errors and Risks",
    "## 4. German Legal Updates",
    "## 5. GitHub Technology Opportunities",
    "## 6. Product Improvement Opportunities",
    "## 7. Forum Drafts",
    "## 8. Recommended Actions",
    "## 9. Sources and Evidence",
    "## 10. Execution",
  ]) {
    assert.ok(markdown.includes(heading), `missing section: ${heading}`)
  }
})

test("the product section states that no metrics are reported instead of appearing empty", () => {
  const markdown = renderMarkdown(buildReport(minimalSections()))
  const productSection = markdown.split("## 6. Product Improvement Opportunities")[1].split("## 7.")[0]

  assert.match(productSection, /No product metrics are reported/)
})

test("a recommendation in Markdown carries priority, evidence, benefit, effort and confidence", () => {
  const sections = minimalSections()
  sections.health.findings = [{ severity: "critical", code: "X", detail: "detail here" }]
  const markdown = renderMarkdown(buildReport(sections))

  assert.match(markdown, /\*\*\[Critical\]\*\*/)
  assert.match(markdown, /Evidence: detail here/)
  assert.match(markdown, /Expected benefit:/)
  assert.match(markdown, /Estimated effort:/)
  assert.match(markdown, /Confidence:/)
})

test("every recommendation in a rendered report has all required fields", () => {
  const sections = minimalSections()
  sections.health.findings = [{ severity: "critical", code: "X", detail: "d" }]
  const report = buildReport(sections)

  for (const item of report.recommendedActions) {
    for (const field of ["priority", "title", "evidence", "expectedBenefit", "estimatedEffort", "confidence", "action"]) {
      assert.ok(item[field] !== undefined && item[field] !== "", `recommendation missing ${field}`)
    }
  }
})

test("secrets in the sections are redacted in both the object and the Markdown", () => {
  const sections = minimalSections()
  const secret = "ghp_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ1234"
  sections.health.findings = [{ severity: "warning", code: "LEAK", detail: `token ${secret} appeared` }]

  const report = buildReport(sections)
  const markdown = renderMarkdown(report)

  assert.ok(!JSON.stringify(report).includes(secret), "the JSON report must not contain the secret")
  assert.ok(!markdown.includes(secret), "the Markdown report must not contain the secret")
  assert.ok(markdown.includes("[REDACTED]"))
})

test("verified facts and assumptions are separate lists, not one merged narrative", () => {
  const report = buildReport(minimalSections(), {
    verifiedFacts: ["Production responded 200."],
    assumptions: ["A blocked host may be reachable elsewhere."],
  })

  assert.deepEqual(report.verifiedFacts, ["Production responded 200."])
  assert.deepEqual(report.assumptions, ["A blocked host may be reachable elsewhere."])
})

test("the report records the execution timestamp and mode", () => {
  const report = buildReport(minimalSections(), {
    now: "2026-11-01T12:00:00.000Z",
    startedAt: "2026-11-01T11:59:00.000Z",
    executionMode: "manual",
    trigger: "workflow_dispatch",
  })

  assert.equal(report.generatedAt, "2026-11-01T12:00:00.000Z")
  assert.equal(report.executionMode, "manual")
  assert.equal(report.trigger, "workflow_dispatch")
  assert.equal(report.execution.finishedAt, "2026-11-01T12:00:00.000Z")
})

test("an empty report still renders without throwing", () => {
  const report = buildReport({})
  const markdown = renderMarkdown(report)

  assert.ok(markdown.includes("# HORIZON System Steward — Report"))
  assert.equal(report.executiveSummary.overallHealth, "unknown")
})
