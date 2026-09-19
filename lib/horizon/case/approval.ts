/**
 * Approval validity.
 *
 * An approval binds to the exact content hash of the draft version it approved.
 * Any later change to the approved content produces a different hash and the
 * approval no longer matches, so it is invalid without any write to the
 * approvals table — historic records stay intact.
 */

export function isApprovalValid(
  approvedHash: string | null | undefined,
  currentContentHash: string,
): boolean {
  if (!approvedHash) return false
  return approvedHash === currentContentHash
}

/**
 * The hash the draft content must produce. Kept here (rather than in the
 * repository) so verification and generation agree on one definition.
 */
export function buildApprovalPayload(input: {
  subject: string
  body: string
  recipient: string | null
}): string {
  return JSON.stringify({
    subject: input.subject,
    body: input.body,
    recipient: input.recipient ?? null,
  })
}

export async function computeContentHash(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}