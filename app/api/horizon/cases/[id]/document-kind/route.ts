import { saveDocumentKind } from "@/lib/horizon/unterlagen/document-kind-service"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await params
  const body = await request.json().catch(() => null)
  const kind = body && typeof body === "object" ? (body as Record<string, unknown>).kind : null
  const result = await saveDocumentKind({ caseId, kind })
  return Response.json(result, { status: result.ok ? 200 : documentKindStatus(result.error) })
}

function documentKindStatus(error: string | null): number {
  if (error === "unauthorized") return 401
  if (error === "case_not_found") return 404
  if (error === "failed") return 500
  return 400
}
