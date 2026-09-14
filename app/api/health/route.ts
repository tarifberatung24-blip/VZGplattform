import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    build_sha: process.env.BUILD_SHA ?? "unknown",
  })
}
