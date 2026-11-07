import { NextResponse } from "next/server"
import { z } from "zod"
import { createBusinessConsultantServiceFromSession } from "@/lib/horizon/business-consultant/service"
import { BUSINESS_DOCUMENT_CATEGORIES } from "@/lib/horizon/business-consultant/contract"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * HORIZON Business Consultant — business documents.
 *
 * GET lists the documents linked to the caller's business workspace. POST links
 * an already-uploaded document to it.
 *
 * This route never uploads a file. Upload, storage and OCR remain the existing
 * document pipeline; this route only records the association, after verifying
 * that the document and any case id belong to the caller.
 */

const SCHEMA_MISSING = { code: "BUSINESS_CONSULTANT_SCHEMA_NOT_READY" } as const

const linkSchema = z
  .object({
    documentId: z.string().trim().uuid(),
    caseId: z.string().trim().uuid().nullable().optional(),
    category: z.enum(BUSINESS_DOCUMENT_CATEGORIES),
  })
  .strict()

export async function GET() {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const documents = await service.listDocuments()
  if (documents.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (documents.error) return NextResponse.json({ code: documents.code ?? "DOCUMENTS_READ_FAILED" }, { status: 502 })

  return NextResponse.json({ documents: documents.data ?? [] })
}

export async function POST(request: Request) {
  const { service, userId } = await createBusinessConsultantServiceFromSession()
  if (!userId || !service) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`business-consultant:documents:user:${userId}`, {
    limit: 60,
    windowMs: 10 * 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = linkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "INVALID_DOCUMENT_LINK" }, { status: 400 })

  const result = await service.linkDocument({
    documentId: parsed.data.documentId,
    caseId: parsed.data.caseId ?? null,
    category: parsed.data.category,
  })
  if (result.code === "BUSINESS_CONSULTANT_SCHEMA_NOT_READY") {
    return NextResponse.json(SCHEMA_MISSING, { status: 503 })
  }
  if (result.error || !result.data) {
    const code = result.code ?? "DOCUMENT_LINK_FAILED"
    // A foreign document or case is reported exactly like a missing one.
    const status = code === "DOCUMENT_NOT_FOUND" || code === "CASE_NOT_FOUND" ? 404 : code === "PROFILE_REQUIRED" ? 409 : 502
    return NextResponse.json({ code }, { status })
  }

  return NextResponse.json({ document: result.data }, { status: 201 })
}
