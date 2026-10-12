import { NextResponse } from "next/server"
import { isAwinConfigured } from "@/lib/affiliate/awin"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    revision: process.env.RENDER_GIT_COMMIT ?? "unknown",
    // Whether an integration is configured, never its values.
    integrations: { awin: isAwinConfigured() },
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
