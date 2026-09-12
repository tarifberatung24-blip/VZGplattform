import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    build_sha: process.env.BUILD_SHA ?? "unknown",
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured",
    ai_provider: process.env.GROQ_API_KEY ? "configured" : "not_configured",
    ai_reachable: "not_checked",
  })
}
