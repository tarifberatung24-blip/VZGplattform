/**
 * Secret and personal-data redaction for the HORIZON System Steward.
 *
 * The Steward writes what it finds into a report that is stored as a build
 * artifact and read by a person. Anything that reaches that report has left the
 * sandbox, so redaction happens at one boundary rather than at every call site:
 * text passes through `redact` before it is serialized.
 *
 * Two mechanisms, because they catch different leaks:
 *  - exact values of known secret environment variables, so a token copied into
 *    an error message is removed even though it has no recognizable shape;
 *  - shape patterns, so a credential that arrives from an external response or
 *    a log line is removed even though it is not in this process's environment.
 *
 * Redaction is deliberately lossy. Over-redacting a report is a cosmetic
 * problem; under-redacting it is a disclosure.
 */

/** Environment variables whose *values* are always removed from output. */
const SECRET_ENV_NAMES = [
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "GITHUB_PERSONAL_ACCESS_TOKEN",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_MANAGEMENT_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENHANDS_API_KEY",
  "OpenHands_LOKAL_KEY",
  "RENDER_API_KEY",
  "NOTIFICATIONS_CRON_SECRET",
  "CRON_SECRET",
  "AWIN_API_TOKEN",
  "TAVILY_API_KEY",
  "SMTP_PASSWORD",
  "SMTP_URL",
]

/** A value shorter than this is not treated as a secret: redacting "true" or "1"
 *  would mangle ordinary prose while removing nothing sensitive. */
const MIN_SECRET_LENGTH = 8

export const REDACTION_MARK = "[REDACTED]"

const SHAPE_RULES = [
  {
    id: "authorization_header",
    pattern: /\b(bearer|token)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replace: (_m, scheme) => `${scheme} ${REDACTION_MARK}`,
  },
  { id: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9]{16,}\b/g },
  { id: "github_pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: "openai_key", pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { id: "slack_token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "google_key", pattern: /\bAIza[A-Za-z0-9_-]{30,}\b/g },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g },
  {
    id: "private_key_block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    id: "credential_query_parameter",
    pattern: /([?&](?:token|key|api[-_]?key|access[-_]?token|secret|signature|sig|password)=)[^&\s"'<>]+/gi,
    replace: (_m, prefix) => `${prefix}${REDACTION_MARK}`,
  },
  { id: "email_address", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
]

function replaceAll(haystack, needle, replacement) {
  // split/join rather than RegExp so a secret containing regex metacharacters
  // (a base64 value with +, / or =) is still matched literally.
  return haystack.split(needle).join(replacement)
}

/**
 * Values that must never appear in output: the contents of known secret
 * environment variables, plus any caller-supplied extra secrets.
 */
export function collectSecretValues(env = {}, extra = []) {
  const values = new Set()
  for (const name of SECRET_ENV_NAMES) {
    const value = env[name]
    if (typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH) {
      values.add(value)
      values.add(value.trim())
    }
  }
  for (const value of extra) {
    if (typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH) {
      values.add(value)
      values.add(value.trim())
    }
  }
  // Longest first so a token that contains a shorter token is fully removed.
  return [...values].sort((a, b) => b.length - a.length)
}

/**
 * Redact a single string. Returns the cleaned text and a per-rule hit count so a
 * test can prove which rule fired rather than only that the output changed.
 */
export function redactWithReport(input, options = {}) {
  if (typeof input !== "string" || input === "") {
    return { text: typeof input === "string" ? input : "", hits: [] }
  }

  let text = input
  const hits = []

  for (const value of collectSecretValues(options.env ?? {}, options.secrets ?? [])) {
    if (text.includes(value)) {
      const count = text.split(value).length - 1
      text = replaceAll(text, value, REDACTION_MARK)
      hits.push({ rule: "secret_env_value", count })
    }
  }

  for (const rule of SHAPE_RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
    const matches = text.match(pattern)
    if (!matches || matches.length === 0) continue
    text = rule.replace
      ? text.replace(pattern, rule.replace)
      : text.replace(pattern, REDACTION_MARK)
    hits.push({ rule: rule.id, count: matches.length })
  }

  return { text, hits }
}

/** Redact a string. */
export function redact(input, options = {}) {
  return redactWithReport(input, options).text
}

/** Redact every string inside a JSON-like value, preserving structure. */
export function redactDeep(value, options = {}) {
  if (typeof value === "string") return redact(value, options)
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, options))
  if (value && typeof value === "object") {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      // A key can carry a secret too (a URL with a token as a query string).
      out[redact(key, options)] = redactDeep(item, options)
    }
    return out
  }
  return value
}

export const REDACTION_RULE_IDS = SHAPE_RULES.map((rule) => rule.id)
export { SECRET_ENV_NAMES, MIN_SECRET_LENGTH }
