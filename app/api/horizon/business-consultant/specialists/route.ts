import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listBusinessSpecialists } from "@/lib/horizon/business-consultant/specialists"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — the specialist roster.
 *
 * Returns the closed list of specialists, the Alpha Team agent each one runs as,
 * and the exact operations each one may request. There is no run trigger here:
 * the specialists execute through the merged Agent Runs Engine, not through a new
 * endpoint. This route only publishes what the registry and the safety gate
 * already enforce, so the operator console can show real permissions.
 *
 * Authentication is required even though the payload is static, so the roster is
 * never an anonymous discovery surface.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  return NextResponse.json({
    version: "business-consultant-v1",
    specialists: listBusinessSpecialists(),
  })
}
