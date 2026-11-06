import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"

export const runtime = "nodejs"

/**
 * HORIZON Agent Runs Engine — one run.
 *
 * Returns the run, its steps and its events: the operator console contract.
 * Everything comes from persisted rows; nothing is simulated. A run owned by
 * another user returns 404, identical to a run that does not exist, so the
 * endpoint cannot be used to probe for the existence of another user's runs.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = await params

  const engine = await createAgentRunService()
  if (!engine.userId || !engine.service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }
  if (!engine.schemaReady) {
    return NextResponse.json({ code: "ENGINE_MIGRATION_NOT_APPLIED" }, { status: 503 })
  }

  // The path id is authoritative. Accepting a run id in the body as well would
  // create two sources of truth for which run is being read.
  if (!z.string().uuid().safeParse(runId).success) {
    return NextResponse.json({ code: "RUN_NOT_FOUND" }, { status: 404 })
  }

  const history = await engine.service.getRunHistory(runId)
  if (history.error || !history.data) {
    return NextResponse.json({ code: "RUN_NOT_FOUND" }, { status: 404 })
  }

  return NextResponse.json(
    {
      run: history.data.run,
      steps: history.data.steps,
      events: history.data.events,
    },
    { headers: { "x-horizon-trace-id": history.data.run.traceId } },
  )
}
