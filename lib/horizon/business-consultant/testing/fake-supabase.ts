import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"

/**
 * An in-memory stand-in for the Supabase/PostgREST client, used to exercise the
 * *real* Business Consultant service and routes without a database.
 *
 * It is a faithful subset, not a mock of our own methods: it implements the
 * chained query builder the service uses (`from().select().eq().order().limit()
 * .maybeSingle()`, `insert().select().single()`, `upsert(..., { onConflict })`),
 * the owner-scoped RLS filter, and the constraints the migration declares — the
 * owner-qualified unique keys and the composite owner foreign keys.
 *
 * That matters for what these tests claim. Because the isolation and uniqueness
 * behaviour lives in the fake the same way the database declares it, a test that
 * passes here proves the service *asks* the right question (it always filters on
 * `owner_id`, it relies on the owner-qualified unique key, it cannot attach a
 * foreign profile/document/case). It does not prove Postgres enforces it — that
 * is what the rollback-only SQL test under `supabase/tests/rls` is for, and it is
 * reported separately.
 */

type Row = { [key: string]: unknown }

type Tables = {
  business_profiles: Row[]
  business_diagnoses: Row[]
  business_playbook_actions: Row[]
  business_documents: Row[]
  business_finance_entries: Row[]
  source_documents: Row[]
  cases: Row[]
}

type Session = {
  ownerId: string | null
  isServiceRole: boolean
}

const UNIQUE_VIOLATION = "23505"
const FOREIGN_KEY_VIOLATION = "23503"

let idCounter = 0
/** Produces a syntactically valid UUID so zod `.uuid()` validation passes. */
function nextId(prefix: string): string {
  idCounter += 1
  // A hex-only prefix: letters like the "s" in "case" are not valid hex digits.
  const hash = Array.from(prefix).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7)
  const safe = hash.toString(16).padStart(8, "0").slice(0, 8)
  const counter = String(idCounter).padStart(12, "0").slice(-12)
  return `${safe}-0000-4000-8000-${counter}`
}

/** Owner-qualified unique keys, matching the migration exactly. */
const UNIQUE_KEYS: Partial<Record<keyof Tables, string[][]>> = {
  business_profiles: [["owner_id"]],
  business_diagnoses: [["owner_id", "profile_id", "status"]],
  business_playbook_actions: [["owner_id", "profile_id", "horizon", "action_key"]],
  business_documents: [["owner_id", "profile_id", "document_id"]],
}

/** Composite owner foreign keys: (column, referenced table). */
const OWNER_FKS: Partial<Record<keyof Tables, Array<[string, keyof Tables]>>> = {
  business_diagnoses: [["profile_id", "business_profiles"]],
  business_playbook_actions: [["profile_id", "business_profiles"]],
  business_documents: [
    ["profile_id", "business_profiles"],
    ["document_id", "source_documents"],
  ],
  business_finance_entries: [["profile_id", "business_profiles"]],
}

export type FakeDb = {
  client: SupabaseClient<Database>
  tables: Tables
  session: Session
  failNext: (table: keyof Tables, code: string) => void
}

export function createBusinessFakeDb(options: { ownerId?: string | null; isServiceRole?: boolean } = {}): FakeDb {
  const tables: Tables = {
    business_profiles: [],
    business_diagnoses: [],
    business_playbook_actions: [],
    business_documents: [],
    business_finance_entries: [],
    source_documents: [],
    cases: [],
  }
  const session: Session = {
    ownerId: options.ownerId ?? null,
    isServiceRole: options.isServiceRole ?? false,
  }
  const queuedErrors: Array<{ table: keyof Tables; code: string }> = []

  const visible = (row: Row): boolean => session.isServiceRole || row.owner_id === session.ownerId

  const withDefaults = (table: keyof Tables, input: Row): Row => {
    const nowIso = new Date().toISOString()
    const base: Row = { id: input.id ?? nextId("id"), created_at: nowIso, updated_at: nowIso }
    if (table === "business_diagnoses") {
      Object.assign(base, {
        run_id: null,
        trace_id: nextId("trace"),
        status: "ready",
        content: {},
        input_references: [],
      })
    }
    if (table === "business_playbook_actions") {
      Object.assign(base, {
        diagnosis_id: null,
        description: "",
        priority: "medium",
        effort: "medium",
        expected_benefit: "",
        required_documents: [],
        dependencies: [],
        deadline: null,
        responsible: "user",
        approval_required: false,
        status: "pending",
        postponed_until: null,
        evidence_class: "recommendation",
      })
    }
    if (table === "business_documents") {
      Object.assign(base, { case_id: null, expires_on: null, renewal_on: null, summary: null })
    }
    if (table === "business_finance_entries") {
      Object.assign(base, { document_id: null, currency: "EUR", description: "", recurring: false })
    }
    return { ...base, ...input }
  }

  const matches = (row: Row, filters: Array<[string, unknown]>): boolean =>
    filters.every(([column, value]) => row[column] === value)

  function makeQuery(table: keyof Tables, mode: "select" | "insert" | "update", payload?: Row, onConflict?: string[]) {
    const filters: Array<[string, unknown]> = []
    let orderBy: { column: string; ascending: boolean } | null = null
    let limitCount: number | null = null
    let resultMode: "many" | "single" | "maybeSingle" = "many"

    const checkConstraints = (candidate: Row, excludeId?: unknown): { code: string; message: string } | null => {
      for (const [column, parentTable] of OWNER_FKS[table] ?? []) {
        const value = candidate[column]
        if (value == null) continue
        const parent = tables[parentTable].find((row) => row.id === value)
        if (!parent || !visible(parent)) {
          return { code: FOREIGN_KEY_VIOLATION, message: `foreign key ${String(column)}` }
        }
        if (parent.owner_id !== candidate.owner_id) {
          return { code: FOREIGN_KEY_VIOLATION, message: `cross-owner ${String(column)}` }
        }
      }
      for (const key of UNIQUE_KEYS[table] ?? []) {
        const clash = tables[table].some(
          (row) => row.id !== excludeId && key.every((column) => row[column] === candidate[column]),
        )
        if (clash) return { code: UNIQUE_VIOLATION, message: `duplicate key ${key.join(",")}` }
      }
      return null
    }

    const run = (): { data: unknown; error: { code: string; message: string } | null } => {
      const queued = queuedErrors.findIndex((entry) => entry.table === table)
      if (queued >= 0) {
        const [entry] = queuedErrors.splice(queued, 1)
        return { data: null, error: { code: entry.code, message: "injected" } }
      }

      const rows = tables[table]

      if (mode === "insert" && payload) {
        const candidate = withDefaults(table, payload)
        if (!session.isServiceRole && candidate.owner_id !== session.ownerId) {
          return { data: null, error: { code: "42501", message: "row violates row-level security policy" } }
        }
        if (onConflict) {
          const existing = rows.find((row) => onConflict.every((column) => row[column] === candidate[column]))
          if (existing) {
            const violation = checkConstraints(candidate, existing.id)
            if (violation) return { data: null, error: violation }
            Object.assign(existing, candidate, { id: existing.id })
            return resultMode === "single" ? { data: existing, error: null } : { data: [existing], error: null }
          }
        }
        const violation = checkConstraints(candidate)
        if (violation) return { data: null, error: violation }
        rows.push(candidate)
        return resultMode === "single" ? { data: candidate, error: null } : { data: [candidate], error: null }
      }

      if (mode === "update" && payload) {
        const updated: Row[] = []
        for (const row of rows) {
          if (!matches(row, filters)) continue
          if (!visible(row)) continue
          const candidate = { ...row, ...payload }
          if (!session.isServiceRole && candidate.owner_id !== session.ownerId) continue
          Object.assign(row, payload, { updated_at: new Date().toISOString() })
          updated.push(row)
        }
        if (resultMode === "single" || resultMode === "maybeSingle") {
          return { data: updated[0] ?? null, error: null }
        }
        return { data: updated, error: null }
      }

      let found = rows.filter((row) => visible(row) && matches(row, filters))
      if (orderBy) {
        const { column, ascending } = orderBy
        found = [...found].sort((a, b) => {
          const left = String(a[column] ?? "")
          const right = String(b[column] ?? "")
          return ascending ? left.localeCompare(right) : right.localeCompare(left)
        })
      }
      if (limitCount !== null) found = found.slice(0, limitCount)
      if (resultMode === "single" || resultMode === "maybeSingle") {
        return { data: found[0] ?? null, error: null }
      }
      return { data: found, error: null }
    }

    const query: Record<string, unknown> = {}
    const chain =
      (record: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        record(...args)
        return query
      }

    Object.assign(query, {
      select: chain(() => {}),
      eq: chain((column, value) => filters.push([column as string, value])),
      order: chain((column, opts) => {
        orderBy = { column: column as string, ascending: (opts as { ascending?: boolean } | undefined)?.ascending ?? true }
      }),
      limit: chain((count) => {
        limitCount = count as number
      }),
      single: chain(() => {
        resultMode = "single"
      }),
      maybeSingle: chain(() => {
        resultMode = "maybeSingle"
      }),
      then: (resolve: (value: unknown) => unknown) => resolve(run()),
    })
    return query
  }

  const client = {
    from(table: keyof Tables) {
      return {
        select: () => makeQuery(table, "select"),
        insert: (payload: Row) => makeQuery(table, "insert", payload),
        update: (payload: Row) => makeQuery(table, "update", payload),
        upsert: (payload: Row, options?: { onConflict?: string }) =>
          makeQuery(table, "insert", payload, options?.onConflict?.split(",")),
      }
    },
  }

  return {
    client: client as unknown as SupabaseClient<Database>,
    tables,
    session,
    failNext: (table, code) => queuedErrors.push({ table, code }),
  }
}

/** Seeds a visible business profile for the session owner. */
export function seedProfile(fake: FakeDb, ownerId: string, overrides: Row = {}): Row {
  const row = {
    id: nextId("prof"),
    owner_id: ownerId,
    business_name: "Betrieb Test",
    legal_form: "einzelunternehmen",
    industry: "Handwerk",
    activity_description: "Reparaturen",
    street_address: null,
    postal_code: null,
    city: "Berlin",
    vat_id: null,
    tax_number: null,
    trade_register_number: null,
    founded_on: "2020-01-01",
    employee_count: 1,
    annual_revenue_band: "under_22k",
    bookkeeping_method: "euer",
    e_invoice_status: "preparing",
    business_goals: ["mehr Kunden"],
    business_challenges: ["Zeit"],
    business_services: ["Reparatur"],
    business_tools: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
  fake.tables.business_profiles.push(row)
  return row
}

/** Seeds a visible uploaded document (source_documents) for an owner. */
export function seedDocument(fake: FakeDb, ownerId: string, caseId: string): Row {
  const row = {
    id: nextId("doc"),
    owner_id: ownerId,
    case_id: caseId,
    path: `${ownerId}/${caseId}/d.pdf`,
    mime: "application/pdf",
    size_bytes: 1024,
    sha256: "a".repeat(64),
    status: "READY",
    created_at: new Date().toISOString(),
  }
  fake.tables.source_documents.push(row)
  return row
}

/** Seeds a visible case for an owner. */
export function seedCase(fake: FakeDb, ownerId: string): Row {
  const row = {
    id: nextId("case"),
    owner_id: ownerId,
    title: "Case",
    intent: "reply",
    ui_locale: "de",
    conversation_locale: "de",
    status: "NEW",
    horizon_status: "collecting_data",
    horizon_module: "general",
    service_request_id: null,
    institution: null,
    deadline: null,
    created_at: new Date().toISOString(),
  }
  fake.tables.cases.push(row)
  return row
}
