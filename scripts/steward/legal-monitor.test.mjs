#!/usr/bin/env node
/**
 * Tests for the German legal monitor (scripts/steward/legal-monitor.mjs).
 *
 * The section's purpose is that a reader never mistakes a proposal for a law, so
 * the central tests assert that status comes from the *source*, not from the
 * wording of a title. A bill whose title says "Gesetz" must still be reported as
 * not-yet-law, and a promulgated item whose title says "Entwurf" must still be
 * reported as enacted.
 *
 * Usage: node --test scripts/steward/legal-monitor.test.mjs
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  LEGAL_SOURCES,
  LEGAL_STATUS,
  LEGAL_STATUS_LABELS,
  UNVERIFIED_SOURCES,
  classifyFinding,
  collectLegalFindings,
  matchedTerms,
} from "./legal-monitor.mjs"

const BUNDESGESETZBLATT = LEGAL_SOURCES.find((source) => source.id === "bundesgesetzblatt")
const BUNDESTAG = LEGAL_SOURCES.find((source) => source.id === "bundestag-hib")

test("a promulgated source marks a finding as enacted law", () => {
  const finding = classifyFinding({ title: "Gesetz zur Änderung des Steuerrechts", link: "https://x.test/1" }, BUNDESGESETZBLATT)

  assert.equal(finding.isEnactedLaw, true)
  assert.equal(finding.status, LEGAL_STATUS.ENACTED_AND_PROMULGATED)
  assert.match(finding.caveat, /official promulgation record/)
})

test("a parliamentary source never marks a finding as enacted law", () => {
  const finding = classifyFinding({ title: "Gesetz zur Änderung des Steuerrechts", link: "https://x.test/2" }, BUNDESTAG)

  assert.equal(finding.isEnactedLaw, false)
  assert.equal(finding.status, LEGAL_STATUS.PARLIAMENTARY_PROCESS)
  assert.match(finding.caveat, /Not an enacted law/)
})

test("status comes from the source, not from the title wording", () => {
  // A bill in the Bundestag titled "Gesetz" is still not a law.
  const bill = classifyFinding({ title: "Gesetz über die Kindergrundsicherung" }, BUNDESTAG)
  assert.equal(bill.isEnactedLaw, false)

  // A promulgated correction whose title contains "Entwurf" is still enacted.
  const promulgated = classifyFinding({ title: "Entwurf einer Bekanntmachung" }, BUNDESGESETZBLATT)
  assert.equal(promulgated.isEnactedLaw, true)
})

test("every status has a plain-language label that does not overstate it", () => {
  for (const status of Object.values(LEGAL_STATUS)) {
    const label = LEGAL_STATUS_LABELS[status]
    assert.ok(typeof label === "string" && label.length > 0, `missing label for ${status}`)
    if (status !== LEGAL_STATUS.ENACTED_AND_PROMULGATED && status !== LEGAL_STATUS.ENACTED_NOT_YET_IN_FORCE) {
      assert.match(label, /not a law|not yet|Announcement|established/i, `label for ${status} must not imply law`)
    }
  }
})

test("matches relevance terms across German umlauts and case", () => {
  assert.ok(matchedTerms("Gesetz zur Änderung der Sozialversicherung").includes("sozialversicherung"))
  assert.ok(matchedTerms("Regelung für Selbstständige").includes("selbstständig"))
  assert.ok(matchedTerms("BUERGERGELD Regelung").includes("bürgergeld"))
  assert.deepEqual(matchedTerms("Verordnung über Luftverkehr"), [])
})

test("a finding carries its matched terms and a relevance flag", () => {
  const relevant = classifyFinding({ title: "Änderung der Sozialversicherungsentgeltverordnung" }, BUNDESGESETZBLATT)
  assert.equal(relevant.relevant, true)
  assert.ok(relevant.matchedTerms.includes("sozialversicherung"))

  const irrelevant = classifyFinding({ title: "Verordnung über Luftverkehrs-Ordnung" }, BUNDESGESETZBLATT)
  assert.equal(irrelevant.relevant, false)
})

test("a failed source is recorded as unreachable and does not stop the others", async () => {
  const sources = [
    { ...BUNDESGESETZBLATT, id: "will-fail", url: "https://unreachable.invalid.example/feed.xml" },
  ]
  const result = await collectLegalFindings({ sources, timeoutMs: 3_000, limitPerSource: 2 })

  assert.equal(result.sources.length, 1)
  assert.equal(result.sources[0].reachable, false)
  assert.ok(result.sources[0].error)
  assert.deepEqual(result.findings, [])
  assert.equal(result.unavailableSources.length > 0, true)
})

test("an unreachable source never contributes a fabricated finding", async () => {
  const sources = [{ ...BUNDESGESETZBLATT, id: "will-fail", url: "https://unreachable.invalid.example/feed.xml" }]
  const result = await collectLegalFindings({ sources, timeoutMs: 3_000 })

  assert.equal(result.findings.length, 0)
  assert.equal(result.enactedFindings.length, 0)
})

test("unverified sources from discovery are always reported, so coverage is not overstated", async () => {
  const result = await collectLegalFindings({ sources: [], limitPerSource: 1 })

  assert.equal(result.unavailableSources.length, UNVERIFIED_SOURCES.length)
  for (const source of UNVERIFIED_SOURCES) {
    const reported = result.unavailableSources.find((item) => item.id === source.id)
    assert.ok(reported, `${source.id} must be reported as unavailable`)
    assert.ok(reported.reason.length > 0)
  }
})

test("reads real feeds and separates enacted from in-process findings", async (t) => {
  // A live network call. Skipped rather than failed when the sandbox has no
  // route to the source, so the suite is honest about what it verified.
  const result = await collectLegalFindings({ limitPerSource: 5, timeoutMs: 15_000 })
  const reachable = result.sources.filter((source) => source.reachable)

  if (reachable.length === 0) {
    t.skip("no legal source was reachable from this environment")
    return
  }

  assert.ok(result.findings.length > 0, "a reachable feed should yield findings")
  for (const finding of result.enactedFindings) {
    assert.equal(finding.isEnactedLaw, true)
    assert.equal(finding.status, LEGAL_STATUS.ENACTED_AND_PROMULGATED)
  }
  for (const finding of result.findings) {
    if (!finding.isEnactedLaw) {
      assert.notEqual(finding.status, LEGAL_STATUS.ENACTED_AND_PROMULGATED)
    }
  }
})
