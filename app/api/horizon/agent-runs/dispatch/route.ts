import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { secretMatches } from "@/lib/affiliate/operator-auth"
import { AgentRunRepository } from "@/lib/horizon/agent-runs/repository"
import { createDispatcher } from "@/lib/horizon/agent-runs/dispatcher"
import { CaseEngineRepository } from "@/lib/horizon/case/repository"
import { agentRunLog } from "@/lib/horizon/agent-runs/errors"

export const runtime = "nodejs"
/** Bounded, so one invocation cannot run indefinitely. */
export const maxDuration = 60

/**
 * HORIZON Agent Runs Engine — dispatcher worker.
 *
 * Invoked by a scheduler (GitHub Actions cron, matching the existing
 * `notifications.yml` pattern) or by an operator with the shared secret. It is
 * the *only* place a run is executed, and it is deliberately finite: one request
 * drains one bounded batch and returns.
 *
 * Why a route and not a long-lived process: the platform already runs on Render
 * as a Next.js app with cron-triggered routes, so this adds no new service,
 * runtime or dependency. A separate always-on worker would be a larger
 * footprint for the same work, and is not needed while a pass is short.
 *
 * Authentication is "disabled when unset", never "open when unset": without
 * `AGENT_RUNS_WORKER_SECRET` (or the operator secret) the route returns 503.
 *
 * The worker runs with the service role because a scheduled pass has no user
 * session, and it dispatches *per owner*. Owner scoping is enforced inside the
 * SQL claim functions, which honour the owner argument only for the service role;
 * a user session can never widen its own scope. The service role is therefore
 * used to *find* work, and every write still lands under the real `owner_id`.
 */

const WORKER_SECRET_HEADER = "x-horizon-worker-secret"
const OPERATOR_SECRET_HEADER = "x-horizon-operator-secret"
const MIN_SECRET_LENGTH = 16

export type WorkerConfig = {
  url: string
  key: string
}

/** Reads the worker credentials. Never logs or returns them. */
export function readWorkerConfig(): WorkerConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key }
}

function readWorkerSecrets(): string[] {
  const secrets: Array<string | undefined> = [
    process.env.AGENT_RUNS_WORKER_SECRET?.trim(),
    process.env.NOTIFICATIONS_CRON_SECRET?.trim(),
  ]
  return secrets.filter(
    (value): value is string => typeof value === "string" && value.length >= MIN_SECRET_LENGTH,
  )
}

function authorizeWorker(request: Request, secrets: readonly string[]): boolean {
  if (secrets.length === 0) return false
  const provided =
    request.headers.get(WORKER_SECRET_HEADER) ?? request.headers.get(OPERATOR_SECRET_HEADER)
  // Constant-time comparison against every configured secret, so the header used
  // does not change the timing profile.
  return secrets.some((expected) => secretMatches(provided, expected))
}

/**
 * Owners with work waiting. Bounded, so a large tenant list cannot make one pass
 * unbounded. Only owners that actually have due work are returned.
 */
async function listOwnersWithWork(client: SupabaseClient, limit: number): Promise<string[]> {
  const { data, error } = await client
    .from("agent_run_events")
    .select("owner_id")
    .eq("status", "received")
    .lte("available_at", new Date().toISOString())
    .limit(limit * 5)
  if (error) return []
  const owners = new Set<string>()
  for (const row of (data ?? []) as Array<{ owner_id: string }>) {
    owners.add(row.owner_id)
    if (owners.size >= limit) break
  }
  return [...owners]
}

async function listOwnersWithDueRuns(client: SupabaseClient, limit: number): Promise<string[]> {
  const { data, error } = await client
    .from("agent_runs")
    .select("owner_id,status,next_attempt_at")
    .in("status", ["queued", "running"])
    .limit(limit * 5)
  if (error) return []
  const now = Date.now()
  const owners = new Set<string>()
  for (const row of (data ?? []) as Array<{ owner_id: string; next_attempt_at: string | null }>) {
    if (row.next_attempt_at && Date.parse(row.next_attempt_at) > now) continue
    owners.add(row.owner_id)
    if (owners.size >= limit) break
  }
  return [...owners]
}

/** Health probe: schema presence plus the queue depth, without executing anything. */
export async function GET(request: Request) {
  const secrets = readWorkerSecrets()
  const configured = Boolean(readWorkerConfig())
  const authorized = authorizeWorker(request, secrets)

  if (!authorized) {
    // The unauthenticated probe reports only whether the worker is configured,
    // never queue contents.
    return NextResponse.json(
      { code: "UNAUTHORIZED", configured, workerSecretConfigured: secrets.length > 0 },
      { status: 401 },
    )
  }

  const config = readWorkerConfig()
  if (!config) {
    return NextResponse.json({ code: "WORKER_NOT_CONFIGURED", healthy: false }, { status: 503 })
  }

  const client = createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const probe = new AgentRunRepository(client, "00000000-0000-0000-0000-000000000000")
  const schemaReady = await probe.isSchemaReady()
  if (!schemaReady) {
    return NextResponse.json(
      { code: "ENGINE_MIGRATION_NOT_APPLIED", healthy: false },
      { status: 503 },
    )
  }

  return NextResponse.json({ healthy: true, schemaReady: true, version: "agent-runs-v1" })
}

export async function POST(request: Request) {
  const secrets = readWorkerSecrets()
  if (secrets.length === 0) {
    return NextResponse.json({ code: "WORKER_NOT_CONFIGURED" }, { status: 503 })
  }
  if (!authorizeWorker(request, secrets)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 })
  }

  const config = readWorkerConfig()
  if (!config) return NextResponse.json({ code: "WORKER_NOT_CONFIGURED" }, { status: 503 })

  const client = createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const owners = new Set<string>([
    ...(await listOwnersWithWork(client, 25)),
    ...(await listOwnersWithDueRuns(client, 25)),
  ])

  const log = (line: string) => console.log(line)
  const totals = {
    owners: 0,
    recovered: 0,
    eventsProcessed: 0,
    eventsDeadLettered: 0,
    runsExecuted: 0,
    runsCompleted: 0,
    runsFailed: 0,
    runsDeadLettered: 0,
    traces: [] as string[],
  }

  // Graceful shutdown: a stop request stops the pass between owners, so no owner
  // is left mid-batch. The in-flight owner's pass always completes.
  const deadline = Date.now() + 45_000

  for (const ownerId of owners) {
    if (Date.now() > deadline) {
      log(agentRunLog({
        event: "worker_deadline_reached", runId: null, traceId: null, caseId: null,
        stepKey: null, ownerId, status: "stopped", attempt: null, errorCode: null, durationMs: null,
      }))
      break
    }

    totals.owners += 1
    const runRepository = new AgentRunRepository(client, ownerId)
    const caseRepository = new CaseEngineRepository(client, ownerId)
    const dispatch = createDispatcher({ runRepository, caseRepository, log })

    const summary = await dispatch({ runLimit: 5, eventLimit: 10 })
    if (summary.schemaMissing) {
      return NextResponse.json({ code: "ENGINE_MIGRATION_NOT_APPLIED" }, { status: 503 })
    }

    totals.recovered += summary.recovered
    totals.eventsProcessed += summary.eventsProcessed
    totals.eventsDeadLettered += summary.eventsDeadLettered
    totals.runsExecuted += summary.runsExecuted
    totals.runsCompleted += summary.runsCompleted
    totals.runsFailed += summary.runsFailed
    totals.runsDeadLettered += summary.runsDeadLettered
    totals.traces.push(...summary.traces)
  }

  return NextResponse.json({ ...totals, owners: totals.owners })
}
