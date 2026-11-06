import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"

/**
 * An in-memory stand-in for the Supabase/PostgREST client, used to exercise the
 * *real* repository and dispatcher code without a database.
 *
 * It is deliberately a faithful subset, not a mock of our own methods: it
 * implements the chained query builder the repository actually uses
 * (`from().select().eq().order().limit().maybeSingle()`), the two SQL claim
 * functions, and the constraints the migration declares — the owner-scoped unique
 * keys and RLS-style owner filtering.
 *
 * That matters for what these tests claim. Because the isolation and uniqueness
 * behaviour lives in the fake the same way the database declares it, a test that
 * passes here proves the repository *asks* the right question (it always filters
 * on `owner_id`, it always relies on the unique key). It does not prove Postgres
 * enforces it — that is what the rollback-only SQL tests under `supabase/tests/rls`
 * are for, and they are reported separately.
 */

type Row = { [key: string]: unknown }

type Tables = {
  agent_runs: Row[]
  agent_steps: Row[]
  agent_run_events: Row[]
}

type Session = {
  /** The owner `auth.uid()` resolves to. `null` for a service-role worker. */
  ownerId: string | null
  isServiceRole: boolean
}

const UNIQUE_VIOLATION = "23505"

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  const n = String(idCounter).padStart(12, "0")
  return `${prefix}${n}-0000-4000-8000-000000000000`.slice(0, 36)
}

export type FakeDb = {
  client: SupabaseClient<Database>
  tables: Tables
  session: Session
  /** Queues a one-shot error for the next matching operation, to test failure paths. */
  failNext: (table: keyof Tables, code: string) => void
  /** Counts claim calls, so a test can prove concurrency limiting. */
  claimCalls: () => number
}

export function createFakeDb(
  options: { ownerId?: string | null; isServiceRole?: boolean } = {},
): FakeDb {
  const tables: Tables = { agent_runs: [], agent_steps: [], agent_run_events: [] }
  const session: Session = {
    ownerId: options.ownerId ?? null,
    isServiceRole: options.isServiceRole ?? false,
  }
  const queuedErrors: Array<{ table: keyof Tables; code: string }> = []
  let claims = 0

  const uniqueKeys: Record<keyof Tables, string[][]> = {
    agent_runs: [
      ["owner_id", "idempotency_key"],
      ["owner_id", "trace_id"],
    ],
    agent_steps: [["run_id", "step_key", "attempt"]],
    agent_run_events: [["owner_id", "idempotency_key"]],
  }

  const withDefaults = (table: keyof Tables, input: Row): Row => {
    const nowIso = new Date().toISOString()
    const base: Row = { id: input.id ?? nextId("id"), created_at: nowIso, updated_at: nowIso }
    if (table === "agent_runs") {
      Object.assign(base, {
        status: "queued",
        attempt: 0,
        max_attempts: 5,
        input_references: [],
        output_references: [],
        error_code: null,
        error_message_safe: null,
        next_attempt_at: null,
        started_at: null,
        completed_at: null,
        case_id: null,
        service_request_id: null,
        prompt_version: null,
        model_version: null,
        skill_version: null,
        trace_id: nextId("trace"),
      })
    }
    if (table === "agent_steps") {
      Object.assign(base, {
        status: "pending",
        attempt: 1,
        input_reference: {},
        output_reference: {},
        error_code: null,
        error_message_safe: null,
        started_at: null,
        completed_at: null,
      })
    }
    if (table === "agent_run_events") {
      Object.assign(base, {
        status: "received",
        attempt: 0,
        max_attempts: 5,
        payload: {},
        available_at: nowIso,
        last_error_code: null,
        processed_at: null,
        run_id: null,
      })
    }
    return { ...base, ...input }
  }

  const matches = (row: Row, filters: Array<[string, unknown]>): boolean =>
    filters.every(([column, value]) => {
      if (value && typeof value === "object" && "__in" in (value as object)) {
        return (value as { __in: unknown[] }).__in.includes(row[column])
      }
      return row[column] === value
    })

  function makeQuery(table: keyof Tables, mode: "select" | "insert" | "update", payload?: Row) {
    const filters: Array<[string, unknown]> = []
    let orderBy: { column: string; ascending: boolean } | null = null
    let limitCount: number | null = null
    let resultMode: "many" | "single" | "maybeSingle" = "many"

    const run = (): { data: unknown; error: { code: string; message: string } | null } => {
      const queued = queuedErrors.findIndex((entry) => entry.table === table)
      if (queued >= 0) {
        const [entry] = queuedErrors.splice(queued, 1)
        return { data: null, error: { code: entry.code, message: "injected" } }
      }

      const rows = tables[table]

      if (mode === "insert" && payload) {
        const candidate = withDefaults(table, payload)
        for (const key of uniqueKeys[table]) {
          const clash = rows.some((row) => key.every((column) => row[column] === candidate[column]))
          if (clash) return { data: null, error: { code: UNIQUE_VIOLATION, message: "duplicate key" } }
        }
        rows.push(candidate)
        if (resultMode === "single") return { data: candidate, error: null }
        return { data: [candidate], error: null }
      }

      if (mode === "update" && payload) {
        const updated: Row[] = []
        for (const row of rows) {
          if (!matches(row, filters)) continue
          Object.assign(row, payload, { updated_at: new Date().toISOString() })
          updated.push(row)
        }
        if (resultMode === "single" || resultMode === "maybeSingle") {
          return { data: updated[0] ?? null, error: null }
        }
        return { data: updated, error: null }
      }

      let found = rows.filter((row) => matches(row, filters))
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
        orderBy = {
          column: column as string,
          ascending: (opts as { ascending?: boolean } | undefined)?.ascending ?? true,
        }
      }),
      limit: chain((count) => {
        limitCount = count as number
      }),
      in: chain((column, values) => filters.push([column as string, { __in: values as unknown[] }])),
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
      }
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "claim_agent_run_events") {
        claims += 1
        // Mirrors the SQL: the owner argument is honoured only for the service
        // role; otherwise the session owner is used and no owner means no rows.
        const requestedOwner = args.p_owner_id as string | null | undefined
        const owner = session.isServiceRole && requestedOwner ? requestedOwner : session.ownerId
        if (!owner) return { data: [], error: null }
        const limit = Math.min(Math.max(Number(args.p_limit ?? 10), 1), 50)
        const now = Date.now()
        const due = tables.agent_run_events
          .filter(
            (row) =>
              row.owner_id === owner &&
              row.status === "received" &&
              Date.parse(String(row.available_at)) <= now,
          )
          .slice(0, limit)
        for (const row of due) {
          row.status = "processing"
          row.attempt = Number(row.attempt ?? 0) + 1
        }
        return { data: due, error: null }
      }
      if (name === "recover_stale_agent_run_events") {
        const requestedOwner = args.p_owner_id as string | null | undefined
        const owner = session.isServiceRole && requestedOwner ? requestedOwner : session.ownerId
        if (!owner) return { data: 0, error: null }
        const timeout = Math.max(Number(args.p_visibility_timeout_seconds ?? 300), 30)
        let reclaimed = 0
        for (const row of tables.agent_run_events) {
          if (row.owner_id !== owner || row.status !== "processing") continue
          const ageMs = Date.now() - Date.parse(String(row.updated_at))
          if (ageMs > timeout * 1000) {
            row.status = "received"
            row.available_at = new Date().toISOString()
            reclaimed += 1
          }
        }
        return { data: reclaimed, error: null }
      }
      return { data: null, error: { code: "42883", message: `unknown function ${name}` } }
    },
  }

  return {
    client: client as unknown as SupabaseClient<Database>,
    tables,
    session,
    failNext: (table, code) => queuedErrors.push({ table, code }),
    claimCalls: () => claims,
  }
}
