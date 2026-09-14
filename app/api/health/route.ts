import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    revision: process.env.RENDER_GIT_COMMIT ?? "unknown",
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
