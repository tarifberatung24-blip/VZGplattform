/**
 * P11 — email provider abstraction.
 *
 * The send engine owns *policy*: what may be sent, to whom, under which approval,
 * and what gets recorded. A provider owns one thing only: handing an already
 * authorised message to a transport. Everything security-relevant is decided
 * before a provider is ever called, so a provider cannot become the place where
 * authorization, approval or recipient checks leak.
 *
 * The interface is total: a provider either reports a concrete outcome or
 * reports that it is unavailable. It may not report success without a transport
 * receipt, and it may not throw to signal a policy problem — policy problems are
 * decided upstream and never reach here.
 *
 * No mail dependency exists in this repository. Rather than pretend otherwise,
 * the default provider is `unavailableProvider`, which is a real, correct
 * outcome: the pipeline runs end to end and stops at a clean
 * PROVIDER_UNAVAILABLE state.
 */

import "server-only"

export type EmailAttachment = {
  /** Storage path the bytes were read from; recorded for provenance. */
  storagePath: string
  filename: string
  contentType: string
  sizeBytes: number
  sha256: string
}

export type OutboundEmail = {
  /** Already normalised and confirmed upstream. Never invented here. */
  to: string
  subject: string
  body: string
  attachments: readonly EmailAttachment[]
}

/**
 * A provider outcome. `SENT` requires a transport-issued identifier: without one
 * there is no evidence a mail system even accepted the message, so a provider
 * that cannot produce one must report `UNAVAILABLE` or `FAILED` instead of
 * claiming success.
 */
export type ProviderResult =
  | {
      status: "SENT"
      /** Transport-issued message id. Required — see above. */
      providerMessageId: string
      /** When the transport reported acceptance. */
      acceptedAt: string
      /** Redacted transport metadata safe to persist and show. */
      metadata: Record<string, unknown>
    }
  | {
      status: "UNAVAILABLE"
      /** Why no provider could be used. Never contains credentials. */
      reason: string
    }
  | {
      /**
       * The transport was reached and refused, or errored. Distinct from
       * `UNAVAILABLE`: this one means a retry might help, the other means
       * nothing was attempted.
       */
      status: "FAILED"
      /** Coarse classification, safe to persist. */
      classification: "transport_error" | "rejected" | "timeout" | "unknown"
      /** Redacted message. Never the raw provider response. */
      detail: string
    }

export type EmailProvider = {
  /** Stable key, recorded on every attempt so the transport is auditable. */
  readonly key: string
  /** Human-readable name for the recipient preview. */
  readonly displayName: string
  /**
   * Whether this provider can be used right now. Checked before an attempt is
   * created, so an unavailable provider produces a clean state rather than a
   * half-written attempt.
   */
  isAvailable(): Promise<boolean>
  send(message: OutboundEmail): Promise<ProviderResult>
}