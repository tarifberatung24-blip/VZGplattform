/**
 * P11 — attachment byte loading.
 *
 * Reads the recorded attachments from private storage and returns them together
 * with a SHA-256 recomputed from the bytes that were actually read. The bytes are
 * returned alongside the hash so the transport sends exactly what was verified.
 *
 * Ownership is not re-checked here: the draft and the attachment paths recorded
 * on it were read through the caller's RLS-enforced session client, so a path
 * that reached this module already belongs to the caller's case. The admin client
 * is used only because the bucket is private and the download must not depend on
 * a client-side URL.
 */

import "server-only"

import { createAdminClient } from "@/lib/office/supabase/admin"
import { computeSha256 } from "@/lib/horizon/pdf/source"
import type { EmailAttachment } from "./provider"

const CASE_DOCUMENT_BUCKET = "source-documents"

/** An attachment as recorded on a draft, before its bytes are read. */
export type RecordedAttachment = {
  storagePath: string
  filename: string
  sha256: string
}

/**
 * Reads attachments recorded on a draft.
 *
 * Malformed or partial entries are dropped rather than repaired: an attachment
 * whose hash cannot be established cannot be verified before sending, so letting
 * it through would make it silently part of a set the user believes is verified.
 */
export function readRecordedAttachments(value: unknown): RecordedAttachment[] {
  if (!Array.isArray(value)) return []
  const out: RecordedAttachment[] = []
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const record = entry as Record<string, unknown>
    const storagePath = typeof record.storagePath === "string" ? record.storagePath : null
    const filename = typeof record.filename === "string" ? record.filename : null
    const sha256 = typeof record.sha256 === "string" ? record.sha256 : null
    if (!storagePath || !filename || !sha256) continue
    out.push({ storagePath, filename, sha256 })
  }
  return out
}

/**
 * Loads attachment bytes and hashes them.
 *
 * Returns `null` when any attachment cannot be read. Partial success is not
 * useful here: a send either carries the complete verified set or it does not
 * happen, and silently dropping an unreadable attachment would produce a message
 * that is missing a document the user approved.
 */
export async function loadAttachmentBytes(
  recorded: readonly RecordedAttachment[],
): Promise<EmailAttachment[] | null> {
  if (recorded.length === 0) return []
  const admin = createAdminClient()
  if (!admin) return null

  const loaded: EmailAttachment[] = []
  for (const attachment of recorded) {
    const downloaded = await admin.storage
      .from(CASE_DOCUMENT_BUCKET)
      .download(attachment.storagePath)
    if (downloaded.error || !downloaded.data) return null
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer())
    loaded.push({
      storagePath: attachment.storagePath,
      filename: attachment.filename,
      contentType: downloaded.data.type || "application/octet-stream",
      sizeBytes: bytes.byteLength,
      sha256: await computeSha256(bytes),
      bytes,
    })
  }
  return loaded
}