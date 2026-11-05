#!/usr/bin/env node
/**
 * Tests for GitHub technology intelligence (scripts/steward/tech-intel.mjs).
 *
 * The assessment functions are pure and tested directly, because the judgements
 * that matter — a copyleft licence, an archived repository, a stale project —
 * must be produced from metadata deterministically rather than depending on what
 * a live search happens to return.
 *
 * The suite also asserts the module's central restraint: it recommends and does
 * nothing else.
 *
 * Usage: node --test scripts/steward/tech-intel.test.mjs
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  COPYLEFT_LICENCES,
  MIN_STARS_FOR_RECOMMENDATION,
  PERMISSIVE_LICENCES,
  TECH_TOPICS,
  assessLicence,
  assessMaintenance,
  assessRepository,
  collectTechnologyIntelligence,
  estimateEffort,
  securitySignals,
} from "./tech-intel.mjs"

const NOW = Date.parse("2026-11-01T00:00:00Z")
const DAY = 86_400_000

const repo = (overrides = {}) => ({
  full_name: "owner/repo",
  html_url: "https://github.com/owner/repo",
  description: "A description",
  stargazers_count: 100,
  forks_count: 10,
  open_issues_count: 5,
  language: "TypeScript",
  topics: ["x"],
  size: 100,
  archived: false,
  pushed_at: new Date(NOW - 5 * DAY).toISOString(),
  license: { spdx_id: "MIT" },
  ...overrides,
})

const topic = TECH_TOPICS[0]

test("classifies a permissive licence as permitted for commercial use", () => {
  for (const spdx of PERMISSIVE_LICENCES) {
    const result = assessLicence(spdx)
    assert.equal(result.commercialUse, "permitted", `${spdx} should be permitted`)
  }
})

test("classifies a copyleft licence as restricted rather than permitted", () => {
  for (const spdx of COPYLEFT_LICENCES) {
    assert.equal(assessLicence(spdx).commercialUse, "restricted", `${spdx} should be restricted`)
  }
})

test("treats a missing licence as unknown, not as permission", () => {
  const result = assessLicence(null)
  assert.equal(result.commercialUse, "unknown")
  assert.match(result.note, /not permission to use/)
})

test("classifies maintenance by recency with a stated threshold", () => {
  assert.equal(assessMaintenance(repo({ pushed_at: new Date(NOW - 10 * DAY).toISOString() }), NOW).level, "active")
  assert.equal(assessMaintenance(repo({ pushed_at: new Date(NOW - 200 * DAY).toISOString() }), NOW).level, "slowing")
  assert.equal(assessMaintenance(repo({ pushed_at: new Date(NOW - 500 * DAY).toISOString() }), NOW).level, "stale")
})

test("an archived repository is classified as archived regardless of push date", () => {
  const result = assessMaintenance(repo({ archived: true, pushed_at: new Date(NOW - DAY).toISOString() }), NOW)
  assert.equal(result.level, "archived")
  assert.match(result.note, /no updates/)
})

test("security signals flag an archived repository, a missing licence, and staleness", () => {
  const archived = securitySignals(repo({ archived: true }), assessLicence("MIT"), { level: "archived" })
  assert.ok(archived.some((signal) => signal.level === "high"))

  const unlicensed = securitySignals(repo(), assessLicence(null), { level: "active" })
  assert.ok(unlicensed.some((signal) => signal.note.includes("No licence")))

  const stale = securitySignals(repo(), assessLicence("MIT"), { level: "stale" })
  assert.ok(stale.some((signal) => signal.note.includes("over a year")))

  const clean = securitySignals(repo(), assessLicence("MIT"), { level: "active" })
  assert.equal(clean.length, 1)
  assert.equal(clean[0].level, "none")
})

test("estimates effort from repository size as a band, not a number of days", () => {
  assert.equal(estimateEffort(repo({ size: 100 })).band, "low")
  assert.equal(estimateEffort(repo({ size: 5_000 })).band, "medium")
  assert.equal(estimateEffort(repo({ size: 50_000 })).band, "high")
})

test("a well-maintained permissive repository outranks a stale unlicensed one", () => {
  const good = assessRepository(repo(), topic, NOW)
  const bad = assessRepository(
    repo({ license: null, pushed_at: new Date(NOW - 800 * DAY).toISOString(), stargazers_count: 9000 }),
    topic,
    NOW,
  )

  assert.ok(good.recommendationScore > bad.recommendationScore, "signal quality must outweigh popularity")
  assert.equal(good.confidence, "high")
  assert.notEqual(bad.confidence, "high")
})

test("every recommendation states it was not installed or adopted", () => {
  const assessment = assessRepository(repo(), topic, NOW)
  assert.match(assessment.note, /Recommendation only/)
  assert.equal(assessment.topicId, topic.id)
  assert.ok(assessment.rationale.length > 0)
})

test("every topic query is a topic-scoped query, since OR is rejected by the API", () => {
  for (const entry of TECH_TOPICS) {
    assert.ok(Array.isArray(entry.queries) && entry.queries.length > 0, `${entry.id} needs queries`)
    for (const query of entry.queries) {
      assert.ok(!/\bOR\b/.test(query), `${entry.id}: GitHub repository search rejects OR`)
      assert.match(query, /^topic:|^[a-z]/i, `${entry.id}: query should be scoped`)
    }
  }
})

test("without a token the section reports unavailability instead of searching", async () => {
  const result = await collectTechnologyIntelligence({ token: null })

  assert.equal(result.available, false)
  assert.match(result.reason, /GITHUB_TOKEN/)
  assert.deepEqual(result.recommendations, [])
})

test("searches live topics and filters out repositories below the adoption threshold", async (t) => {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    t.skip("GITHUB_TOKEN is not available")
    return
  }

  const result = await collectTechnologyIntelligence({ token, perQuery: 3, minStars: MIN_STARS_FOR_RECOMMENDATION })

  if (!result.available) {
    t.skip(`technology search unavailable: ${result.reason}`)
    return
  }

  assert.ok(result.recommendations.length > 0, "a working search should yield recommendations")
  for (const recommendation of result.recommendations) {
    assert.ok(recommendation.stars >= MIN_STARS_FOR_RECOMMENDATION, "every recommendation must clear the threshold")
  }
  // No repository may appear twice, even when it carries several topics.
  const names = result.recommendations.map((item) => item.fullName)
  assert.equal(new Set(names).size, names.length, "recommendations must be de-duplicated")
})

test("the module contains no installation, clone or write capability", () => {
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "tech-intel.mjs"), "utf8")
  for (const banned of ["execSync", "spawnSync", "child_process", "npm install", "git clone"]) {
    assert.ok(!source.includes(banned), `tech-intel.mjs must not contain "${banned}"`)
  }
})
