import { NextResponse } from "next/server"
import { businessProfileInputSchema } from "@/lib/horizon/business-profile/validation"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — the business profile.
 *
 * This is the Business Profile MVP contract extended with the Module A fields
 * (`business_services`, `business_tools`). It replaces the MVP route rather than
 * living beside it, so there is exactly one profile endpoint and one source of
 * truth for the profile.
 *
 * Owner-scoped: the profile is resolved from the session, never from a
 * caller-supplied id, and the write carries `owner_id` from the session.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const profile = await service.getProfile()
  if (profile.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (profile.error) return NextResponse.json({ code: profile.code ?? "PROFILE_READ_FAILED" }, { status: 502 })

  return NextResponse.json({ profile: profile.data })
}

export async function PUT(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const parsed = businessProfileInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_BUSINESS_PROFILE", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const saved = await service.updateProfile(parsed.data)
  if (saved.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (saved.error || !saved.data) return NextResponse.json({ code: "PROFILE_WRITE_FAILED" }, { status: 502 })

  return NextResponse.json({ profile: saved.data })
}
