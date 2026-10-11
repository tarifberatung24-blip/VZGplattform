import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { checkBash, checkWrite, evaluate } from "./claude-guard.mjs"

// Sample credentials are assembled at runtime so this file never contains one.
const fake = (...parts) => parts.join("")
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url")

test("blocks destructive git commands anywhere in the line", () => {
  for (const command of [
    "git push origin main --force",
    "git push -f origin feat/x",
    "git push --force-with-lease",
    "cd repo && git reset --hard origin/main",
    "git clean -fdx",
    "git stash push -m tmp",
    "git checkout -- app/page.tsx",
    "git restore .",
    "git add .",
    "git add -A",
  ]) assert.ok(checkBash(command), command)
})

test("allows normal git work", () => {
  for (const command of [
    "git status --short",
    "git add components/a.tsx messages/bg.json",
    "git commit -m 'fix: x'",
    "git push -u origin feat/x",
    "git checkout -b feat/new origin/main",
    "git diff --check",
    "git log --oneline -3",
  ]) assert.equal(checkBash(command), null, command)
})

test("blocks broad recursive deletes but not scoped ones", () => {
  for (const command of ["rm -rf /", "rm -rf ~", "rm -rf .", "rm -rf *", "rm -fr $HOME"]) assert.ok(checkBash(command), command)
  for (const command of ["rm -rf node_modules/.cache", "rm -f tmp/a.png", "rm -rf /tmp/claude-0/rev-wt"]) assert.equal(checkBash(command), null, command)
})

test("never reads or prints environment secrets", () => {
  for (const command of ["cat .env", "head -5 .env.local", "grep KEY ./.env.production", "source .env", "printenv", "env | sort", "echo $SUPABASE_SERVICE_ROLE_KEY", "printf '%s' ${STRIPE_SECRET_KEY}"]) {
    assert.ok(checkBash(command), command)
  }
  for (const command of ["cat .env.example", "grep -n AFFILIATE .env.example", "echo $HOME", "node scripts/terra-preflight.mjs"]) assert.equal(checkBash(command), null, command)
})

test("keeps production schema changes behind the owner", () => {
  assert.ok(checkBash("supabase db push"))
  assert.ok(checkBash("supabase db reset --linked"))
  assert.ok(checkBash("psql $DB -c 'drop table public.cases'"))
  assert.equal(checkBash("supabase migration new add_x"), null)
})

test("blocks secrets and env files in written content", () => {
  assert.ok(checkWrite("lib/x.ts", `const k = "${fake("sk_", "live_", "a".repeat(24))}"`))
  assert.ok(checkWrite("lib/x.ts", fake("-----BEGIN ", "PRIVATE KEY-----")))
  assert.ok(checkWrite("lib/x.ts", fake("ghp", "_", "b".repeat(36))))
  const jwt = `eyJ${b64({ alg: "HS256" }).slice(3)}.${b64({ role: "service_role", iss: "supabase" })}.${"c".repeat(20)}`
  assert.ok(checkWrite("lib/x.ts", `const key = "${jwt}"`))
  assert.ok(checkWrite(".env.local", "A=1"))
  assert.ok(checkWrite("C:\\repo\\.env", "A=1"))
})

test("allows ordinary code, anon keys and the env example", () => {
  const anon = `eyJ${b64({ alg: "HS256" }).slice(3)}.${b64({ role: "anon", iss: "supabase" })}.${"d".repeat(20)}`
  assert.equal(checkWrite("lib/x.ts", `const anon = "${anon}"`), null)
  assert.equal(checkWrite(".env.example", "AFFILIATE_OPERATOR_SECRET="), null)
  assert.equal(checkWrite("app/page.tsx", "export default function Page() { return null }"), null)
})

test("routes each tool to the right check", () => {
  assert.ok(evaluate({ tool_name: "Bash", tool_input: { command: "git add ." } }))
  assert.ok(evaluate({ tool_name: "Edit", tool_input: { file_path: "a.ts", new_string: fake("sk_", "live_", "e".repeat(20)) } }))
  assert.ok(evaluate({ tool_name: "MultiEdit", tool_input: { file_path: ".env", edits: [] } }))
  assert.equal(evaluate({ tool_name: "Read", tool_input: { file_path: "README.md" } }), null)
})

test("as a hook: exit 2 with a reason when blocked, exit 0 otherwise or on bad input", () => {
  const run = (stdin) => spawnSync(process.execPath, ["scripts/claude-guard.mjs"], { input: stdin, encoding: "utf8" })
  const blocked = run(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git push --force" } }))
  assert.equal(blocked.status, 2)
  assert.match(blocked.stderr, /force-push/)
  assert.equal(run(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git status" } })).status, 0)
  assert.equal(run("not json").status, 0)
})
