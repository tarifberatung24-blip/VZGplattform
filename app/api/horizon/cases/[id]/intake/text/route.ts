import { saveTextIntake } from "@/lib/horizon/intake/text-service"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "empty", ok: false }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const result = await saveTextIntake({
    caseId,
    locale: input.locale,
    kind: input.kind,
    text: input.text,
  })
  return Response.json(result, { status: result.ok ? 200 : textStatus(result.error) })
}

function textStatus(error: string | null): number {
  if (error === "unauthorized") return 401
  if (error === "missing_case") return 404
  if (error === "save_failed") return 500
  return 400
}
