/**
 * Structural read-only guarantee for the HORIZON System Steward.
 *
 * The Steward's first version must not be able to change anything, and that must
 * be provable rather than promised. Two controls enforce it in code:
 *
 *  1. An outbound host allowlist. The Steward can only reach hosts named here,
 *     so it cannot be pointed at an arbitrary endpoint by a source it reads.
 *  2. A GET-only fetch wrapper. There is no exported method that issues a write
 *     request, so no monitor can perform one even if its logic is wrong.
 *
 * The forbidden-action list below is checked by a test, not by the model. A
 * prompt instruction is not a control; a missing code path is.
 *
 * The allowlist is a *permission* boundary, not a reachability claim. Some hosts
 * listed here (gesetze-im-internet.de, bmi.bund.de) are unreachable from a
 * restricted sandbox but reachable from a normal network. The monitors record
 * per-source reachability, so a blocked host appears in the report as an
 * unavailable source rather than as a silent gap.
 */

import { fetchJson, fetchText } from "./fetch.mjs"

/** Hosts the Steward is permitted to contact, with the reason each is present. */
export const STEWARD_ALLOWED_HOSTS = {
  "api.github.com": "GitHub REST API: workflow runs, repository metadata",
  "github.com": "GitHub repository pages referenced in recommendations",
  "www.recht.bund.de": "Bundesgesetzblatt (official promulgation platform)",
  "www.gesetze-im-internet.de": "Gesetze im Internet (BMJ consolidated federal law)",
  "www.bmi.bund.de": "Bundesministerium des Innern",
  "www.bmas.de": "Bundesministerium fuer Arbeit und Soziales",
  "www.bundesfinanzministerium.de": "Bundesministerium der Finanzen",
  "www.bamf.de": "Bundesamt fuer Migration und Fluechtlinge",
  "www.arbeitsagentur.de": "Bundesagentur fuer Arbeit",
  "www.bundestag.de": "Deutscher Bundestag (legislative process)",
  "www.bundesregierung.de": "Bundesregierung (cabinet decisions)",
  "www.destatis.de": "Statistisches Bundesamt",
  "eur-lex.europa.eu": "EUR-Lex (EU official publications)",
  "vzgplattform.onrender.com": "The HORIZON production deployment under observation",
}

/** HTTP methods that cannot change remote state. The wrapper uses only these. */
export const READ_ONLY_METHODS = ["GET", "HEAD"]

/**
 * Actions the Steward must never perform in V1. A test asserts that no module
 * under scripts/steward imports or names a capability that would perform one.
 */
export const STEWARD_FORBIDDEN_ACTIONS = [
  "modify_production_data",
  "read_customer_documents",
  "send_email",
  "send_external_message",
  "submit_government_form",
  "sign_contract",
  "publish_forum_content",
  "modify_supabase_schema",
  "change_environment_variables",
  "merge_pull_request",
  "deploy_to_production",
  "execute_customer_action",
]

/** Methods that would indicate a write path if they appeared in the source. */
export const FORBIDDEN_HTTP_METHODS = ["POST", "PUT", "PATCH", "DELETE"]

/**
 * Decide whether a URL may be requested.
 *
 * Returns `{ allowed, reason }`. Non-HTTP schemes are refused so a `file:` or
 * `data:` URL cannot be used to read local state.
 */
export function checkUrlAllowed(rawUrl, allowedHosts = STEWARD_ALLOWED_HOSTS) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { allowed: false, reason: "malformed_url" }
  }

  if (parsed.protocol !== "https:") {
    return { allowed: false, reason: `scheme_not_allowed:${parsed.protocol.replace(":", "")}` }
  }

  const host = parsed.hostname.toLowerCase()
  if (!Object.prototype.hasOwnProperty.call(allowedHosts, host)) {
    return { allowed: false, reason: `host_not_allowlisted:${host}` }
  }

  return { allowed: true, reason: "ok", host }
}

/** Raised when a request is refused before it leaves the process. */
export class OutboundRequestRefused extends Error {
  constructor(url, reason) {
    super(`Refused outbound request to ${url}: ${reason}`)
    this.name = "OutboundRequestRefused"
    this.reason = reason
  }
}

/**
 * A GET-only, allowlisted wrapper around the bounded HTTP client.
 *
 * A refused request returns `{ ok: false, error }` rather than throwing, so one
 * blocked source does not end the run. The refusal is recorded in the report,
 * which is the point: a source the Steward is not allowed to reach should be
 * visible, not silent.
 */
export async function stewardFetch(url, options = {}) {
  const verdict = checkUrlAllowed(url, options.allowedHosts)
  if (!verdict.allowed) {
    return {
      ok: false,
      status: 0,
      url,
      finalUrl: url,
      contentType: "",
      body: "",
      bytes: 0,
      elapsedMs: 0,
      data: null,
      error: `refused: ${verdict.reason}`,
      refused: true,
    }
  }

  return options.json ? fetchJson(url, options) : fetchText(url, options)
}

export { OutboundRequestRefused as RequestRefused }
