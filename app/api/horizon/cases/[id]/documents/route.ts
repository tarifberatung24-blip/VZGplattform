import { saveDocumentIntake } from "@/lib/horizon/intake/document-service"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await params
  const form = await request.formData().catch(() => null)
  const result = await saveDocumentIntake({
    caseId,
    kind: form?.get("kind"),
    file: form?.get("file"),
  })
  return Response.json(result, { status: result.ok ? 201 : documentStatus(result.error) })
}

function documentStatus(error: string | null): number {
  if (error === "UNAUTHORIZED") return 401
  if (error === "CASE_NOT_FOUND" || error === "missing_case") return 404
  if (error === "STORAGE_NOT_CONFIGURED") return 503
  if (error === "UPLOAD_FAILED") return 502
  return 400
}
