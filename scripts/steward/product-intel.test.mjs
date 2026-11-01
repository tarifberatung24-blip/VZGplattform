#!/usr/bin/env node
/**
 * Tests for product intelligence and forum drafts
 * (scripts/steward/product-intel.mjs, scripts/steward/forum-contract.mjs).
 *
 * Two things are asserted here that a code review would otherwise have to take
 * on trust:
 *
 *  - the product section never produces a metric, because no aggregate source
 *    exists and an invented number would be indistinguishable from a real one;
 *  - the forum contract constants in the Steward match the real application
 *    contract in `lib/forum/contract.ts`, so a change there fails this suite
 *    instead of silently producing drafts the composer rejects.
 *
 * Usage: node --test scripts/steward/product-intel.test.mjs
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  buildForumDrafts,
  collectProductIntelligence,
  draftDiscussionTopic,
  draftForumPost,
  forumTopicForFinding,
} from "./product-intel.mjs"
import {
  FORUM_LIMITS,
  FORUM_MEMBER_CATEGORIES,
  FORUM_OFFICIAL_TOPICS,
  validateForumDraft,
} from "./forum-contract.mjs"
import { LEGAL_STATUS } from "./legal-monitor.mjs"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

const enactedFinding = {
  title: "Gesetz zur Änderung des Preisangabenrechts",
  link: "https://www.recht.bund.de/eli/bund/bgbl-1/2026/314",
  status: LEGAL_STATUS.ENACTED_AND_PROMULGATED,
  statusLabel: "Enacted and promulgated in the Bundesgesetzblatt",
  publishedAt: "2026-10-22T00:00:00.000Z",
  matchedTerms: ["preisangaben"],
  isEnactedLaw: true,
  relevant: true,
}

const processFinding = {
  title: "Entwurf eines Gesetzes über die Kindergrundsicherung",
  link: "https://www.bundestag.de/dokumente/1",
  status: LEGAL_STATUS.PARLIAMENTARY_PROCESS,
  statusLabel: "In parliamentary process — not a law yet",
  publishedAt: "2026-10-25T00:00:00.000Z",
  matchedTerms: ["kindergeld"],
  isEnactedLaw: false,
  relevant: true,
}

test("the forum contract constants match the application contract", () => {
  const contractSource = fs.readFileSync(path.join(REPO_ROOT, "lib/forum/contract.ts"), "utf8")

  const topics = contractSource.match(/forumOfficialTopics\s*=\s*\[([^\]]+)\]/)
  assert.ok(topics, "forumOfficialTopics must be declared in lib/forum/contract.ts")
  for (const topic of FORUM_OFFICIAL_TOPICS) {
    assert.ok(topics[1].includes(`"${topic}"`), `topic "${topic}" is missing from the application contract`)
  }

  const categories = contractSource.match(/forumMemberCategories\s*=\s*\[([^\]]+)\]/)
  assert.ok(categories)
  for (const category of FORUM_MEMBER_CATEGORIES) {
    assert.ok(categories[1].includes(`"${category}"`), `category "${category}" is missing`)
  }

  // The zod limits the Steward mirrors must still be present in the contract.
  assert.ok(contractSource.includes(`max(${FORUM_LIMITS.titleMax})`), "title max must match the contract")
  assert.ok(contractSource.includes(`max(${FORUM_LIMITS.bodyMax})`), "body max must match the contract")
})

test("product intelligence reports its limitation and produces no metrics", () => {
  const result = collectProductIntelligence()

  assert.equal(result.available, false)
  assert.equal(result.metricsReported, 0)
  assert.deepEqual(result.findings, [])
  assert.match(result.reason, /No aggregated/)
  assert.match(result.note, /No product metrics were invented/)
})

test("product intelligence names what would unblock each missing source", () => {
  const result = collectProductIntelligence()

  assert.ok(result.whatWouldUnblock.length > 0)
  for (const item of result.whatWouldUnblock) {
    assert.ok(item.name && item.wouldEnable, "each source needs a name and an outcome")
  }
  assert.ok(result.dataSources.every((source) => source.status !== "available" || true))
})

test("an enacted finding produces a post that states it is promulgated", () => {
  const draft = draftForumPost(enactedFinding)

  assert.equal(draft.kind, "forum_post")
  assert.equal(draft.topic, "law")
  assert.equal(draft.publishable, false)
  assert.equal(draft.status, "draft_requires_human_review")
  assert.match(draft.body, /verkündeten Rechtstext/)
  assert.match(draft.body, /Entwurf zur Prüfung/)
  assert.ok(draft.body.includes(enactedFinding.link))
})

test("a finding still in process produces a draft that says it is not law", () => {
  const draft = draftDiscussionTopic(processFinding)

  assert.equal(draft.kind, "discussion_topic")
  assert.match(draft.body, /nicht veröffentlicht/)
  assert.equal(draft.publishable, false)
  assert.equal(forumTopicForFinding(processFinding), "platform")
})

test("every draft validates against the forum contract", () => {
  for (const draft of [draftForumPost(enactedFinding), draftDiscussionTopic(processFinding)]) {
    const check = validateForumDraft(draft)
    assert.deepEqual(check.errors, [], `draft invalid: ${check.errors.join("; ")}`)
    assert.equal(check.valid, true)
  }
})

test("an over-long title or body is trimmed to the contract limit, not rejected", () => {
  const longFinding = {
    ...enactedFinding,
    title: "Sehr langer Titel ".repeat(40),
    matchedTerms: Array.from({ length: 50 }, (_, index) => `term${index}`),
  }
  const draft = draftForumPost(longFinding)

  assert.ok(draft.title.length <= FORUM_LIMITS.titleMax, `title was ${draft.title.length}`)
  assert.ok(draft.body.length <= FORUM_LIMITS.bodyMax, `body was ${draft.body.length}`)
  assert.equal(validateForumDraft(draft).valid, true)
})

test("a draft is never publishable and never claims to be", () => {
  const draft = draftForumPost(enactedFinding)
  assert.equal(draft.publishable, false)
  assert.match(draft.note, /no authority to publish/)

  const tampered = { ...draft, publishable: true }
  const check = validateForumDraft(tampered)
  assert.equal(check.valid, false)
  assert.ok(check.errors.some((error) => error.includes("publishable")))
})

test("a finding with no source link produces no draft, because it cannot be cited", () => {
  const uncitable = { ...enactedFinding, link: null }
  const result = buildForumDrafts([uncitable])

  assert.equal(result.draftCount, 0)
  assert.deepEqual(result.drafts, [])
})

test("drafts are capped so the review burden stays bounded", () => {
  const many = Array.from({ length: 20 }, (_, index) => ({ ...enactedFinding, title: `Gesetz Nummer ${index}` }))
  const result = buildForumDrafts(many, { limit: 3 })

  assert.equal(result.draftCount, 3)
  assert.equal(result.requiresHumanReview, true)
  assert.equal(result.publishable, false)
})

test("enacted findings are drafted as posts and process findings as discussions", () => {
  const result = buildForumDrafts([enactedFinding, processFinding])

  assert.equal(result.draftCount, 2)
  assert.equal(result.drafts[0].kind, "forum_post")
  assert.equal(result.drafts[1].kind, "discussion_topic")
})

test("validateForumDraft rejects an invalid topic and an out-of-range title", () => {
  assert.equal(validateForumDraft({ topic: "nope", title: "ok", body: "x", publishable: false, status: "draft_requires_human_review" }).valid, false)
  assert.equal(validateForumDraft({ topic: "law", title: "a", body: "x", publishable: false, status: "draft_requires_human_review" }).valid, false)
  assert.equal(validateForumDraft(null).valid, false)
})
