import { NextResponse } from "next/server"
import { z } from "zod"
import { confirmFacts, generateDraft } from "@/lib/office/workflow/records"

const idSchema = z.string().trim().min(1).max(100)
const factSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(4000),
  evidence: z.string().trim().max(4000).optional(),
  page_no: z.number().int().positive().max(10_000).optional(),
}).strict()

const workflowSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm-facts"),
    facts: z.array(factSchema).min(1).max(100),
    documentId: idSchema.optional(),
  }).strict(),
  z.object({
    action: z.literal("generate-draft"),
    documentIds: z.array(idSchema).max(20).default([]),
    outputLocale: z.enum(["bg", "de", "ru", "pl", "sr", "ro"]).default("de"),
  }).strict(),
])

function errorStatus(error: string | undefined) {
  if (error === "Unauthorized") return 401
  if (error === "Case not found") return 404
  if (error === "AI quota exceeded") return 429
  if (error === "AI temporarily unavailable; please retry shortly") return 503
  return 400
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ code: "INVALID_CASE_ID" }, { status: 400 })
  }

  const parsed = workflowSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_WORKFLOW_INPUT" }, { status: 400 })
  }

  const result = parsed.data.action === "confirm-facts"
    ? await confirmFacts(id, parsed.data.facts, parsed.data.documentId)
    : await generateDraft(id, parsed.data.outputLocale, [...new Set(parsed.data.documentIds)])

  return NextResponse.json(result, {
    status: "error" in result ? errorStatus(result.error) : 201,
  })
}
