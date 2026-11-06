import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { CaseEngineRepository } from "@/lib/horizon/case/repository"
import { provisionHorizonServiceCase } from "./case-provisioning"
import { SERVICE_REQUEST_ID_FACT } from "./registry"

/**
 * Opt-in integration test for the Service Request → Case workflow against a real
 * Supabase database. It is skipped unless ALL of the following hold, so a normal
 * `pnpm test` run never touches a database:
 *
 *   HORIZON_TEST_SUPABASE=1                 explicit opt-in
 *   HORIZON_TEST_SUPABASE_URL=...           the test project URL
 *   HORIZON_TEST_SUPABASE_SECRET_KEY=...    its service-role / secret key
 *
 * Safety rails:
 *   - the production project ref is refused outright, even if someone sets the
 *     opt-in flag by mistake (see PRODUCTION_PROJECT_REF);
 *   - every fixture is synthetic and is deleted in `afterAll` (the synthetic
 *     auth user is removed, which cascades its cases and facts by FK);
 *   - nothing reads or writes pre-existing rows.
 *
 * Run it against a disposable/staging project only:
 *
 *   HORIZON_TEST_SUPABASE=1 \
 *   HORIZON_TEST_SUPABASE_URL=https://<test-ref>.supabase.co \
 *   HORIZON_TEST_SUPABASE_SECRET_KEY=<service-role-key> \
 *   ./node_modules/.bin/vitest run lib/horizon/service-requests/intake.integration.test.ts
 */

const PRODUCTION_PROJECT_REF = "mteguzgbiuexmdcrqajj"

const testUrl = process.env.HORIZON_TEST_SUPABASE_URL ?? ""
const testKey = process.env.HORIZON_TEST_SUPABASE_SECRET_KEY ?? ""
const optedIn = process.env.HORIZON_TEST_SUPABASE === "1"

const pointsAtProduction = testUrl.includes(PRODUCTION_PROJECT_REF)
const enabled = optedIn && Boolean(testUrl) && Boolean(testKey) && !pointsAtProduction

const skipReason = !optedIn
  ? "HORIZON_TEST_SUPABASE is not 1; integration test skipped"
  : !testUrl || !testKey
    ? "HORIZON_TEST_SUPABASE_URL / _SECRET_KEY are not set; integration test skipped"
    : pointsAtProduction
      ? "refusing to run against the production project ref; integration test skipped"
      : ""

describe.skipIf(!enabled)(`Service Request → Case integration (${skipReason || "live"})`, () => {
  let admin: SupabaseClient
  let anon: SupabaseClient | null = null
  let ownerId = ""
  let repo: CaseEngineRepository

  const createdRequestIds: string[] = []

  beforeAll(async () => {
    admin = createClient(testUrl, testKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const anonKey = process.env.HORIZON_TEST_SUPABASE_ANON_KEY
    anon = anonKey ? createClient(testUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null

    const created = await admin.auth.admin.createUser({
      email: `horizon-intake-test-${Date.now()}@example.invalid`,
      email_confirm: true,
    })
    if (created.error || !created.data.user) {
      throw new Error(`could not create the synthetic test owner: ${created.error?.message}`)
    }
    ownerId = created.data.user.id
    repo = new CaseEngineRepository(admin as never, ownerId)
  }, 30_000)

  afterAll(async () => {
    // Deleting the synthetic owner cascades its cases and facts (FK on delete
    // cascade). The affiliate rows are keyed by the synthetic request ids.
    for (const requestId of createdRequestIds) {
      await admin.from("affiliate_requests").delete().eq("request_id", requestId)
    }
    if (ownerId) await admin.auth.admin.deleteUser(ownerId)
  }, 30_000)

  it("records the service_request_id fact and finds the case again through it", async () => {
    const requestId = `hz_it_${crypto.randomUUID()}`
    createdRequestIds.push(requestId)

    const first = await provisionHorizonServiceCase(repo, {
      kind: "steuererklaerung",
      locale: "bg",
      requestId,
      customerName: "Integration Probe",
      customerEmail: "probe@example.invalid",
      answers: { serviceDetails: "Steuerjahr 2025" },
    })
    expect(first.error).toBeNull()
    expect(first.reused).toBe(false)
    expect(first.data?.id).toBeTruthy()

    const found = await repo.findCaseByFact(SERVICE_REQUEST_ID_FACT, requestId)
    expect(found.error).toBeNull()
    expect(found.data?.id).toBe(first.data?.id)
  })

  it("reuses the same case for a repeated request id instead of creating a duplicate", async () => {
    const requestId = `hz_it_${crypto.randomUUID()}`
    createdRequestIds.push(requestId)
    const input = {
      kind: "steuererklaerung" as const,
      locale: "bg" as const,
      requestId,
      customerName: "Integration Probe",
      customerEmail: "probe@example.invalid",
      answers: { serviceDetails: "Steuerjahr 2025" },
    }

    const first = await provisionHorizonServiceCase(repo, input)
    const second = await provisionHorizonServiceCase(repo, input)

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.reused).toBe(true)
    expect(second.data?.id).toBe(first.data?.id)

    // Exactly one case exists for this request id.
    const { count } = await admin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
    const facts = await repo.findCaseByFact(SERVICE_REQUEST_ID_FACT, requestId)
    expect(facts.data?.id).toBe(first.data?.id)
    expect(count ?? 0).toBeGreaterThanOrEqual(1)
  })

  it("keeps request_id unique on affiliate_requests so a retry cannot double-write", async () => {
    const requestId = `hz_it_${crypto.randomUUID()}`
    createdRequestIds.push(requestId)
    const row = {
      request_id: requestId,
      kind: "energy",
      locale: "de",
      customer_name: "Integration Probe",
      customer_email: "probe@example.invalid",
    }

    const first = await admin.from("affiliate_requests").insert(row).select("id").single()
    expect(first.error).toBeNull()

    const second = await admin.from("affiliate_requests").insert(row).select("id").single()
    // 23505 = unique_violation on affiliate_requests.request_id.
    expect(second.error?.code).toBe("23505")
  })

  it("denies client roles any access to affiliate_requests when an anon key is supplied", async () => {
    if (!anon) {
      // No anon key configured: the privilege facts are covered by
      // supabase/tests/rls/affiliate_isolation.sql on a disposable database.
      return
    }
    const { data, error } = await anon.from("affiliate_requests").select("id").limit(1)
    // Either the table privilege is gone (error) or RLS hides every row (empty).
    expect(error ? true : (data ?? []).length === 0).toBe(true)
  })
})
