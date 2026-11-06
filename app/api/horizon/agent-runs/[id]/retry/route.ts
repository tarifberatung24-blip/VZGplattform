import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"

export const runtime = "nodejs"

/**
 * Re-queues a failed run so the dispatcher picks it up again.
 *
 * Only a `failed` run may be retried. A completed run is refused, which is what
 * stops a retry from re-running work that already succeeded and duplicating its
 * output.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = await params

  const engine = await createAgentRunService()
  if (!engine.userId || !engine.service) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }
  if (!engine.schemaReady) {
    return NextResponse.json({ code: "ENGINE_MIGRATION_NOT_APPLIED" }, { status: 503 })
  }
  if (!z.string().uuid().safeParse(runId).success) {
    return NextResponse.json({ code: "RUN_NOT_FOUND" }, { status: 404 })
  }

  const existing = await engine.service.runs.getRun(runId)
  if (existing.error || !existing.data) {
    return NextResponse.json({ code: "RUN_NOT_FOUND" }, { status: 404 })
  }

  const retried = await engine.service.runs.retryRun(runId)
  if (retried.error || !retried.data) {
    // The state machine refused it: the run is completed, cancelled, or terminal.
    return NextResponse.json({ code: "RUN_NOT_RETRYABLE" }, { status: 409 })
  }

  return NextResponse.json({ run: retried.data })
}
