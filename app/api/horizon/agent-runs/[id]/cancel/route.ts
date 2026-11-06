import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"

export const runtime = "nodejs"

/**
 * Cancels a run. Cancellation is a user-driven transition and is refused for a
 * run that already reached a terminal state, so it cannot be used to rewrite
 * history.
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

  const cancelled = await engine.service.runs.cancelRun(runId)
  if (cancelled.error || !cancelled.data) {
    return NextResponse.json({ code: "RUN_NOT_CANCELLABLE" }, { status: 409 })
  }

  return NextResponse.json({ run: cancelled.data })
}
