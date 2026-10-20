import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  confirmFacts: vi.fn(),
  generateDraft: vi.fn(),
}))

vi.mock("@/lib/office/workflow/records", () => mocks)

import { POST } from "./route"

function request(body: unknown) {
  return new Request("http://localhost/api/office/cases/case-1/workflow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ id: "case-1" }) }

beforeEach(() => {
  mocks.confirmFacts.mockReset().mockResolvedValue({ facts: [] })
  mocks.generateDraft.mockReset().mockResolvedValue({ draft: { id: "draft-1" } })
})

describe("office workflow input", () => {
  it("rejects unknown actions and oversized fields before workflow execution", async () => {
    expect((await POST(request({ action: "send" }), context)).status).toBe(400)
    expect((await POST(request({
      action: "confirm-facts",
      facts: [{ key: "request", value: "x".repeat(4001) }],
    }), context)).status).toBe(400)
    expect(mocks.confirmFacts).not.toHaveBeenCalled()
    expect(mocks.generateDraft).not.toHaveBeenCalled()
  })

  it("deduplicates a bounded document selection", async () => {
    const response = await POST(request({
      action: "generate-draft",
      outputLocale: "bg",
      documentIds: ["document-1", "document-1", "document-2"],
    }), context)
    expect(response.status).toBe(201)
    expect(mocks.generateDraft).toHaveBeenCalledWith("case-1", "bg", ["document-1", "document-2"])
  })

  it("uses authentication-aware response statuses", async () => {
    mocks.generateDraft.mockResolvedValueOnce({ error: "Unauthorized" })
    const response = await POST(request({ action: "generate-draft" }), context)
    expect(response.status).toBe(401)
  })
})
