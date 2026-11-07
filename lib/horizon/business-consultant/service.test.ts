import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { createBusinessConsultantService, missingProfileFieldsOf, nextActionStatus } from "./service"
import { createBusinessFakeDb, seedCase, seedDocument, seedProfile } from "./testing/fake-supabase"

/**
 * The Business Consultant service is where ownership is decided. These tests use
 * the real service against an in-memory client that declares the same constraints
 * the migration does, and they assert the properties the brief names: Owner A
 * cannot read or modify Owner B's rows, a foreign profile/document/case id is
 * refused, and the consultant never completes an action on the user's behalf.
 */

const OWNER_A = "a0000000-0000-4000-8000-00000000000a"
const OWNER_B = "b0000000-0000-4000-8000-00000000000b"

describe("ownership isolation", () => {
  it("Owner A cannot read Owner B's profile", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_B)
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.getProfile()
    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it("Owner A cannot read Owner B's diagnosis", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profileB = seedProfile(fake, OWNER_B)
    fake.tables.business_diagnoses.push({
      id: "d0000000-0000-4000-8000-000000000001",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      status: "ready",
      model: "m",
      prompt_version: "v",
      content: {},
      input_references: [],
      trace_id: "t",
      run_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    seedProfile(fake, OWNER_A)
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.latestDiagnosis()
    expect(result.data).toBeNull()
  })

  it("Owner A cannot read or modify Owner B's action", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profileB = seedProfile(fake, OWNER_B)
    const actionB = {
      id: "a0000000-0000-4000-8000-000000000009",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      horizon: 30,
      action_key: "k",
      title: "B action",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    fake.tables.business_playbook_actions.push(actionB)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const read = await service.applyAction({ actionId: actionB.id, action: "complete" })
    expect(read.code).toBe("ACTION_NOT_FOUND")
    // The row is untouched.
    expect(fake.tables.business_playbook_actions[0].status).toBe("pending")
  })

  it("Owner A cannot list Owner B's actions or finance entries", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profileB = seedProfile(fake, OWNER_B)
    fake.tables.business_playbook_actions.push({
      id: "a0000000-0000-4000-8000-00000000000a",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      horizon: 30,
      action_key: "k",
      title: "B",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    fake.tables.business_finance_entries.push({
      id: "f0000000-0000-4000-8000-000000000001",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      kind: "revenue",
      category: "revenue_sales",
      amount_cents: 100,
      period_month: "2026-01-01",
      source: "manual",
      evidence_class: "user_provided",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    // A has their own profile so the reads are not short-circuited by PROFILE_REQUIRED.
    seedProfile(fake, OWNER_A)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    expect((await service.listActions()).data).toEqual([])
    expect((await service.listFinance()).data).toEqual([])
  })
})

describe("document and case ownership validation", () => {
  it("refuses to link a document that belongs to another owner", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_A)
    const caseB = seedCase(fake, OWNER_B)
    const documentB = seedDocument(fake, OWNER_B, caseB.id as string)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const result = await service.linkDocument({ documentId: documentB.id as string, category: "invoice" })
    expect(result.code).toBe("DOCUMENT_NOT_FOUND")
    expect(fake.tables.business_documents).toHaveLength(0)
  })

  it("refuses to link a case that belongs to another owner", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_A)
    const caseA = seedCase(fake, OWNER_A)
    const documentA = seedDocument(fake, OWNER_A, caseA.id as string)
    const caseB = seedCase(fake, OWNER_B)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const result = await service.linkDocument({
      documentId: documentA.id as string,
      caseId: caseB.id as string,
      category: "invoice",
    })
    expect(result.code).toBe("CASE_NOT_FOUND")
    expect(fake.tables.business_documents).toHaveLength(0)
  })

  it("links an owned document and is idempotent for the same document", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_A)
    const caseA = seedCase(fake, OWNER_A)
    const documentA = seedDocument(fake, OWNER_A, caseA.id as string)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const first = await service.linkDocument({ documentId: documentA.id as string, category: "invoice" })
    expect(first.error).toBeNull()
    const second = await service.linkDocument({ documentId: documentA.id as string, category: "tax" })
    expect(second.error).toBeNull()
    // Upsert, not a duplicate row.
    expect(fake.tables.business_documents).toHaveLength(1)
    expect(fake.tables.business_documents[0].category).toBe("tax")
  })

  it("refuses a finance entry that references another owner's document", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_A)
    const caseB = seedCase(fake, OWNER_B)
    const documentB = seedDocument(fake, OWNER_B, caseB.id as string)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const result = await service.addFinanceEntry({
      kind: "expense",
      category: "expense_other",
      amountCents: 100,
      periodMonth: "2026-01-01",
      source: "document",
      documentId: documentB.id as string,
    })
    expect(result.code).toBe("DOCUMENT_NOT_FOUND")
    expect(fake.tables.business_finance_entries).toHaveLength(0)
  })
})

describe("finance entries", () => {
  it("classifies a manual entry as user_provided and a document entry as verified_fact", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    seedProfile(fake, OWNER_A)
    const caseA = seedCase(fake, OWNER_A)
    const documentA = seedDocument(fake, OWNER_A, caseA.id as string)
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const manual = await service.addFinanceEntry({
      kind: "revenue",
      category: "revenue_services",
      amountCents: 5000,
      periodMonth: "2026-01-01",
      source: "manual",
    })
    expect(manual.data?.evidenceClass).toBe("user_provided")

    const derived = await service.addFinanceEntry({
      kind: "expense",
      category: "expense_rent",
      amountCents: 90000,
      periodMonth: "2026-01-01",
      source: "document",
      documentId: documentA.id as string,
    })
    expect(derived.data?.evidenceClass).toBe("verified_fact")
  })

  it("requires a profile before writing", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.addFinanceEntry({
      kind: "revenue",
      category: "revenue_sales",
      amountCents: 100,
      periodMonth: "2026-01-01",
      source: "manual",
    })
    expect(result.code).toBe("PROFILE_REQUIRED")
  })
})

describe("schema readiness", () => {
  it("reports the migration as not applied when the table is missing", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    fake.failNext("business_profiles", "42P01")
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.getProfile()
    expect(result.code).toBe("BUSINESS_CONSULTANT_SCHEMA_NOT_READY")
  })
})

describe("action transitions", () => {
  it("only allows the documented forward transitions", () => {
    expect(nextActionStatus("pending", "start")).toBe("in_progress")
    expect(nextActionStatus("in_progress", "complete")).toBe("completed")
    expect(nextActionStatus("pending", "complete")).toBe("completed")
    expect(nextActionStatus("pending", "postpone")).toBe("postponed")
    expect(nextActionStatus("completed", "reject")).toBeNull()
    expect(nextActionStatus("rejected", "reopen")).toBe("pending")
    expect(nextActionStatus("pending", "reopen")).toBeNull()
    expect(nextActionStatus("completed", "start")).toBeNull()
  })

  it("completes an owned action and refuses an invalid transition", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profile = seedProfile(fake, OWNER_A)
    fake.tables.business_playbook_actions.push({
      id: "a0000000-0000-4000-8000-000000000001",
      owner_id: OWNER_A,
      profile_id: profile.id,
      horizon: 30,
      action_key: "k",
      title: "Action",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const service = createBusinessConsultantService(fake.client, OWNER_A)

    const done = await service.applyAction({ actionId: "a0000000-0000-4000-8000-000000000001", action: "complete" })
    expect(done.data?.status).toBe("completed")

    const again = await service.applyAction({ actionId: "a0000000-0000-4000-8000-000000000001", action: "start" })
    expect(again.code).toBe("ACTION_TRANSITION_INVALID")
  })
})

describe("computeHealth", () => {
  it("never reads another owner's evidence", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profileB = seedProfile(fake, OWNER_B, { bookkeeping_method: "euer", e_invoice_status: "ready" })
    fake.tables.business_finance_entries.push({
      id: "f0000000-0000-4000-8000-000000000001",
      owner_id: OWNER_B,
      profile_id: profileB.id,
      document_id: null,
      kind: "revenue",
      category: "revenue_sales",
      amount_cents: 900_000,
      currency: "EUR",
      period_month: "2026-05-01",
      description: "",
      recurring: false,
      source: "manual",
      evidence_class: "user_provided",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    // Owner A has a profile of their own but no finance history.
    seedProfile(fake, OWNER_A)
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.computeHealth()
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(true)
    expect(result.data?.components.find((component) => component.key === "liquidity")?.reasonCode).toBe("NO_FINANCE_HISTORY")
  })

  it("returns a blocked score rather than a zero when the owner has no profile", async () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const service = createBusinessConsultantService(fake.client, OWNER_A)
    const result = await service.computeHealth()
    expect(result.data?.blocked).toBe(true)
    expect(result.data?.score).toBeNull()
  })
})

describe("missingProfileFieldsOf", () => {
  it("names the fields the owner has not supplied", () => {
    const fake = createBusinessFakeDb({ ownerId: OWNER_A })
    const profile = seedProfile(fake, OWNER_A, {
      activity_description: null,
      employee_count: null,
      annual_revenue_band: "unknown",
      business_goals: [],
    })
    const missing = missingProfileFieldsOf(profile as never)
    expect(missing).toContain("activity_description")
    expect(missing).toContain("employee_count")
    expect(missing).toContain("annual_revenue_band")
    expect(missing).toContain("business_goals")
  })
})
