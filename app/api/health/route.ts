import { NextResponse } from "next/server"
import { isAwinConfigured } from "@/lib/affiliate/awin"
import { readSmtpConfig } from "@/lib/horizon/send/smtp-config"

export const dynamic = "force-dynamic"

/**
 * Whether a signed automation webhook is configured.
 *
 * Mirrors the check the service-request route makes before handing a request off,
 * so this probe reports the same truth the route acts on. An `http://` URL is
 * refused here exactly as it is there, because a request payload carries customer
 * data.
 */
function isAutomationWebhookConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.AUTOMATION_WEBHOOK_URL?.trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    return url.protocol === "https:" || local
  } catch {
    return false
  }
}

export async function GET() {
  // Liveness and capability are reported separately on purpose. `status` answers
  // "is this process serving?", which is what a restart probe needs, and must not
  // depend on an integration being configured. `capabilities` answers "what can
  // this deployment actually do?", so a missing SMTP credential is visible as
  // `send: false` instead of hiding behind an unqualified "ok". Booleans only —
  // no host, no username, no key is ever read into the response.
  const smtp = readSmtpConfig()

  return NextResponse.json({
    status: "ok",
    revision: process.env.RENDER_GIT_COMMIT ?? "unknown",
    integrations: { awin: isAwinConfigured() },
    capabilities: {
      send: smtp.ok,
      automationHandoff: isAutomationWebhookConfigured(),
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
