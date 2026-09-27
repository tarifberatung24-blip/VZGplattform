/**
 * HORIZON — provider-neutral automation transport.
 *
 * HORIZON hands work to an external orchestrator (Activepieces Cloud now; n8n,
 * Windmill or anything else later) and receives status back. The business logic
 * must not know which one is on the other end, so this module owns the only two
 * things that actually differ between them:
 *
 *   - where the endpoint is and what secret authenticates the call (resolved from
 *     environment, provider-neutral names first, legacy `N8N_*` names as fallback);
 *   - how a request is shaped and how a failure is described.
 *
 * Everything downstream — the queue state machine, the credential-free payload,
 * the lifecycle separation, the idempotency and ownership rules — is unchanged by
 * a transport swap, because none of it lives here.
 *
 * The outbound body is built from the caller's payload verbatim. This module does
 * not add fields, so the "no credential-shaped field leaves the process" guarantee
 * stays where it is enforced (the handoff builder), and swapping transports cannot
 * weaken it.
 */

import { stripForbiddenFields } from "@/lib/horizon/negotiation/guard"

/**
 * The header a shared secret travels in. Deliberately provider-neutral: the
 * receiving orchestrator maps it to whatever its own secret check expects. The
 * legacy `X-FinanzBG-Webhook-Secret` name is kept as an alias on the way out so an
 * existing n8n receiver does not need reconfiguring the moment the URL is renamed.
 */
export const AUTOMATION_SECRET_HEADER = "X-Horizon-Automation-Secret"
export const LEGACY_SECRET_HEADER = "X-FinanzBG-Webhook-Secret"

/** Provider-neutral transport failure codes. A route maps these to HTTP. */
export const AUTOMATION_NOT_CONFIGURED_CODE = "HORIZON_AUTOMATION_NOT_CONFIGURED"
export const AUTOMATION_DELIVERY_FAILED_CODE = "HORIZON_AUTOMATION_DELIVERY_FAILED"

/**
 * The slice of the environment this module reads. Declared structurally rather
 * than as `NodeJS.ProcessEnv` so tests can pass a literal and `process.env` is
 * still assignable.
 */
export type AutomationEnv = Record<string, string | undefined>

export type AutomationTransportConfig = {
  url: string
  secret: string
  /**
   * Which configuration family resolved. `neutral` means both neutral variables
   * were present; `legacy` means both neutral ones were absent and the legacy pair
   * was used instead. The two are never blended — see `resolveAutomationTransport`.
   */
  source: { family: "neutral" | "legacy" }
}

export type AutomationDelivery =
  | { ok: true; status: number; requestId: string }
  | { ok: false; code: string; requestId: string }

/**
 * Resolves the endpoint, validating the scheme the same way the existing
 * service-request route does: https only, except a localhost URL during local
 * development. A malformed or insecure URL is treated as not configured rather
 * than as a hard error, so a typo in an env var disables the handoff instead of
 * sending a payload somewhere unintended.
 *
 * Configuration is resolved pairwise, never blended. A neutral URL with a legacy
 * secret (or the reverse) is a half-finished migration, and silently borrowing the
 * other family's value would send the secret of one receiver to another. So:
 *
 *   - if either neutral variable is present, BOTH neutral variables are required
 *     and a legacy value is never borrowed;
 *   - only when BOTH neutral variables are absent is the legacy pair used, and
 *     then BOTH legacy variables are required.
 *
 * A partial neutral pair therefore resolves to null (handoff disabled) rather
 * than quietly falling back, which surfaces the misconfiguration instead of
 * hiding it.
 */
export function resolveAutomationTransport(
  env: AutomationEnv = process.env,
): AutomationTransportConfig | null {
  const neutralUrl = env.HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL?.trim()
  const neutralSecret = env.HORIZON_AUTOMATION_WEBHOOK_SECRET?.trim()
  const legacyUrl = env.N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL?.trim()
  const legacySecret = env.N8N_WEBHOOK_SECRET?.trim()

  if (neutralUrl || neutralSecret) {
    if (!neutralUrl || !neutralSecret) return null
    if (!isSafeWebhookUrl(neutralUrl)) return null
    return { url: neutralUrl, secret: neutralSecret, source: { family: "neutral" } }
  }

  if (!legacyUrl || !legacySecret) return null
  if (!isSafeWebhookUrl(legacyUrl)) return null
  return { url: legacyUrl, secret: legacySecret, source: { family: "legacy" } }
}

function isSafeWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    return url.protocol === "https:" || local
  } catch {
    return false
  }
}

/**
 * Generates a retry-safe request id.
 *
 * The id is created once per logical handoff and reused across retries of that
 * same handoff, so a receiver that deduplicates on it will not act twice. The
 * `hzn_` prefix is a stable HORIZON marker the callback route also keys on.
 */
export function newAutomationRequestId(): string {
  return `hzn_${crypto.randomUUID()}`
}

/**
 * Posts a payload to the orchestrator.
 *
 * `payload` is sent as-is after a belt-and-braces credential strip, so the
 * transport cannot be the component that leaks a secret even if a caller
 * assembled one by mistake. A non-2xx response and a network failure both become
 * the same provider-neutral `HORIZON_AUTOMATION_DELIVERY_FAILED`, because the
 * caller cannot act differently on the two and a provider-specific message would
 * leak which orchestrator is configured.
 *
 * `fetchImpl` is injectable so the transport is testable without a network.
 */
export async function deliverToAutomation(input: {
  config: AutomationTransportConfig
  payload: Record<string, unknown>
  requestId: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}): Promise<AutomationDelivery> {
  const fetchImpl = input.fetchImpl ?? fetch
  const body = JSON.stringify(stripForbiddenFields(input.payload))
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [AUTOMATION_SECRET_HEADER]: input.config.secret,
    // A stable correlation id, so the receiver can echo it back on the callback
    // and a retry of the same handoff is recognisable as the same request.
    "X-Horizon-Request-Id": input.requestId,
  }
  // The legacy header is sent only when the legacy configuration family is in
  // use — that is the one case where the receiver is an existing n8n deployment
  // that may still expect it. A neutral (e.g. Activepieces) receiver gets the
  // neutral header alone, so the legacy name is not leaked into a newer setup.
  if (input.config.source.family === "legacy") {
    headers[LEGACY_SECRET_HEADER] = input.config.secret
  }

  try {
    const response = await fetchImpl(input.config.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
    })
    if (!response.ok) {
      return { ok: false, code: AUTOMATION_DELIVERY_FAILED_CODE, requestId: input.requestId }
    }
    return { ok: true, status: response.status, requestId: input.requestId }
  } catch {
    return { ok: false, code: AUTOMATION_DELIVERY_FAILED_CODE, requestId: input.requestId }
  }
}

/**
 * Resolves the inbound callback secret. A separate value from the outbound secret
 * so that knowing one does not grant the other, and provider-neutral in the same
 * way. The name introduced earlier in this branch is kept as a fallback so a
 * pre-existing staging configuration does not break.
 */
export function resolveCallbackSecret(env: AutomationEnv = process.env): string | null {
  return (
    env.HORIZON_AUTOMATION_CALLBACK_SECRET?.trim() ||
    env.HORIZON_NEGOTIATION_CALLBACK_SECRET?.trim() ||
    null
  )
}
