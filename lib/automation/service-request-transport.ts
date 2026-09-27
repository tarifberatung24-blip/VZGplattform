export const SERVICE_REQUEST_AUTOMATION_NOT_CONFIGURED =
  "SERVICE_REQUEST_AUTOMATION_NOT_CONFIGURED" as const
export const SERVICE_REQUEST_AUTOMATION_FAILED =
  "SERVICE_REQUEST_AUTOMATION_FAILED" as const

export const AUTOMATION_SECRET_HEADER = "X-Horizon-Automation-Secret"
export const LEGACY_AUTOMATION_SECRET_HEADER = "X-FinanzBG-Webhook-Secret"

export type ServiceRequestAutomationConfig = {
  url: string
  secret: string
  family: "neutral" | "legacy"
}

type AutomationEnv = Record<string, string | undefined>

function safeWebhookUrl(raw: string) {
  try {
    const url = new URL(raw)
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    return url.protocol === "https:" || local
  } catch {
    return false
  }
}

/**
 * Resolve a provider-neutral pair first. A partial neutral pair fails closed and
 * never borrows a legacy n8n value; legacy fallback is used only when both neutral
 * variables are absent.
 */
export function resolveServiceRequestAutomation(
  env: AutomationEnv = process.env,
): ServiceRequestAutomationConfig | null {
  const neutralUrl = env.HORIZON_AUTOMATION_SERVICE_REQUEST_WEBHOOK_URL?.trim()
  const neutralSecret = env.HORIZON_AUTOMATION_WEBHOOK_SECRET?.trim()
  const legacyUrl = env.N8N_OFFER_REQUEST_WEBHOOK_URL?.trim()
  const legacySecret = env.N8N_WEBHOOK_SECRET?.trim()

  if (neutralUrl || neutralSecret) {
    if (!neutralUrl || !neutralSecret || !safeWebhookUrl(neutralUrl)) return null
    return { url: neutralUrl, secret: neutralSecret, family: "neutral" }
  }

  if (!legacyUrl || !legacySecret || !safeWebhookUrl(legacyUrl)) return null
  return { url: legacyUrl, secret: legacySecret, family: "legacy" }
}

export function serviceRequestAutomationHeaders(config: ServiceRequestAutomationConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [AUTOMATION_SECRET_HEADER]: config.secret,
  }
  if (config.family === "legacy") {
    headers[LEGACY_AUTOMATION_SECRET_HEADER] = config.secret
  }
  return headers
}
