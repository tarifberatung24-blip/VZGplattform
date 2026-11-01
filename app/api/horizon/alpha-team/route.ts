import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
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

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Alpha Team control plane.
 *
 * GET returns the registered teams/SOP metadata. POST only plans and routes a
 * task. It deliberately does not call a model or execute an external action.
 */
export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })
  return NextResponse.json(getAlphaTeamManifest(), {
    headers: { "x-horizon-alpha-team-version": "alpha-team-v1" },
  })
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_ALPHA_TASK" }, { status: 400 })

  try {
    const plan = planAlphaTask(parsed.data)
    return NextResponse.json({ plan }, {
      headers: { "x-horizon-alpha-team-version": plan.version },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_ALPHA_TASK"
    return NextResponse.json({ code }, { status: 400 })
  }
}
