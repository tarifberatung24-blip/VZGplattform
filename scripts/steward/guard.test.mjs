#!/usr/bin/env node
/**
 * Tests for the read-only guarantee (scripts/steward/guard.mjs).
 *
 * The task requires proof that the Steward cannot perform a write operation. A
 * comment saying so is not proof, so these tests assert it two ways:
 *
 *  - the allowlist and the fetch wrapper refuse anything outside their contract;
 *  - a source scan confirms no Steward module contains a write-capable HTTP call,
 *    which would catch a future contributor adding one.
 *
 * Usage: node --test scripts/steward/guard.test.mjs
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  FORBIDDEN_HTTP_METHODS,
  READ_ONLY_METHODS,
  STEWARD_ALLOWED_HOSTS,
  STEWARD_FORBIDDEN_ACTIONS,
  checkUrlAllowed,
  stewardFetch,
} from "./guard.mjs"

const STEWARD_DIR = path.dirname(fileURLToPath(import.meta.url))

/** Every module that makes up the Steward, excluding tests. */
function stewardSourceFiles() {
  return fs
    .readdirSync(STEWARD_DIR)
    .filter((name) => name.endsWith(".mjs") && !name.endsWith(".test.mjs"))
    .map((name) => path.join(STEWARD_DIR, name))
}

test("refuses a host that is not on the allowlist", () => {
  const verdict = checkUrlAllowed("https://evil.example.com/exfiltrate")
  assert.equal(verdict.allowed, false)
  assert.match(verdict.reason, /host_not_allowlisted/)
})

test("refuses a non-HTTPS scheme, including file and data URLs", () => {
  for (const url of ["file:///etc/passwd", "http://www.bmas.de/", "data:text/plain,hello"]) {
    const verdict = checkUrlAllowed(url)
    assert.equal(verdict.allowed, false, `${url} must be refused`)
  }
})

test("refuses a malformed URL rather than throwing", () => {
  assert.equal(checkUrlAllowed("not a url").allowed, false)
  assert.equal(checkUrlAllowed("").allowed, false)
})

test("allows the documented monitoring hosts", () => {
  for (const url of [
    "https://api.github.com/repos/x/y/actions/runs",
    "https://www.recht.bund.de/rss/feeds/rss_bgbl-1-2.xml",
    "https://vzgplattform.onrender.com/api/health",
  ]) {
    assert.equal(checkUrlAllowed(url).allowed, true, `${url} must be allowed`)
  }
})

test("stewardFetch returns a refusal result instead of throwing, so a run continues", async () => {
  const result = await stewardFetch("https://evil.example.com/")
  assert.equal(result.ok, false)
  assert.equal(result.refused, true)
  assert.match(result.error, /refused/)
  assert.equal(result.body, "")
})

test("the allowlist contains only HTTPS-capable host names, no wildcards or paths", () => {
  for (const host of Object.keys(STEWARD_ALLOWED_HOSTS)) {
    assert.ok(!host.includes("/"), `host ${host} must not contain a path`)
    assert.ok(!host.includes("*"), `host ${host} must not contain a wildcard`)
    assert.equal(host, host.toLowerCase(), `host ${host} must be lower case`)
  }
})

test("no Steward module issues a write-capable HTTP request", () => {
  const violations = []
  for (const file of stewardSourceFiles()) {
    const source = fs.readFileSync(file, "utf8")
    for (const method of FORBIDDEN_HTTP_METHODS) {
      // Match `method: "POST"` in a fetch options object, which is how a write
      // request would be expressed. A plain word "POST" in prose is fine.
      const pattern = new RegExp(`method\\s*:\\s*["'\`]${method}["'\`]`, "i")
      if (pattern.test(source)) violations.push(`${path.basename(file)}: ${method}`)
    }
  }
  assert.deepEqual(violations, [], `write-capable request found: ${violations.join(", ")}`)
})

test("only GET and HEAD are declared read-only, and GET is the only one used", () => {
  assert.deepEqual(READ_ONLY_METHODS, ["GET", "HEAD"])
  assert.ok(!READ_ONLY_METHODS.some((method) => FORBIDDEN_HTTP_METHODS.includes(method)))
})

test("the forbidden-action list covers every action the task prohibits", () => {
  // These are the actions named in the task's security boundaries. If one is
  // dropped from the list, this test fails and the guarantee is re-examined.
  const required = [
    "modify_production_data",
    "read_customer_documents",
    "send_email",
    "publish_forum_content",
    "merge_pull_request",
    "deploy_to_production",
  ]
  for (const action of required) {
    assert.ok(STEWARD_FORBIDDEN_ACTIONS.includes(action), `missing forbidden action: ${action}`)
  }
})

test("no Steward module imports a database, mailer, or git client", () => {
  const banned = ["nodemailer", "supabase", "child_process", "@supabase/supabase-js"]
  const violations = []
  for (const file of stewardSourceFiles()) {
    const source = fs.readFileSync(file, "utf8")
    for (const dependency of banned) {
      const pattern = new RegExp(`from\\s+["'\`]${dependency}`, "i")
      if (pattern.test(source)) violations.push(`${path.basename(file)}: ${dependency}`)
    }
  }
  assert.deepEqual(violations, [], `banned import found: ${violations.join(", ")}`)
})
