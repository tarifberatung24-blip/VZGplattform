import { NextResponse } from "next/server"
import { isFailure, requireEngine, requireOwnedSession } from "@/lib/horizon/negotiation/route-support"

/**
 * Reads one negotiation session with its timeline, offers and verifications.
 *
 * Every child query is owner-scoped inside the repository, so this route cannot
 * leak another account's rows even if a session id were guessed. The dossier is
 * read from the stored analysis rather than recomputed, so what the user sees is
 * exactly what was decided and recorded.
 */
export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const engine = await requireEngine()
  if (isFailure(engine)) return engine.response

  const { sessionId } = await context.params
  const session = await requireOwnedSession(engine, sessionId)
  if (isFailure(session)) return session.response

  const [events, offers, verifications] = await Promise.all([
    engine.repository!.listEvents(sessionId),
    engine.repository!.listOffers(sessionId),
    engine.repository!.listVerifications(sessionId),
  ])

  const analysis = (session.analysis ?? {}) as Record<string, unknown>
  return NextResponse.json({
    session,
    dossier: analysis.dossier ?? null,
    comparison_data_required: analysis.comparisonDataRequired ?? true,
    events: events.data ?? [],
    offers: offers.data ?? [],
    verifications: verifications.data ?? [],
  })
}
