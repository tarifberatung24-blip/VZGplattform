#!/usr/bin/env node
/**
 * Tests for redaction (scripts/steward/redact.mjs).
 *
 * Redaction is the boundary that decides what leaves the sandbox, so these tests
 * assert both directions: that a secret is removed, and that ordinary text is
 * left alone. A redactor that mangles every report is as useless as one that
 * leaks, and only the second kind of failure is loud.
 *
 * Usage: node --test scripts/steward/redact.test.mjs
 */

import assert from "node:assert/strict"
import test from "node:test"

import {
  REDACTION_MARK,
  collectSecretValues,
  redact,
  redactDeep,
  redactWithReport,
} from "./redact.mjs"

test("removes the exact value of a known secret environment variable", () => {
  const env = { GITHUB_TOKEN: "ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH1234" }
  const input = `Authorization failed for token ${env.GITHUB_TOKEN} while calling the API`
  const output = redact(input, { env })

  assert.ok(!output.includes(env.GITHUB_TOKEN), "the token value must not survive")
  assert.ok(output.includes(REDACTION_MARK))
  assert.ok(output.includes("Authorization failed"), "surrounding text must remain")
})

test("removes a secret supplied explicitly, not only from the environment", () => {
  const secret = "super-secret-value-1234567890"
  const output = redact(`leaked: ${secret}`, { secrets: [secret] })

  assert.ok(!output.includes(secret))
  assert.ok(output.includes(REDACTION_MARK))
})

test("ignores short environment values so ordinary words are not mangled", () => {
  // A two-character value would match inside normal prose; redacting it would
  // corrupt the report while protecting nothing.
  const env = { CRON_SECRET: "on" }
  const output = redact("The notification cron is on and sending is on", { env })

  assert.equal(output, "The notification cron is on and sending is on")
})

test("removes a GitHub token by shape even when it is not in the environment", () => {
  const token = "ghp_1234567890abcdefghijklmnopqrstuvwx"
  const output = redact(`see ${token} for details`)

  assert.ok(!output.includes(token))
  assert.ok(output.includes(REDACTION_MARK))
})

test("removes a bearer header, a JWT, and a private key block", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1g"
  const keyBlock = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----"
  const output = redact(`Bearer abcdefghijklmnopqrstuvwxyz ${jwt}\n${keyBlock}`)

  assert.ok(!output.includes("abcdefghijklmnopqrstuvwxyz"))
  assert.ok(!output.includes(jwt))
  assert.ok(!output.includes("MIIEowIBAAKCAQEA"))
  assert.ok(output.includes(REDACTION_MARK))
})

test("removes a credential carried as a query parameter but keeps the parameter name", () => {
  const output = redact("https://example.test/hook?token=abcdef123456&other=keep")

  assert.ok(!output.includes("abcdef123456"))
  assert.ok(output.includes("token="))
  assert.ok(output.includes("other=keep"), "an unrelated parameter must survive")
})

test("removes email addresses, which are personal data", () => {
  const output = redact("contact tarifberatung24@gmail.com for details")

  assert.ok(!output.includes("tarifberatung24@gmail.com"))
  assert.ok(output.includes(REDACTION_MARK))
})

test("reports which rule fired, so a test can prove the mechanism not just the outcome", () => {
  const { hits } = redactWithReport("leaked value ghp_1234567890abcdefghijklmnopqrstuvwx here")
  const rules = hits.map((hit) => hit.rule)

  assert.ok(rules.includes("github_token"), `expected github_token in ${JSON.stringify(rules)}`)
})

test("a token written after the word 'token' is still removed", () => {
  // The authorization-header rule fires first here and consumes the token, so
  // the github_token rule never sees it. Both outcomes are correct; this asserts
  // the token is gone rather than which rule removed it.
  const token = "ghp_1234567890abcdefghijklmnopqrstuvwx"
  const { text, hits } = redactWithReport(`token ${token}`)

  assert.ok(!text.includes(token), "the token must be removed regardless of which rule matched")
  assert.ok(hits.length > 0, "at least one rule must have fired")
})

test("leaves ordinary German and Bulgarian report prose untouched", () => {
  const prose =
    "Die Sozialversicherungsentgeltverordnung wurde geändert. Betroffene Themen: Rente, Beiträge. Публикувано в Bundesgesetzblatt."
  assert.equal(redact(prose), prose)
})

test("redacts nested structures without changing their shape", () => {
  const input = {
    findings: [{ title: "ok", link: "https://x.test/?key=abcdef123456" }],
    nested: { list: ["ghp_1234567890abcdefghijklmnopqrstuvwx", 42, true, null] },
  }
  const output = redactDeep(input)

  assert.equal(output.findings.length, 1)
  assert.equal(output.findings[0].title, "ok")
  assert.ok(!JSON.stringify(output).includes("abcdef123456"))
  assert.ok(!JSON.stringify(output).includes("ghp_1234567890abcdefghijklmnopqrstuvwx"))
  assert.equal(output.nested.list[1], 42)
  assert.equal(output.nested.list[2], true)
  assert.equal(output.nested.list[3], null)
})

test("collects values longest-first so an overlapping secret is fully removed", () => {
  const values = collectSecretValues({ GITHUB_TOKEN: "abcdefgh", GH_TOKEN: "abcdefghijklmnop" })
  assert.equal(values[0].length >= values[values.length - 1].length, true)
})

test("a value that appears several times is removed every time", () => {
  const env = { OPENROUTER_API_KEY: "sk-or-v1-abcdefghijklmnopqrstuvwxyz" }
  const output = redact(`${env.OPENROUTER_API_KEY} then ${env.OPENROUTER_API_KEY}`, { env })

  assert.ok(!output.includes(env.OPENROUTER_API_KEY))
  assert.equal(output.split(REDACTION_MARK).length - 1, 2)
})

test("handles non-string input without throwing", () => {
  assert.equal(redact(null), "")
  assert.equal(redact(undefined), "")
  assert.equal(redact(123), "")
})
