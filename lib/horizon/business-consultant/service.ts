import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"
import { createClient } from "@/lib/supabase/server"
import {
  MAX_FINANCE_ENTRIES,
  fail,
  ok,
  type BusinessDocumentCategory,
  type BusinessDocumentLink,
  type ConsultantResult,
  type EvidenceClass,
  type FinanceCategory,
  type FinanceEntry,
  type FinanceKind,
  type FinanceSource,
  type PlaybookAction,
  type PlaybookActionStatus,
  type PlaybookHorizon,
  type PlaybookPriority,
  type PlaybookUserAction,
  nextActionStatus,
} from "./contract"
import { buildPlaybook } from "./playbook"
import { createBusinessDiagnosisRunner, type BusinessContextInput } from "./diagnosis"

/**
 * HORIZON Business Consultant — service layer.
 *
 * Ownership is checked first, on every path, and then enforced again by RLS. A
 * caller-supplied profile id, document id or case id is never trusted: it is
 * resolved against the caller's own rows before it is used, so a foreign id is
 * indistinguishable from a missing one. That mirrors the Agent Runs Engine.
 *
 * This service writes only the Business Consultant tables. It never writes the
 * case spine, documents or facts — the consultant references them.
 */

type Db = Database["public"]

export type BusinessProfileRow = Db["Tables"]["business_profiles"]["Row"]
type DiagnosisRow = Db["Tables"]["business_diagnoses"]["Row"]
type PlaybookRow = Db["Tables"]["business_playbook_actions"]["Row"]
type BusinessDocumentRow = Db["Tables"]["business_documents"]["Row"]
type FinanceRow = Db["Tables"]["business_finance_entries"]["Row"]

/** Codes that mean the additive migration has not been applied yet. */
function isSchemaMissing(error: { code?: string | null } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "42703"
}

export type BusinessConsultantService = {
  ownerId: string
  getProfile(): Promise<ConsultantResult<BusinessProfileRow | null>>
  updateProfile(patch: Record<string, unknown>): Promise<ConsultantResult<BusinessProfileRow>>
  latestDiagnosis(): Promise<ConsultantResult<DiagnosisRow | null>>
  runDiagnosis(input?: { locale?: "bg" | "de" }): Promise<
    ConsultantResult<{ diagnosis: DiagnosisRow; actions: PlaybookAction[] }>
  >
  listActions(): Promise<ConsultantResult<PlaybookAction[]>>
  applyAction(input: { actionId: string; action: PlaybookUserAction }): Promise<ConsultantResult<PlaybookAction>>
  listDocuments(): Promise<ConsultantResult<BusinessDocumentLink[]>>
  linkDocument(input: {
    documentId: string
    caseId?: string | null
    category: BusinessDocumentCategory
  }): Promise<ConsultantResult<BusinessDocumentLink>>
  listFinance(): Promise<ConsultantResult<FinanceEntry[]>>
  addFinanceEntry(input: {
    kind: FinanceKind
    category: FinanceCategory
    amountCents: number
    periodMonth: string
    description?: string
    recurring?: boolean
    source: FinanceSource
    documentId?: string | null
  }): Promise<ConsultantResult<FinanceEntry>>
}

export function createBusinessConsultantService(
  client: SupabaseClient<Database>,
  ownerId: string,
): BusinessConsultantService {
  const now = () => new Date().toISOString()

  /** Resolves the caller's own profile, or null. Never accepts a profile id. */
  async function ownProfile(): Promise<ConsultantResult<BusinessProfileRow | null>> {
    const { data, error } = await client
      .from("business_profiles")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle()
    if (error) {
      return isSchemaMissing(error)
        ? fail("BUSINESS_CONSULTANT_SCHEMA_NOT_READY", "BUSINESS_CONSULTANT_SCHEMA_NOT_READY")
        : fail("PROFILE_READ_FAILED", "PROFILE_READ_FAILED")
    }
    return ok(data ?? null)
  }

  /** Verifies a document belongs to the caller before it is referenced. */
  async function ownDocument(documentId: string): Promise<boolean> {
    const { data } = await client
      .from("source_documents")
      .select("id")
      .eq("id", documentId)
      .eq("owner_id", ownerId)
      .maybeSingle()
    return Boolean(data)
  }

  /** Verifies a case belongs to the caller before it is referenced. */
  async function ownCase(caseId: string): Promise<boolean> {
    const { data } = await client.from("cases").select("id").eq("id", caseId).eq("owner_id", ownerId).maybeSingle()
    return Boolean(data)
  }

  function toAction(row: PlaybookRow): PlaybookAction {
    return {
      id: row.id,
      profileId: row.profile_id,
      horizon: row.horizon as PlaybookHorizon,
      actionKey: row.action_key,
      title: row.title,
      description: row.description,
      priority: row.priority as PlaybookPriority,
      effort: row.effort as PlaybookPriority,
      expectedBenefit: row.expected_benefit,
      requiredDocuments: Array.isArray(row.required_documents) ? (row.required_documents as string[]) : [],
      dependencies: Array.isArray(row.dependencies) ? (row.dependencies as string[]) : [],
      deadline: row.deadline,
      responsible: row.responsible as PlaybookAction["responsible"],
      approvalRequired: row.approval_required,
      status: row.status as PlaybookActionStatus,
      postponedUntil: row.postponed_until,
      evidenceClass: row.evidence_class as EvidenceClass,
    }
  }

  function toDocumentLink(row: BusinessDocumentRow): BusinessDocumentLink {
    return {
      id: row.id,
      profileId: row.profile_id,
      documentId: row.document_id,
      caseId: row.case_id,
      category: row.category as BusinessDocumentCategory,
      expiresOn: row.expires_on,
      renewalOn: row.renewal_on,
      summary: row.summary,
    }
  }

  function toFinanceEntry(row: FinanceRow): FinanceEntry {
    return {
      id: row.id,
      profileId: row.profile_id,
      documentId: row.document_id,
      kind: row.kind as FinanceKind,
      category: row.category as FinanceCategory,
      amountCents: Number(row.amount_cents),
      currency: "EUR",
      periodMonth: row.period_month,
      description: row.description,
      recurring: row.recurring,
      source: row.source as FinanceSource,
      evidenceClass: row.evidence_class as EvidenceClass,
    }
  }

  async function listActionsInternal(profileId: string): Promise<ConsultantResult<PlaybookAction[]>> {
    const { data, error } = await client
      .from("business_playbook_actions")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("profile_id", profileId)
      .order("horizon", { ascending: true })
      .order("priority", { ascending: false })
    if (error) return fail("ACTIONS_READ_FAILED", "ACTIONS_READ_FAILED")
    return ok((data ?? []).map(toAction))
  }

  return {
    ownerId,

    getProfile: ownProfile,

    async updateProfile(patch) {
      const { data, error } = await client
        .from("business_profiles")
        .upsert({ ...patch, owner_id: ownerId, updated_at: now() }, { onConflict: "owner_id" })
        .select("*")
        .single()
      if (error) {
        return isSchemaMissing(error)
          ? fail("BUSINESS_CONSULTANT_SCHEMA_NOT_READY", "BUSINESS_CONSULTANT_SCHEMA_NOT_READY")
          : fail("PROFILE_WRITE_FAILED", "PROFILE_WRITE_FAILED")
      }
      return ok(data)
    },

    async latestDiagnosis() {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return ok(null)
      const { data, error } = await client
        .from("business_diagnoses")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("profile_id", profile.data.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return fail("DIAGNOSIS_READ_FAILED", "DIAGNOSIS_READ_FAILED")
      return ok(data ?? null)
    },

    async runDiagnosis(input) {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return fail("PROFILE_REQUIRED", "PROFILE_REQUIRED")
      const row = profile.data

      // Gather the owner's own inputs. Every query is owner-scoped, so the
      // diagnosis can only ever see this owner's data.
      const [documentsResult, financeResult] = await Promise.all([
        client
          .from("business_documents")
          .select("document_id, category, summary")
          .eq("owner_id", ownerId)
          .eq("profile_id", row.id),
        client
          .from("business_finance_entries")
          .select("id, kind, category, amount_cents, period_month, source, evidence_class")
          .eq("owner_id", ownerId)
          .eq("profile_id", row.id)
          .order("period_month", { ascending: false })
          .limit(MAX_FINANCE_ENTRIES),
      ])
      if (documentsResult.error || financeResult.error) {
        return fail("DIAGNOSIS_INPUTS_FAILED", "DIAGNOSIS_INPUTS_FAILED")
      }

      const documents = (documentsResult.data ?? []).map((entry) => ({
        id: entry.document_id,
        category: entry.category,
        summary: entry.summary,
      }))
      const financeEntries = (financeResult.data ?? []).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        category: entry.category,
        amountCents: Number(entry.amount_cents),
        periodMonth: entry.period_month,
        source: entry.source,
        evidenceClass: entry.evidence_class,
      }))

      const missingProfileFields = missingProfileFieldsOf(row)
      const context: BusinessContextInput = {
        locale: input?.locale ?? "de",
        profile: {
          id: row.id,
          businessName: row.business_name,
          legalForm: row.legal_form,
          industry: row.industry,
          activityDescription: row.activity_description,
          city: row.city,
          foundedOn: row.founded_on,
          employeeCount: row.employee_count,
          annualRevenueBand: row.annual_revenue_band,
          bookkeepingMethod: row.bookkeeping_method,
          eInvoiceStatus: row.e_invoice_status,
          businessGoals: row.business_goals ?? [],
          businessChallenges: row.business_challenges ?? [],
          businessServices: row.business_services ?? [],
          businessTools: row.business_tools ?? [],
        },
        documents,
        financeEntries,
        missingProfileFields,
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60_000)
      let outcome
      try {
        outcome = await createBusinessDiagnosisRunner()({ context, signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      if (outcome.status !== "ready") {
        return fail(outcome.errorCode, outcome.errorCode)
      }

      // Supersede the previous live diagnosis, then insert the new one. The
      // partial unique index guarantees at most one live diagnosis per profile.
      await client
        .from("business_diagnoses")
        .update({ status: "superseded", updated_at: now() })
        .eq("owner_id", ownerId)
        .eq("profile_id", row.id)
        .eq("status", "ready")

      const { data: inserted, error: insertError } = await client
        .from("business_diagnoses")
        .insert({
          owner_id: ownerId,
          profile_id: row.id,
          status: "ready",
          model: outcome.model,
          prompt_version: outcome.promptVersion,
          content: outcome.content as unknown as Record<string, unknown>,
          input_references: outcome.content.inputReferences as unknown as unknown[],
          updated_at: now(),
        })
        .select("*")
        .single()
      if (insertError || !inserted) return fail("DIAGNOSIS_WRITE_FAILED", "DIAGNOSIS_WRITE_FAILED")

      const proposed = buildPlaybook(outcome.content)
      const actions: PlaybookAction[] = []
      for (const action of proposed) {
        const { data, error } = await client
          .from("business_playbook_actions")
          .upsert(
            {
              owner_id: ownerId,
              profile_id: row.id,
              diagnosis_id: inserted.id,
              horizon: action.horizon,
              action_key: action.actionKey,
              title: action.title.de,
              description: action.description.de,
              priority: action.priority,
              effort: action.effort,
              expected_benefit: action.expectedBenefit.de,
              required_documents: action.requiredDocuments as unknown as unknown[],
              dependencies: action.dependencies as unknown as unknown[],
              responsible: action.responsible,
              approval_required: action.approvalRequired,
              evidence_class: action.evidenceClass,
              updated_at: now(),
            },
            { onConflict: "owner_id,profile_id,horizon,action_key" },
          )
          .select("*")
          .single()
        // A regenerated plan refreshes existing actions; a status the user already
        // set is preserved because the upsert does not write `status`.
        if (!error && data) actions.push(toAction(data))
      }

      return ok({ diagnosis: inserted, actions })
    },

    async listActions() {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return ok([])
      return listActionsInternal(profile.data.id)
    },

    async applyAction(input) {
      // Owner-scoped read first: a foreign action id looks like a missing one.
      const { data: current, error: readError } = await client
        .from("business_playbook_actions")
        .select("*")
        .eq("id", input.actionId)
        .eq("owner_id", ownerId)
        .maybeSingle()
      if (readError) return fail("ACTION_READ_FAILED", "ACTION_READ_FAILED")
      if (!current) return fail("ACTION_NOT_FOUND", "ACTION_NOT_FOUND")

      const next = nextActionStatus(current.status as PlaybookActionStatus, input.action)
      if (!next) return fail("ACTION_TRANSITION_INVALID", "ACTION_TRANSITION_INVALID")

      const { data, error } = await client
        .from("business_playbook_actions")
        .update({ status: next, postponed_until: input.action === "postpone" ? current.postponed_until : null, updated_at: now() })
        .eq("id", input.actionId)
        .eq("owner_id", ownerId)
        .select("*")
        .single()
      if (error || !data) return fail("ACTION_WRITE_FAILED", "ACTION_WRITE_FAILED")
      return ok(toAction(data))
    },

    async listDocuments() {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return ok([])
      const { data, error } = await client
        .from("business_documents")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("profile_id", profile.data.id)
        .order("created_at", { ascending: false })
      if (error) return fail("DOCUMENTS_READ_FAILED", "DOCUMENTS_READ_FAILED")
      return ok((data ?? []).map(toDocumentLink))
    },

    async linkDocument(input) {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return fail("PROFILE_REQUIRED", "PROFILE_REQUIRED")

      // The document and case are resolved against the caller's own rows. A
      // foreign id is refused exactly like a missing one.
      if (!(await ownDocument(input.documentId))) return fail("DOCUMENT_NOT_FOUND", "DOCUMENT_NOT_FOUND")
      if (input.caseId && !(await ownCase(input.caseId))) return fail("CASE_NOT_FOUND", "CASE_NOT_FOUND")

      const { data, error } = await client
        .from("business_documents")
        .upsert(
          {
            owner_id: ownerId,
            profile_id: profile.data.id,
            document_id: input.documentId,
            case_id: input.caseId ?? null,
            category: input.category,
            updated_at: now(),
          },
          { onConflict: "owner_id,profile_id,document_id" },
        )
        .select("*")
        .single()
      if (error || !data) return fail("DOCUMENT_LINK_FAILED", "DOCUMENT_LINK_FAILED")
      return ok(toDocumentLink(data))
    },

    async listFinance() {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return ok([])
      const { data, error } = await client
        .from("business_finance_entries")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("profile_id", profile.data.id)
        .order("period_month", { ascending: false })
        .limit(MAX_FINANCE_ENTRIES)
      if (error) return fail("FINANCE_READ_FAILED", "FINANCE_READ_FAILED")
      return ok((data ?? []).map(toFinanceEntry))
    },

    async addFinanceEntry(input) {
      const profile = await ownProfile()
      if (profile.error) return fail(profile.error, profile.code)
      if (!profile.data) return fail("PROFILE_REQUIRED", "PROFILE_REQUIRED")

      if (input.documentId && !(await ownDocument(input.documentId))) {
        return fail("DOCUMENT_NOT_FOUND", "DOCUMENT_NOT_FOUND")
      }

      // A document-derived figure is a verified fact; a typed figure is
      // user-provided. The classification is decided here, not by the caller.
      const evidenceClass: EvidenceClass =
        input.source === "manual" ? "user_provided" : "verified_fact"

      const { data, error } = await client
        .from("business_finance_entries")
        .insert({
          owner_id: ownerId,
          profile_id: profile.data.id,
          document_id: input.documentId ?? null,
          kind: input.kind,
          category: input.category,
          amount_cents: input.amountCents,
          period_month: input.periodMonth,
          description: input.description ?? "",
          recurring: input.recurring ?? false,
          source: input.source,
          evidence_class: evidenceClass,
          updated_at: now(),
        })
        .select("*")
        .single()
      if (error || !data) return fail("FINANCE_WRITE_FAILED", "FINANCE_WRITE_FAILED")
      return ok(toFinanceEntry(data))
    },
  }
}

/** The profile fields the diagnosis would like but the owner has not supplied. */
export function missingProfileFieldsOf(row: BusinessProfileRow): string[] {
  const missing: string[] = []
  if (!row.activity_description) missing.push("activity_description")
  if (row.employee_count == null) missing.push("employee_count")
  if (!row.annual_revenue_band || row.annual_revenue_band === "unknown") missing.push("annual_revenue_band")
  if (!row.bookkeeping_method || row.bookkeeping_method === "unknown") missing.push("bookkeeping_method")
  if (!row.e_invoice_status || row.e_invoice_status === "not_sure") missing.push("e_invoice_status")
  if (!row.founded_on) missing.push("founded_on")
  if (!row.business_goals || row.business_goals.length === 0) missing.push("business_goals")
  if (!row.business_challenges || row.business_challenges.length === 0) missing.push("business_challenges")
  if (!row.business_services || row.business_services.length === 0) missing.push("business_services")
  return missing
}

/**
 * The transition table lives in `contract.ts` so the server and the UI read one
 * definition. Re-exported here for existing importers.
 */
export { nextActionStatus }

/**
 * Builds the service from the session. Mirrors `createAgentRunService`: no
 * session means no service, so a route cannot accidentally run unscoped.
 */
export async function createBusinessConsultantServiceFromSession(): Promise<{
  userId: string | null
  service: BusinessConsultantService | null
  schemaReady: boolean
}> {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return { userId: null, service: null, schemaReady: false }

  const service = createBusinessConsultantService(client, user.id)
  const probe = await client.from("business_diagnoses").select("id", { head: true, count: "exact" }).limit(1)
  const schemaReady = !isSchemaMissing(probe.error)
  return { userId: user.id, service, schemaReady }
}
