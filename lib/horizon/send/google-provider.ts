import "server-only"

import { createClient } from "@/lib/supabase/server"
import { openToken, refreshGoogleAccessToken, sendGmail, sealToken } from "@/lib/horizon/email/google-oauth"
import type { EmailProvider, OutboundEmail, ProviderResult } from "./provider"

export async function createGoogleProvider(userId: string): Promise<EmailProvider | null> {
  const supabase = await createClient()
  const { data: connection } = await supabase
    .from("user_email_connections")
    .select("email, access_token_ciphertext, refresh_token_ciphertext, access_token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle()

  if (!connection) return null

  return {
    key: "google-gmail",
    displayName: "Gmail (личен адрес)",
    async isAvailable() {
      return Boolean(connection.email && connection.refresh_token_ciphertext)
    },
    async send(message: OutboundEmail): Promise<ProviderResult> {
      try {
        let accessToken = openToken(connection.access_token_ciphertext)
        const expiresAt = Date.parse(connection.access_token_expires_at)
        if (!Number.isFinite(expiresAt) || expiresAt < Date.now() + 60_000) {
          const refreshed = await refreshGoogleAccessToken(openToken(connection.refresh_token_ciphertext))
          accessToken = refreshed.access_token
          await supabase.from("user_email_connections").update({ access_token_ciphertext: sealToken(accessToken), access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId).eq("provider", "google")
        }
        const sent = await sendGmail(accessToken, { to: message.to, from: connection.email, subject: message.subject, body: message.body, attachments: message.attachments })
        if (!sent.id) return { status: "FAILED", classification: "unknown", detail: "gmail did not return a message id" }
        return { status: "SENT", providerMessageId: sent.id, acceptedAt: new Date().toISOString(), metadata: { provider: "google", attachmentCount: message.attachments.length } }
      } catch {
        return { status: "FAILED", classification: "transport_error", detail: "gmail transport did not accept the message" }
      }
    },
  }
}
