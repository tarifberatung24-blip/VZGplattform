#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard for VZGplattform.
 *
 * The deny list in .claude/settings.json only matches the start of a command,
 * so `git push origin main --force` or `cat .env` slip past it. This hook reads
 * the tool call from stdin and blocks it (exit code 2, reason on stderr) when it
 * would break a project hard stop: destructive git or filesystem commands,
 * reading environment files, pushing migrations to production, or writing a
 * secret into a file. Ideas taken from Claude Code Safety Net, Dippy, Gryph and
 * Agent Guard (awesome-claude-code); no third-party code is used.
 *
 * Everything else passes (exit 0). A parse error passes too: the guard must
 * never lock the session, and the settings deny list still applies.
 */

const bashRules = [
  { id: "force-push", re: /\bgit\s+push\b[^\n|;&]*\s(?:--force(?:-with-lease)?|-f)(?=\s|$)/, why: "force push rewrites shared history" },
  { id: "reset-hard", re: /\bgit\s+reset\s+[^\n|;&]*--hard\b/, why: "git reset --hard discards work" },
  { id: "git-clean", re: /\bgit\s+clean\b/, why: "git clean deletes untracked files" },
  { id: "git-stash", re: /\bgit\s+stash\b/, why: "stashing can hide someone else's work" },
  { id: "checkout-discard", re: /\bgit\s+(?:checkout|restore)\s+(?:--\s|\.(?:\s|$)|--worktree\b)/, why: "this discards working-tree changes" },
  { id: "add-all", re: /\bgit\s+add\s+(?:-A|--all|\.)(?=\s|$)/, why: "stage files by name, never everything" },
  { id: "rm-broad", re: /\brm\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*r[a-zA-Z]*\s+(?:-[a-zA-Z]+\s+)*(?:\/|~|\$HOME|\.{1,2}|\*)(?:\/)?(?:\s|$)/, why: "recursive delete of a root, home or working directory" },
  { id: "env-read", re: /(?:^|[\s|;&(])(?:cat|less|more|head|tail|bat|nl|grep|rg|sed|awk|source|\.|cp|xxd|strings)\s+(?:[^\n|;&]*?[\s/'"])?\.env(?!\.example\b)(?:\.[\w.-]+)?(?=[\s'"]|$)/, why: "never read or print .env files" },
  { id: "printenv", re: /(?:^|[\s|;&])(?:printenv|env)\s*(?:$|[|;&])/, why: "dumping the environment can print secrets" },
  { id: "echo-secret", re: /\b(?:echo|printf)\b[^\n|;&]*\$\{?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|SERVICE_ROLE|API_KEY|PRIVATE_KEY)/, why: "never print secret environment values" },
  { id: "supabase-push", re: /\bsupabase\s+(?:db\s+(?:push|reset)|migration\s+repair)\b/, why: "production schema changes go through an owner-approved migration" },
  { id: "sql-destructive", re: /\b(?:psql|supabase)\b[^\n]*\b(?:drop\s+(?:table|schema|database)|truncate\s+table|delete\s+from\s+auth\.)/i, why: "destructive SQL needs explicit owner approval" },
]

const secretRules = [
  { id: "stripe-live", re: /\b[sr]k_live_[0-9A-Za-z]{12,}/ },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: "github-token", re: /\bgh[pousr]_[0-9A-Za-z]{30,}/ },
  { id: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "groq-key", re: /\bgsk_[0-9A-Za-z]{30,}/ },
  { id: "anthropic-key", re: /\bsk-ant-[0-9A-Za-z_-]{20,}/ },
  { id: "openai-key", re: /\bsk-(?:proj-)?[0-9A-Za-z]{32,}/ },
]

const jwtPattern = /\beyJ[0-9A-Za-z_-]{10,}\.(eyJ[0-9A-Za-z_-]{10,})\.[0-9A-Za-z_-]{10,}/g

function hasServiceRoleJwt(text) {
  for (const match of text.matchAll(jwtPattern)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"))
      if (payload && payload.role === "service_role") return true
    } catch {
      // not a JWT we can read; ignore
    }
  }
  return false
}

export function checkBash(command) {
  if (typeof command !== "string") return null
  for (const rule of bashRules) if (rule.re.test(command)) return `${rule.id}: ${rule.why}`
  return null
}

export function checkWrite(filePath, content) {
  const path = typeof filePath === "string" ? filePath.replace(/\\/g, "/") : ""
  const name = path.split("/").pop() ?? ""
  if (/^\.env(?:\..+)?$/.test(name) && name !== ".env.example") return "env-file: never write .env files; secrets live in Render and Supabase"
  if (typeof content !== "string" || !content) return null
  for (const rule of secretRules) if (rule.re.test(content)) return `secret-${rule.id}: this looks like a real credential`
  if (hasServiceRoleJwt(content)) return "secret-service-role-jwt: a Supabase service_role key must never be committed"
  return null
}

export function evaluate(input) {
  const tool = input?.tool_name
  const args = input?.tool_input ?? {}
  if (tool === "Bash") return checkBash(args.command)
  if (tool === "Write") return checkWrite(args.file_path, args.content)
  if (tool === "Edit") return checkWrite(args.file_path, args.new_string)
  if (tool === "MultiEdit") {
    const edits = Array.isArray(args.edits) ? args.edits : []
    return checkWrite(args.file_path, edits.map((edit) => edit?.new_string ?? "").join("\n"))
  }
  if (tool === "NotebookEdit") return checkWrite(args.notebook_path, args.new_source)
  return null
}

async function main() {
  let raw = ""
  for await (const chunk of process.stdin) raw += chunk
  let input
  try {
    input = JSON.parse(raw || "{}")
  } catch {
    process.exit(0)
  }
  const reason = evaluate(input)
  if (reason) {
    process.stderr.write(`Blocked by scripts/claude-guard.mjs (${reason}). See CLAUDE.md "Hard stops"; ask the owner if this is really needed.\n`)
    process.exit(2)
  }
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("claude-guard.mjs")) main()
