import { NextResponse } from "next/server"
import { z } from "zod"
import { createCaseEngine } from "@/lib/horizon/case"
import { getAlphaTeamManifest, planAlphaTask } from "@/lib/horizon/agent/team"

export const runtime = "nodejs"

const requestSchema = z
  .object({
    objective: z.string().trim().min(1).max(2000),
    caseId: z.string().trim().min(1).max(120).optional(),
    documentIds: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    locale: z.enum(["bg", "de"]).optional(),
  })
  .strict()

const CASE_NOT_AVAILABLE = { code: "CASE_NOT_FOUND" } as const
const DOCUMENTS_NOT_AVAILABLE = { code: "DOCUMENTS_NOT_FOUND" } as const

/**
 * Alpha Team control plane.
 *
 * GET returns the registered teams/SOP metadata. POST validates the supplied
 * case and documents through the owner-scoped Case Engine, then only plans and
 * routes a task. It does not call a model or execute an external action.
 */
export async function GET() {
  const engine = await createCaseEngine()
  if (!engine.userId) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  return NextResponse.json(getAlphaTeamManifest(), {
    headers: { "x-horizon-alpha-team-version": "alpha-team-v1" },
  })
}

export async function POST(request: Request) {
  const engine = await createCaseEngine()
  if (!engine.userId || !engine.repository) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_ALPHA_TASK" }, { status: 400 })

  const input = parsed.data
  if (input.documentIds?.length && !input.caseId) {
    return NextResponse.json({ code: "CASE_CONTEXT_REQUIRED" }, { status: 400 })
  }

  let caseContext = null
  if (input.caseId) {
    if (!/^[0-9a-f-]{36}$/i.test(input.caseId)) {
      return NextResponse.json(CASE_NOT_AVAILABLE, { status: 404 })
    }
    // One owner-scoped read supplies both case ownership and the document IDs.
    const loaded = await engine.repository.loadCaseContext(input.caseId)
    if (loaded.error || !loaded.data) {
      // Do not distinguish a missing case from a case owned by another user.
      return NextResponse.json(CASE_NOT_AVAILABLE, { status: 404 })
    }
    caseContext = loaded.data

    const submittedDocumentIds = input.documentIds ?? []
    const ownedDocumentIds = new Set(caseContext.documentIds)
    if (submittedDocumentIds.some((id) => !ownedDocumentIds.has(id))) {
      // A foreign, missing or cross-case document is intentionally indistinguishable.
      return NextResponse.json(DOCUMENTS_NOT_AVAILABLE, { status: 404 })
    }
  }

  try {
    const plan = planAlphaTask({ ...input, contextValidated: Boolean(caseContext) })
    return NextResponse.json({
      plan,
      context: caseContext
        ? { caseId: caseContext.caseId, documentIds: caseContext.documentIds }
        : null,
    }, {
      headers: { "x-horizon-alpha-team-version": plan.version },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_ALPHA_TASK"
    return NextResponse.json({ code }, { status: 400 })
  }
}
