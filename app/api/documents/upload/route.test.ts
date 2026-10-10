import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import project from "@/supabase/project.json"

/**
 * T0 route-level regression: the upload endpoint must refuse a wrong or missing
 * Supabase project before any database insert or storage upload, and must reach
 * the upload only for the canonical project in `supabase/project.json`.
 * The validation module is exercised for real; only I/O boundaries are mocked.
 * All fixtures are synthetic.
 */
const state = vi.hoisted(() => ({
  signedIn: true,
  inserts: [] as unknown[],
  uploads: [] as { path: string }[],
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.signedIn ? { id: "user-1" } : null } }),
    },
    from: () => ({
      insert: async (row: unknown) => {
        state.inserts.push(row)
        return { error: null }
      },
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          state.uploads.push({ path })
          return { error: null }
        },
        remove: async () => ({ error: null }),
      }),
    },
  }),
}))

vi.mock("@/lib/supabase/household", () => ({
  ensureHousehold: async () => "household-1",
}))

vi.mock("@/lib/office/supabase/record-audit-event", () => ({
  recordAuditEvent: async () => undefined,
}))

import { POST } from "./route"

const canonicalUrl = `https://${project.projectRef}.supabase.co`
const pdfBytes = new TextEncoder().encode("%PDF-1.7\n% synthetic test fixture\n")

const upload = (file: File | null = new File([pdfBytes], "rechnung.pdf", { type: "application/pdf" })) => {
  const form = new FormData()
  if (file) form.set("file", file)
  return POST(new Request("https://test.local/api/documents/upload", { method: "POST", body: form }))
}

describe("POST /api/documents/upload — canonical Supabase guard", () => {
  beforeEach(() => {
    state.signedIn = true
    state.inserts = []
    state.uploads = []
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", canonicalUrl)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("refuses an unauthenticated caller without touching the database or storage", async () => {
    state.signedIn = false
    const response = await upload()
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe("UPLOAD_NOT_AUTHENTICATED")
    expect(state.inserts).toHaveLength(0)
    expect(state.uploads).toHaveLength(0)
  })

  it("refuses a different Supabase project before any insert or upload", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sophzmteuemggqlstebw.supabase.co")
    const response = await upload()
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("SCHEMA_NOT_VERIFIED")
    expect(state.inserts).toHaveLength(0)
    expect(state.uploads).toHaveLength(0)
  })

  it("refuses when the Supabase URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const response = await upload()
    expect(response.status).toBe(503)
    expect(state.uploads).toHaveLength(0)
  })

  it("reaches the storage upload for the canonical project", async () => {
    const response = await upload()
    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.document).toMatchObject({ name: "rechnung.pdf", type: "application/pdf", status: "uploaded" })
    expect(state.inserts).toHaveLength(1)
    expect(state.uploads).toHaveLength(1)
    expect(state.uploads[0].path).toMatch(/^households\/household-1\/documents\/[0-9a-f-]{36}\/rechnung\.pdf$/)
  })

  it("accepts the canonical project URL with a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${canonicalUrl}/`)
    const response = await upload()
    expect(response.status).toBe(201)
    expect(state.uploads).toHaveLength(1)
  })

  it("rejects a file whose bytes do not match its declared type, before upload", async () => {
    const fake = new File([new TextEncoder().encode("not a pdf")], "rechnung.pdf", { type: "application/pdf" })
    const response = await upload(fake)
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("FILE_INVALID_SIGNATURE")
    expect(state.inserts).toHaveLength(0)
    expect(state.uploads).toHaveLength(0)
  })
})
