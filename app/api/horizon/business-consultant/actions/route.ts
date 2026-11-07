import { NextResponse } from "next/server"
import { z } from "zod"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"
import { PLAYBOOK_USER_ACTIONS } from "@/lib/horizon/business-consultant/contract"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — playbook actions.
 *
 * GET lists the caller's actions. PATCH applies a user-driven action
 * (start / complete / postpone / reject / reopen).
 *
 * Only the user drives these transitions. There is no endpoint by which the
 * consultant, the model or a worker can complete an action on the user's behalf,
 * which is what keeps the plan a proposal rather than an instruction.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

const patchSchema = z
  .object({
    actionId: z.string().trim().uuid(),
    action: z.enum(PLAYBOOK_USER_ACTIONS),
  })
  .strict()

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const actions = await service.listActions()
  if (actions.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (actions.error) return NextResponse.json({ code: actions.code ?? "ACTIONS_READ_FAILED" }, { status: 502 })

  return NextResponse.json({ actions: actions.data ?? [] })
}

export async function PATCH(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_ACTION_REQUEST" }, { status: 400 })

  const result = await service.applyAction(parsed.data)
  if (result.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (result.error || !result.data) {
    const code = result.code ?? "ACTION_WRITE_FAILED"
    // A foreign or missing action is reported as not found, never as forbidden.
    const status = code === "ACTION_NOT_FOUND" ? 404 : code === "ACTION_TRANSITION_INVALID" ? 409 : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json({ action: result.data })
}
