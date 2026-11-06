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
 *   HORIZON_TEST_SUPABASE_ANON_KEY=...      its anon key (required for the RLS test)
 *
 * Safety rails:
 *   - the production project ref is refused outright, even if someone sets the
 *     opt-in flag by mistake (see PRODUCTION_PROJECT_REF);
 *   - every fixture is synthetic and is deleted in `afterAll` (the synthetic
 *     auth users are removed, which cascades their cases and facts by FK);
 *   - nothing reads or writes pre-existing rows.
 *
 * Provisioning runs through a **user session** (anon key + signInWithPassword),
 * not the service-role client, so the test exercises the real grants and RLS
 * policies the application depends on. The service-role client is used only to
 * create and delete the synthetic users.
 *
 * Run it against a disposable/staging project only:
 *
 *   HORIZON_TEST_SUPABASE=1 \
 *   HORIZON_TEST_SUPABASE_URL=https://<test-ref>.supabase.co \
 *   HORIZON_TEST_SUPABASE_SECRET_KEY=<service-role-key> \
 *   HORIZON_TEST_SUPABASE_ANON_KEY=<anon-key> \
 *   ./node_modules/.bin/vitest run lib/horizon/service-requests/intake.integration.test.ts
 */

const PRODUCTION_PROJECT_REF = "mteguzgbiuexmdcrqajj"

const testUrl = process.env.HORIZON_TEST_SUPABASE_URL ?? ""
const testKey = process.env.HORIZON_TEST_SUPABASE_SECRET_KEY ?? ""
const anonKey = process.env.HORIZON_TEST_SUPABASE_ANON_KEY ?? ""
const optedIn = process.env.HORIZON_TEST_SUPABASE === "1"

const pointsAtProduction = testUrl.includes(PRODUCTION_PROJECT_REF)
const enabled = optedIn && Boolean(testUrl) && Boolean(testKey) && Boolean(anonKey) && !pointsAtProduction

const skipReason = !optedIn
  ? "HORIZON_TEST_SUPABASE is not 1; integration test skipped"
  : !testUrl || !testKey || !anonKey
    ? "HORIZON_TEST_SUPABASE_URL / _SECRET_KEY / _ANON_KEY are not set; integration test skipped"
    : pointsAtProduction
      ? "refusing to run against the production project ref; integration test skipped"
      : ""

describe.skipIf(!enabled)(`Service Request → Case integration (${skipReason || "live"})`, () => {
  let admin: SupabaseClient
  let ownerSession: SupabaseClient
  let strangerSession: SupabaseClient
  let ownerId = ""
  let strangerId = ""
  let repo: CaseEngineRepository

  const createdRequestIds: string[] = []

  const signIn = async (email: string, password: string) => {
    const client = createClient(testUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`could not sign in the synthetic user: ${error.message}`)
    return client
  }

  beforeAll(async () => {
    admin = createClient(testUrl, testKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const stamp = Date.now()
    const password = `hz-intake-${stamp}-Aa1!`
    const ownerEmail = `horizon-intake-owner-${stamp}@example.invalid`
    const strangerEmail = `horizon-intake-stranger-${stamp}@example.invalid`

    const owner = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true })
    const stranger = await admin.auth.admin.createUser({ email: strangerEmail, password, email_confirm: true })
    if (owner.error || !owner.data.user) throw new Error(`owner create failed: ${owner.error?.message}`)
    if (stranger.error || !stranger.data.user) throw new Error(`stranger create failed: ${stranger.error?.message}`)
    ownerId = owner.data.user.id
    strangerId = stranger.data.user.id

    ownerSession = await signIn(ownerEmail, password)
    strangerSession = await signIn(strangerEmail, password)
    // Provision as the owner's session, exactly as the application does.
    repo = new CaseEngineRepository(ownerSession as never, ownerId)
  }, 30_000)

  afterAll(async () => {
    // Deleting the synthetic owners cascades their cases and facts (FK on delete
    // cascade). The affiliate rows are keyed by the synthetic request ids.
    for (const requestId of createdRequestIds) {
      await admin.from("affiliate_requests").delete().eq("request_id", requestId)
    }
    if (ownerId) await admin.auth.admin.deleteUser(ownerId)
    if (strangerId) await admin.auth.admin.deleteUser(strangerId)
  }, 30_000)

  const countCasesForRequest = async (requestId: string) => {
    const { count } = await admin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("service_request_id", requestId)
    return count ?? 0
  }

  it("records the service_request_id on the case and finds it again through the column", async () => {
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

    const found = await repo.findCaseByServiceRequestId(requestId)
    expect(found.error).toBeNull()
    expect(found.data?.id).toBe(first.data?.id)

    // The legacy fact is still written, so fact-based readers keep working.
    const byFact = await repo.findCaseByFact(SERVICE_REQUEST_ID_FACT, requestId)
    expect(byFact.data?.id).toBe(first.data?.id)
  })

  it("keeps exactly one case for a repeated request id", async () => {
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

    // The decisive assertion: exactly ONE case for THIS request id (not merely at
    // least one case for the user).
    expect(await countCasesForRequest(requestId)).toBe(1)
  })

  it("creates exactly one case for two concurrent requests with the same id", async () => {
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

    // Fire both at once; the partial unique index must admit exactly one insert and
    // the loser must recover the winner's case.
    const [a, b] = await Promise.all([
      provisionHorizonServiceCase(repo, input),
      provisionHorizonServiceCase(repo, input),
    ])

    expect(a.error).toBeNull()
    expect(b.error).toBeNull()
    expect(a.data?.id).toBeTruthy()
    expect(a.data?.id).toBe(b.data?.id)
    expect(await countCasesForRequest(requestId)).toBe(1)
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

  it("denies another authenticated user access to the owner's case (real RLS, user session)", async () => {
    const requestId = `hz_it_${crypto.randomUUID()}`
    createdRequestIds.push(requestId)

    const created = await provisionHorizonServiceCase(repo, {
      kind: "steuererklaerung",
      locale: "bg",
      requestId,
      customerName: "Integration Probe",
      customerEmail: "probe@example.invalid",
      answers: { serviceDetails: "Steuerjahr 2025" },
    })
    expect(created.data?.id).toBeTruthy()

    // The owner sees the case through their own session...
    const asOwner = await repo.findCaseByServiceRequestId(requestId)
    expect(asOwner.data?.id).toBe(created.data?.id)

    // ...but a different authenticated user does not, even though they know the
    // exact request id. This is RLS enforced for a user session, not the service
    // role (which bypasses RLS).
    const strangerRepo = new CaseEngineRepository(strangerSession as never, strangerId)
    const asStranger = await strangerRepo.findCaseByServiceRequestId(requestId)
    expect(asStranger.data).toBeNull()

    // And the stranger cannot read the owner's case row directly either.
    const direct = await strangerSession
      .from("cases")
      .select("id")
      .eq("id", created.data?.id ?? "")
    expect((direct.data ?? []).length).toBe(0)
  })

  it("denies an unauthenticated client access to cases", async () => {
    const anon = createClient(testUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await anon.from("cases").select("id").limit(1)
    // Either the table privilege is gone (error) or RLS hides every row (empty).
    expect(error ? true : (data ?? []).length === 0).toBe(true)
  })
})
