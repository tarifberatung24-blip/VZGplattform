import { createHash } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

const UNSIGNED_BYTES = new Uint8Array([1, 2, 3])
const SIGNED_BYTES = new Uint8Array([9, 8, 7])
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")
const UNSIGNED_SHA = sha(UNSIGNED_BYTES)
const SIGNED_SHA = sha(SIGNED_BYTES)
const DOWNLOADED: Record<string, Uint8Array> = {}

const state = vi.hoisted(() => ({
  signedIn: true,
  owned: true,
  audit: [] as Array<{ action: string; metadata: Record<string, unknown> }>,
  drafts: [] as Array<{ id: string; body: string; contentHash: string }>,
  approvals: [] as Array<{ draftId: string; approvedHash: string }>,
  approved: {} as Record<string, boolean>,
  storageUnavailable: false,
}))

vi.mock("@/lib/horizon/case", () => ({
  createCaseEngine: async () => ({
    userId: state.signedIn ? "user-1" : null,
    repository: state.signedIn
      ? {
          getMine: async () => (state.owned ? { error: null, data: { id: "c1" } } : { error: null, data: null }),
          listAudit: async () => ({ error: null, data: state.audit }),
          listDrafts: async () => ({ error: null, data: state.drafts }),
          getApprovalState: async (draftId: string) => ({
            error: null,
            data: { approved: Boolean(state.approved[draftId]) },
          }),
          listApprovals: async () => ({ error: null, data: state.approvals }),
        }
      : null,
  }),
}))

vi.mock("@/lib/office/supabase/admin", () => ({
  createAdminClient: () =>
    state.storageUnavailable
      ? null
      : {
          storage: {
            from: () => ({
              download: async (path: string) => ({
                error: DOWNLOADED[path] ? null : { message: "missing" },
                data: DOWNLOADED[path] ? { arrayBuffer: async () => DOWNLOADED[path].buffer } : null,
              }),
              createSignedUrl: async (path: string) => ({
                error: null,
                data: { signedUrl: `https://storage.test/${path}` },
              }),
            }),
          },
        },
}))

import { GET } from "./route"

const body = (lines: string[]) => lines.join("\n")

const unsignedBody = body([`Ausgabe-SHA-256: ${UNSIGNED_SHA}`])
// A signed draft embeds the unsigned body, so it carries BOTH hash lines; only the
// signed line distinguishes it.
const signedBody = body([`Signierte PDF-SHA-256: ${SIGNED_SHA}`, `Ausgabe-SHA-256: ${UNSIGNED_SHA}`])

const get = (caseId = "c1") =>
  GET(new Request(`http://localhost/api/horizon/cases/${caseId}/tax-form`), {
    params: Promise.resolve({ id: caseId }),
  })

beforeEach(() => {
  state.signedIn = true
  state.owned = true
  state.approved = {}
  state.storageUnavailable = false
  for (const key of Object.keys(DOWNLOADED)) delete DOWNLOADED[key]
  DOWNLOADED["forms/unsigned.pdf"] = UNSIGNED_BYTES
  DOWNLOADED["forms/signed.pdf"] = SIGNED_BYTES
  state.audit = [
    { action: "pdf_form_generated", metadata: { storage_path: "forms/unsigned.pdf", output_sha256: UNSIGNED_SHA } },
    { action: "pdf_signature_applied", metadata: { storage_path: "forms/signed.pdf", signed_sha256: SIGNED_SHA } },
  ]
  state.drafts = [
    { id: "d1", body: unsignedBody, contentHash: "h1" },
    { id: "d2", body: signedBody, contentHash: "h2" },
  ]
  state.approvals = []
})

describe("tax-form download route", () => {
  it("refuses an unauthenticated caller", async () => {
    state.signedIn = false
    expect((await get()).status).toBe(401)
  })

  it("refuses a case that is not owned", async () => {
    state.owned = false
    expect((await get()).status).toBe(404)
  })

  it("refuses when nothing was generated", async () => {
    state.audit = []
    expect((await get()).status).toBe(404)
  })

  it("serves the unsigned artifact when only the unsigned draft is approved", async () => {
    state.approved = { d1: true }
    state.approvals = [{ draftId: "d1", approvedHash: "h1" }]
    const res = await get()
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain("forms/unsigned.pdf")
  })

  /*
   * The signature produces a *new* artifact under its own path. Before this was
   * handled the route always resolved the newest `pdf_form_generated` event, so an
   * approved signed form still downloaded as the unsigned bytes — the user signed
   * the document and then got back the version without the signature.
   */
  it("serves the signed artifact once the signed draft is approved", async () => {
    state.approved = { d1: true, d2: true }
    state.approvals = [
      { draftId: "d1", approvedHash: "h1" },
      { draftId: "d2", approvedHash: "h2" },
    ]
    const res = await get()
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain("forms/signed.pdf")
  })

  it("keeps the unsigned artifact while the signed draft is still unapproved", async () => {
    state.approved = { d1: true }
    state.approvals = [{ draftId: "d1", approvedHash: "h1" }]
    const res = await get()
    expect((await res.json()).url).toContain("forms/unsigned.pdf")
  })

  it("falls back to the last approved artifact when the signed draft's approval went stale", async () => {
    state.approved = { d1: true, d2: true }
    state.approvals = [
      { draftId: "d1", approvedHash: "h1" },
      { draftId: "d2", approvedHash: "different" },
    ]
    const res = await get()
    // The stale signature must never be served; the still-valid unsigned form is.
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain("forms/unsigned.pdf")
  })

  it("refuses when the signed artifact is approved but its bytes were substituted", async () => {
    state.approved = { d1: true, d2: true }
    state.approvals = [
      { draftId: "d1", approvedHash: "h1" },
      { draftId: "d2", approvedHash: "h2" },
    ]
    DOWNLOADED["forms/signed.pdf"] = new Uint8Array([7, 7, 7])
    const res = await get()
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe("integrity_failed")
  })

  it("refuses when the stored bytes no longer match the recorded hash", async () => {
    state.approved = { d1: true }
    state.approvals = [{ draftId: "d1", approvedHash: "h1" }]
    // The recorded hash is for bytes that were swapped out underneath it.
    DOWNLOADED["forms/unsigned.pdf"] = new Uint8Array([4, 4, 4])
    const res = await get()
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe("integrity_failed")
  })
})
