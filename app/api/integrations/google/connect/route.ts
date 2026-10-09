import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { googleConsentUrl, oauthStateHash } from "@/lib/horizon/email/google-oauth"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url))
  try {
    const state = randomBytes(24).toString("base64url")
    const cookieStore = await cookies()
    cookieStore.set("horizon_google_oauth", oauthStateHash(state), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" })
    return NextResponse.redirect(googleConsentUrl(state))
  } catch {
    return NextResponse.json({ code: "GOOGLE_OAUTH_NOT_CONFIGURED" }, { status: 503 })
  }
}
