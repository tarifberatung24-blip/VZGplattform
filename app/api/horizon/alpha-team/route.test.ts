import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  signedIn: true,
  caseAvailable: true,
  contextLoads: 0,
  loadCaseContext: vi.fn(),
}))

vi.mock("@/lib/horizon/case", () => ({
  createCaseEngine: async () => ({
    userId: state.signedIn ? "owner-1" : null,
    repository: state.signedIn
      ? { loadCaseContext: state.loadCaseContext }
      : null,
  }),
}))

import { POST } from "./route"

const CASE = "11111111-1111-1111-1111-111111111111"
const OTHER_CASE = "22222222-2222-2222-2222-222222222222"
const DOC_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const DOC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

const ownedContext = (caseId = CASE, documentIds = [DOC_A, DOC_B]) => ({
  caseId,
  documentIds,
  module: "kindergeld",
  caseStatus: "collecting_data",
  title: "Case",
  intent: "document_explanation",
  institution: null,
  deadline: null,
  conversationLocale: "bg",
  outputLocale: "de" as const,
  confirmedFacts: [],
  unconfirmedFacts: [],
  missingFactKeys: [],
  unconfirmedCriticalFactKeys: [],
  draftSummaries: [],
  documentCount: documentIds.length,
  empty: documentIds.length === 0,
})

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/horizon/alpha-team", {
    method: "POST",
    body: JSON.stringify(body),
  }))

beforeEach(() => {
  state.signedIn = true
  state.caseAvailable = true
  state.contextLoads = 0
  state.loadCaseContext.mockReset()
  state.loadCaseContext.mockImplementation(async (caseId: string) => {
    state.contextLoads += 1
    return state.caseAvailable ? { data: ownedContext(caseId), error: null } : { data: null, error: "not found" }
  })
})

describe("POST /api/horizon/alpha-team", () => {
  it("rejects unauthenticated requests", async () => {
    state.signedIn = false
    const response = await post({ objective: "Покажи екипите" })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: "AUTHENTICATION_REQUIRED" })
  })

  it("accepts an owned case and its documents with one context load", async () => {
    const response = await post({ objective: "Обясни Finanzamt писмото", caseId: CASE, documentIds: [DOC_A] })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.context).toEqual({ caseId: CASE, documentIds: [DOC_A, DOC_B] })
    expect(body.plan.department).toBe("finance")
    expect(body.plan.runId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.plan.execution).toEqual({
      mode: "existing-case-assistant",
      route: `/api/horizon/cases/${CASE}/assistant`,
      externalActions: "blocked",
    })
    expect(state.contextLoads).toBe(1)
  })

  it("returns the same not-found response for missing or inaccessible cases", async () => {
    state.caseAvailable = false
    const response = await post({ objective: "Обясни писмото", caseId: CASE })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ code: "CASE_NOT_FOUND" })
  })

  it("accepts documents only when they belong to the loaded case", async () => {
    const response = await post({ objective: "Какво липсва за Kindergeld?", caseId: CASE, documentIds: [DOC_B] })
    expect(response.status).toBe(200)
  })

  it("rejects missing, foreign and cross-case document IDs without revealing which case they belong to", async () => {
    for (const documentId of ["missing-document", OTHER_CASE]) {
      const response = await post({ objective: "Обясни документа", caseId: CASE, documentIds: [documentId] })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ code: "DOCUMENTS_NOT_FOUND" })
    }
  })

  it("rejects document IDs without a valid case context", async () => {
    const response = await post({ objective: "Обясни документа", documentIds: [DOC_A] })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: "CASE_CONTEXT_REQUIRED" })
    expect(state.contextLoads).toBe(0)
  })

  it("rejects invalid payloads", async () => {
    const response = await post({ objective: "", caseId: CASE })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: "INVALID_ALPHA_TASK" })
    expect(state.contextLoads).toBe(0)
  })

  it("allows legitimate context-free tasks", async () => {
    const response = await post({ objective: "Покажи екипите", locale: "bg" })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.plan.blockers).toEqual([])
    expect(body.context).toBeNull()
    expect(state.contextLoads).toBe(0)
  })

  it("localizes plan steps and creates a fresh run ID per request", async () => {
    const first = await post({ objective: "Покажи екипите", locale: "de" })
    const second = await post({ objective: "Покажи екипите", locale: "de" })
    const firstBody = await first.json()
    const secondBody = await second.json()
    expect(firstBody.plan.steps[0]).toContain("klassifiziert")
    expect(firstBody.plan.runId).not.toBe(secondBody.plan.runId)
  })
})
