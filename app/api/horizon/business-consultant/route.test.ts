import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

/**
 * Route-level tests for the Business Consultant API.
 *
 * These wire the *real* routes to the *real* service, against the in-memory
 * client, by mocking only the Supabase session module. That means the tests
 * exercise the actual ownership checks, the actual validation, and the actual
 * status codes — not a stand-in for the route.
 */

const OWNER_A = "a0000000-0000-4000-8000-00000000000a"
const OWNER_B = "b0000000-0000-4000-8000-00000000000b"

const state = vi.hoisted(() => ({
  signedIn: true,
  userId: "a0000000-0000-4000-8000-00000000000a",
  fake: null as unknown,
  diagnosis: null as unknown,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = state.fake as { client: unknown }
    return {
      ...(fake.client as Record<string, unknown>),
      auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: state.userId } : null } }) },
    }
  },
}))

// The diagnosis runner is the only model boundary; inject a deterministic one.
vi.mock("@/lib/horizon/business-consultant/diagnosis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/horizon/business-consultant/diagnosis")>()
  return {
    ...actual,
    createBusinessDiagnosisRunner: () => async () => state.diagnosis,
  }
})

import { createBusinessFakeDb, seedCase, seedDocument, seedProfile } from "@/lib/horizon/business-consultant/testing/fake-supabase"
import { GET as getProfile, PUT as putProfile } from "./profile/route"
import { GET as getDiagnosis, POST as postDiagnosis } from "./diagnosis/route"
import { GET as getActions, PATCH as patchAction } from "./actions/route"
import { GET as getDocuments, POST as postDocument } from "./documents/route"
import { GET as getFinance, POST as postFinance } from "./finance/route"

const jsonRequest = (body: unknown, method = "POST") =>
  new Request("https://test.local/api/horizon/business-consultant", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  state.signedIn = true
  state.userId = OWNER_A
  state.fake = createBusinessFakeDb({ ownerId: OWNER_A })
  state.diagnosis = {
    status: "ready",
    model: "openai/gpt-oss-20b",
    promptVersion: "horizon-business-diagnosis-v1",
    content: {
      findings: [
        { section: "weaknesses", statement: "Buchhaltung unregelmaessig", evidenceClass: "user_provided", references: [] },
      ],
      inputReferences: [],
      missingInformation: [],
    },
  }
})

function fake() {
  return state.fake as ReturnType<typeof createBusinessFakeDb>
}

describe("authentication", () => {
  it("refuses every endpoint without a session", async () => {
    state.signedIn = false
    for (const handler of [getProfile, getDiagnosis, getActions, getDocuments, getFinance]) {
      const response = await handler()
      expect(response.status).toBe(401)
    }
  })
})

describe("profile route", () => {
  it("returns null when the caller has no profile", async () => {
    const response = await getProfile()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ profile: null })
  })

  it("rejects an invalid profile", async () => {
    const response = await putProfile(jsonRequest({ business_name: "x" }, "PUT"))
    expect(response.status).toBe(400)
  })

  it("saves a valid profile with the Module A fields", async () => {
    const response = await putProfile(
      jsonRequest(
        {
          business_name: "Betrieb Test",
          legal_form: "einzelunternehmen",
          industry: "Handwerk",
          business_services: ["Reparatur"],
          business_tools: ["Lexoffice"],
        },
        "PUT",
      ),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.profile.owner_id).toBe(OWNER_A)
    expect(body.profile.business_services).toEqual(["Reparatur"])
  })

  it("rejects an unknown field (strict schema)", async () => {
    const response = await putProfile(
      jsonRequest({ business_name: "Betrieb", legal_form: "gmbh", industry: "IT", owner_id: OWNER_B }, "PUT"),
    )
    expect(response.status).toBe(400)
  })
})

describe("diagnosis route", () => {
  it("refuses to run without a profile", async () => {
    const response = await postDiagnosis(jsonRequest({}))
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("PROFILE_REQUIRED")
  })

  it("runs a diagnosis and returns the actions", async () => {
    seedProfile(fake(), OWNER_A)
    const response = await postDiagnosis(jsonRequest({ locale: "de" }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.diagnosis.status).toBe("ready")
    expect(body.actions.length).toBeGreaterThan(0)
  })

  it("returns the latest diagnosis on GET", async () => {
    seedProfile(fake(), OWNER_A)
    await postDiagnosis(jsonRequest({}))
    const response = await getDiagnosis()
    expect(response.status).toBe(200)
    expect((await response.json()).diagnosis.status).toBe("ready")
  })

  it("reports a failure when the model is not configured", async () => {
    seedProfile(fake(), OWNER_A)
    state.diagnosis = { status: "failed", errorCode: "ENGINE_NOT_CONFIGURED" }
    const response = await postDiagnosis(jsonRequest({}))
    expect(response.status).toBe(503)
  })
})

describe("documents route", () => {
  it("links an owned document and refuses a foreign one", async () => {
    seedProfile(fake(), OWNER_A)
    const caseA = seedCase(fake(), OWNER_A)
    const documentA = seedDocument(fake(), OWNER_A, caseA.id as string)

    const okResponse = await postDocument(
      jsonRequest({ documentId: documentA.id, caseId: caseA.id, category: "invoice" }),
    )
    expect(okResponse.status).toBe(201)

    // A document owned by B, seeded directly so it is invisible to A's session.
    const caseB = seedCase(fake(), OWNER_B)
    const documentB = seedDocument(fake(), OWNER_B, caseB.id as string)
    const refused = await postDocument(jsonRequest({ documentId: documentB.id, category: "invoice" }))
    expect(refused.status).toBe(404)
    expect((await refused.json()).code).toBe("DOCUMENT_NOT_FOUND")
  })

  it("lists the linked documents", async () => {
    seedProfile(fake(), OWNER_A)
    const caseA = seedCase(fake(), OWNER_A)
    const documentA = seedDocument(fake(), OWNER_A, caseA.id as string)
    await postDocument(jsonRequest({ documentId: documentA.id, category: "invoice" }))
    const response = await getDocuments()
    expect((await response.json()).documents).toHaveLength(1)
  })
})

describe("finance route", () => {
  it("adds an entry and returns a summary", async () => {
    seedProfile(fake(), OWNER_A)
    const created = await postFinance(
      jsonRequest({
        kind: "revenue",
        category: "revenue_sales",
        amountCents: 100000,
        periodMonth: "2026-01",
        source: "manual",
      }),
    )
    expect(created.status).toBe(201)

    const response = await getFinance()
    const body = await response.json()
    expect(body.entries).toHaveLength(1)
    expect(body.summary.totals.revenueCents).toBe(100000)
  })

  it("rejects a negative amount", async () => {
    seedProfile(fake(), OWNER_A)
    const response = await postFinance(
      jsonRequest({
        kind: "revenue",
        category: "revenue_sales",
        amountCents: -5,
        periodMonth: "2026-01",
        source: "manual",
      }),
    )
    expect(response.status).toBe(400)
  })

  it("rejects an unknown finance category", async () => {
    seedProfile(fake(), OWNER_A)
    const response = await postFinance(
      jsonRequest({
        kind: "revenue",
        category: "made_up",
        amountCents: 5,
        periodMonth: "2026-01",
        source: "manual",
      }),
    )
    expect(response.status).toBe(400)
  })
})

describe("actions route", () => {
  it("refuses to modify another owner's action", async () => {
    const profileB = seedProfile(fake(), OWNER_B)
    fake().tables.business_playbook_actions.push({
      id: "a0000000-0000-4000-8000-0000000000f1",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      horizon: 30,
      action_key: "k",
      title: "B",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const response = await patchAction(
      jsonRequest({ actionId: "a0000000-0000-4000-8000-0000000000f1", action: "complete" }, "PATCH"),
    )
    expect(response.status).toBe(404)
  })

  it("completes an owned action", async () => {
    const profile = seedProfile(fake(), OWNER_A)
    fake().tables.business_playbook_actions.push({
      id: "a0000000-0000-4000-8000-0000000000f2",
      owner_id: OWNER_A,
      profile_id: profile.id,
      horizon: 30,
      action_key: "k",
      title: "A",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const response = await patchAction(
      jsonRequest({ actionId: "a0000000-0000-4000-8000-0000000000f2", action: "complete" }, "PATCH"),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).action.status).toBe("completed")
  })
})
