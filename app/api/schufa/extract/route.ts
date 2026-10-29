import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { extractDocumentText } from "@/lib/documents/extraction"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(["application/pdf"])

/**
 * Reads the text out of an uploaded SCHUFA data copy.
 *
 * The file is processed in memory and is not written to storage: the user uploads
 * it to *read* it, and the plan is derived from the text. A scanned copy that
 * carries no text layer returns `ocr_required`, and the page asks the user to
 * paste the text instead — the alternative, guessing at an image, would produce a
 * plan about a document nobody read.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 })

  const rate = checkRateLimit(`schufa-extract:user:${user.id}`, { limit: 20, windowMs: 10 * 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { code: "RATE_LIMITED", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ code: "FILE_EMPTY" }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ code: "FILE_EMPTY" }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ code: "FILE_TOO_LARGE" }, { status: 413 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ code: "FILE_TYPE_UNSUPPORTED" }, { status: 415 })

  try {
    const result = await extractDocumentText(file, file.type)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ code: "EXTRACTION_FAILED" }, { status: 502 })
  }
}
