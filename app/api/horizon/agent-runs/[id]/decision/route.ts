import { NextResponse } from "next/server"
import { z } from "zod"
import { createAgentRunService } from "@/lib/horizon/agent-runs"

export const runtime = "nodejs"

/**
 * HORIZON Agent Runs Engine — the human decision on a run.
 *
 * This is the only endpoint that may move a run out of `awaiting_approval`. It
 * records the decision as a `USER_APPROVAL_GRANTED` / `USER_APPROVAL_REJECTED`
 * event in the owner-scoped outbox and applies it through the same transition
 * table the dispatcher uses. Approving returns the run to `running`; it does not
 * execute anything here — the bounded dispatcher performs the work, so the
 * approval boundary is never bypassed by the approve call itself.
 *
 * A run owned by another user returns 404, identical to a run that does not
 * exist. A run that is not waiting for a decision returns 409, so a decision can
 * never be replayed onto a finished run.
 */

const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]) }).strict()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_DECISION" }, { status: 400 })
  }

  const decided = await engine.service.decideRun({ runId, decision: parsed.data.decision })
  if (decided.error || !decided.data) {
    const code = decided.code ?? "DECISION_FAILED"
    const status = code === "RUN_NOT_FOUND" ? 404 : code === "RUN_NOT_AWAITING_DECISION" ? 409 : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json(
    { run: decided.data.run, duplicate: decided.data.duplicate },
    { headers: { "x-horizon-trace-id": decided.data.run.traceId } },
  )
}
