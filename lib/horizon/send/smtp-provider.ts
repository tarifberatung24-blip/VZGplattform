/**
 * P11 — generic SMTP transport.
 *
 * This is the only module that talks to a mail server. It performs no policy
 * decisions: by the time it is called, the message has already passed approval,
 * recipient confirmation, attachment verification and explicit send confirmation.
 * It may not add, drop or rewrite a recipient, and it never reports `SENT`
 * without a transport-issued message id.
 *
 * Configuration comes exclusively from server-side environment variables through
 * `readSmtpConfig`. When configuration is absent or invalid this provider reports
 * `UNAVAILABLE` and transmits nothing. It never falls back to a weaker transport
 * and never simulates acceptance.
 *
 * Certificate verification is left at its secure default and is not configurable
 * here. A customer's official correspondence must not be sent over a connection
 * whose certificate was waived to make a test pass.
 */

import "server-only"

import nodemailer from "nodemailer"
import type { EmailProvider, OutboundEmail, ProviderResult } from "./provider"
import type { SmtpConfigResult } from "./smtp-config"

/**
 * How long to wait for the SMTP conversation, including the TLS handshake.
 *
 * Bounded so a send cannot hang a server action indefinitely. A timeout is
 * reported as `FAILED`/`timeout`, which is retryable, and never as a success.
 */
const SMTP_TIMEOUT_MS = 20_000

/** Classifies a nodemailer error without leaking its message into persisted state. */
function classify(error: unknown): "transport_error" | "rejected" | "timeout" | "unknown" {
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === "string") {
    if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION") return "timeout"
    if (code === "EAUTH" || code === "EENVELOPE") return "rejected"
    if (code === "ECONNREFUSED" || code === "EDNS" || code === "ENOTFOUND") {
      return "transport_error"
    }
  }
  // SMTP replies that reject the message arrive as a responseCode with a 5xx.
  const responseCode = (error as { responseCode?: unknown } | null)?.responseCode
  if (typeof responseCode === "number" && responseCode >= 500) return "rejected"
  return "unknown"
}

/**
 * A transport bound to one validated configuration.
 *
 * The config is passed in rather than re-read per call so that availability and
 * the send itself cannot disagree about which server is in use.
 */
export function createSmtpProvider(config: SmtpConfigResult): EmailProvider {
  return {
    key: "smtp",
    displayName: "SMTP",

    async isAvailable(): Promise<boolean> {
      return config.ok
    },

    async send(message: OutboundEmail): Promise<ProviderResult> {
      // Re-checked even though the engine checks availability first. A provider
      // that transmits without configuration would be the one place a send could
      // escape the pipeline's checks, so the guard is repeated at the boundary.
      if (!config.ok) {
        return { status: "UNAVAILABLE", reason: "smtp_not_configured" }
      }

      const transporter = nodemailer.createTransport({
        host: config.config.host,
        port: config.config.port,
        secure: config.config.secure,
        auth: config.config.auth,
        ...(config.config.heloName ? { name: config.config.heloName } : {}),
        connectionTimeout: SMTP_TIMEOUT_MS,
        greetingTimeout: SMTP_TIMEOUT_MS,
        socketTimeout: SMTP_TIMEOUT_MS,
        // STARTTLS is required, never opportunistic, on the non-implicit-TLS path.
        requireTLS: !config.config.secure,
      })

      try {
        const info = await transporter.sendMail({
          from: config.config.from,
          // A single, already-confirmed address. No cc/bcc is ever added here.
          to: message.to,
          subject: message.subject,
          text: message.body,
          attachments: message.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.bytes),
            contentType: attachment.contentType,
          })),
        })

        const messageId = typeof info.messageId === "string" ? info.messageId.trim() : ""
        // Without a transport-issued id there is no evidence the server accepted
        // the message, so this is reported as a failure rather than a send.
        if (!messageId) {
          return {
            status: "FAILED",
            classification: "unknown",
            detail: "smtp accepted the message but returned no message id",
          }
        }

        return {
          status: "SENT",
          providerMessageId: messageId,
          acceptedAt: new Date().toISOString(),
          metadata: {
            // Only non-identifying transport facts. No envelope, no addresses,
            // no raw server response.
            accepted: Array.isArray(info.accepted) ? info.accepted.length : 0,
            rejected: Array.isArray(info.rejected) ? info.rejected.length : 0,
            attachmentCount: message.attachments.length,
          },
        }
      } catch (error) {
        return {
          status: "FAILED",
          classification: classify(error),
          // A coarse reason only: raw SMTP responses can echo envelope addresses.
          detail: "smtp transport did not accept the message",
        }
      } finally {
        transporter.close()
      }
    },
  }
}