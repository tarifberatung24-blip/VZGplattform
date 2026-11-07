import { NextResponse } from "next/server"
import { z } from "zod"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"
import { summariseFinance } from "@/lib/horizon/business-consultant/finance"
import { FINANCE_CATEGORIES, FINANCE_KINDS, FINANCE_SOURCES } from "@/lib/horizon/business-consultant/contract"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — finance entries and cash-flow summary.
 *
 * GET returns the entries plus a deterministic summary computed in code. POST
 * adds one entry.
 *
 * The summary is never produced by a model: a number the owner acts on is either
 * an entry they made or a figure a document carried, and the summary states which.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

const addSchema = z
  .object({
    kind: z.enum(FINANCE_KINDS),
    category: z.enum(FINANCE_CATEGORIES),
    // Integer cents, bounded. A float or a negative amount is refused here and
    // again by the database CHECK.
    amountCents: z.number().int().min(0).max(1_000_000_000),
    periodMonth: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
    description: z.string().trim().max(500).optional(),
    recurring: z.boolean().optional(),
    source: z.enum(FINANCE_SOURCES),
    documentId: z.string().trim().uuid().nullable().optional(),
  })
  .strict()

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const entries = await service.listFinance()
  if (entries.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (entries.error) return NextResponse.json({ code: entries.code ?? "FINANCE_READ_FAILED" }, { status: 502 })

  return NextResponse.json({ entries: entries.data ?? [], summary: summariseFinance(entries.data ?? []) })
}

export async function POST(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`business-consultant:finance:user:${userId}`, {
    limit: 120,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_FINANCE_ENTRY" }, { status: 400 })

  // Normalise to the first of the month so the monthly view is deterministic.
  const periodMonth = `${parsed.data.periodMonth.slice(0, 7)}-01`

  const result = await service.addFinanceEntry({
    kind: parsed.data.kind,
    category: parsed.data.category,
    amountCents: parsed.data.amountCents,
    periodMonth,
    description: parsed.data.description,
    recurring: parsed.data.recurring,
    source: parsed.data.source,
    documentId: parsed.data.documentId ?? null,
  })
  if (result.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (result.error || !result.data) {
    const code = result.code ?? "FINANCE_WRITE_FAILED"
    const status = code === "DOCUMENT_NOT_FOUND" ? 404 : code === "PROFILE_REQUIRED" ? 409 : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json({ entry: result.data }, { status: 201 })
}
