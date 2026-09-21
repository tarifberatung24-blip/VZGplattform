import { NextResponse } from "next/server"
import { createCaseEngine } from "@/lib/horizon/case"
import { createAdminClient } from "@/lib/office/supabase/admin"
import { computeSha256 } from "@/lib/horizon/pdf/source"
import { readLetterOutputSha } from "@/lib/horizon/kuendigung/manifest"

export const runtime = "nodejs"

const CASE_DOCUMENT_BUCKET = "source-documents"

/**
 * P14 — owner-scoped download of the newest generated Kündigung letter.
 *
 * The generated artifact lives in the private `source-documents` bucket, which has
 * no browser-readable URL, so it must be handed out deliberately. Three things are
 * checked before any bytes are served, and all three are checked against the
 * *value*, not the path:
 *
 * 1. ownership — the case is read through the session client with its `owner_id`
 *    filter, so another user's case id yields nothing;
 * 2. approval — the draft whose body records this artifact's hash must itself be
 *    approved at that exact hash, so an unapproved or since-edited letter is not
 *    downloadable;
 * 3. integrity — the stored bytes are re-hashed and must still equal the recorded
 *    output hash, so a substituted or corrupted object is refused rather than
 *    served as if it were the approved letter.
 *
 * Only then is a short-lived signed URL issued. No path is taken from the request,
 * so a caller cannot ask for an object of their choosing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const engine = await createCaseEngine()
  if (!engine.repository || !engine.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const owned = await engine.repository.getMine(id)
  if (owned.error || !owned.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  // The newest generation for this case, per the audit trail.
  const audit = await engine.repository.listAudit(id)
  if (audit.error) return NextResponse.json({ error: "failed" }, { status: 500 })
  const generated = (audit.data ?? []).find((event) => event.action === "letter_generated")
  if (!generated) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const storagePath =
    typeof generated.metadata.storage_path === "string" ? generated.metadata.storage_path : null
  const recordedSha =
    typeof generated.metadata.output_sha256 === "string" ? generated.metadata.output_sha256 : null
  if (!storagePath || !recordedSha) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  // The draft that approved this exact artifact, located by the value it records.
  const drafts = await engine.repository.listDrafts(id)
  if (drafts.error) return NextResponse.json({ error: "failed" }, { status: 500 })
  const draft = (drafts.data ?? []).find((entry) => readLetterOutputSha(entry.body) === recordedSha)
  if (!draft) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const approvalState = await engine.repository.getApprovalState(draft.id)
  if (approvalState.error) return NextResponse.json({ error: "failed" }, { status: 500 })
  if (!approvalState.data?.approved) {
    return NextResponse.json({ error: "not_approved" }, { status: 403 })
  }

  const approvals = await engine.repository.listApprovals(id)
  if (approvals.error) return NextResponse.json({ error: "failed" }, { status: 500 })
  const approval = (approvals.data ?? []).find((entry) => entry.draftId === draft.id)
  if (!approval || approval.approvedHash !== draft.contentHash) {
    return NextResponse.json({ error: "approval_stale" }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 })

  const downloaded = await admin.storage.from(CASE_DOCUMENT_BUCKET).download(storagePath)
  if (downloaded.error || !downloaded.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const bytes = new Uint8Array(await downloaded.data.arrayBuffer())
  const actualSha = await computeSha256(bytes)
  if (actualSha !== recordedSha) {
    return NextResponse.json({ error: "integrity_failed" }, { status: 409 })
  }

  const signed = await admin.storage
    .from(CASE_DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 300, { download: "Kuendigung.pdf" })
  if (signed.error || !signed.data) {
    return NextResponse.json({ error: "failed" }, { status: 500 })
  }

  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 300 })
}