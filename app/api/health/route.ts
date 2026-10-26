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

/**
 * Whether the app's Google OAuth client is configured, which is the gate for a
 * user connecting their own mailbox and sending from it.
 *
 * `createGoogleProvider` returns `null` when no connection row exists, so an
 * unconfigured OAuth client and a signed-in user who simply has not connected a
 * mailbox are indistinguishable from the outside. This probe reports the *app*
 * capability only; whether any individual user has connected is per-user data and
 * does not belong in a public response.
 */
function isGoogleSenderConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim())
}

export async function GET() {
  const smtp = readSmtpConfig()

  return NextResponse.json({
    status: "ok",
    revision: process.env.RENDER_GIT_COMMIT ?? "unknown",
    integrations: { awin: isAwinConfigured() },
    capabilities: {
      // Two transports exist: a server-side relay and a signed-in user's own
      // connected mailbox. `smtp` names only the first, so an operator must not
      // read `smtp: false` as "this deployment cannot send at all".
      smtp: smtp.ok,
      // Variable names only, never values: exactly what an operator has to set.
      smtpMissingEnv: smtp.ok ? [] : smtp.missing,
      smtpInvalidEnv: smtp.ok ? [] : smtp.invalid,
      googleSender: isGoogleSenderConfigured(),
      automationHandoff: isAutomationWebhookConfigured(),
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
