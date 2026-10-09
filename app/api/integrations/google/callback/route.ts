import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { exchangeGoogleCode, googleAccount, oauthStateHash, sealToken } from "@/lib/horizon/email/google-oauth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) return NextResponse.json({ code: "GOOGLE_OAUTH_CALLBACK_INVALID" }, { status: 400 })
  const cookieStore = await cookies()
  const expected = cookieStore.get("horizon_google_oauth")?.value
  cookieStore.delete("horizon_google_oauth")
  if (!expected || expected !== oauthStateHash(state)) return NextResponse.json({ code: "GOOGLE_OAUTH_STATE_INVALID" }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url))
  try {
    const token = await exchangeGoogleCode(code)
    if (!token.refresh_token) return NextResponse.json({ code: "GOOGLE_OAUTH_NO_REFRESH_TOKEN" }, { status: 400 })
    const email = await googleAccount(token.access_token)
    const { error } = await supabase.from("user_email_connections").upsert({ user_id: user.id, provider: "google", email, access_token_ciphertext: sealToken(token.access_token), refresh_token_ciphertext: sealToken(token.refresh_token), access_token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(), scopes: (token.scope ?? "").split(" ").filter(Boolean), updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    if (error) return NextResponse.json({ code: "GOOGLE_CONNECTION_SAVE_FAILED" }, { status: 500 })
    return NextResponse.redirect(new URL("/bg/vertraege?email=google_connected", request.url))
  } catch {
    return NextResponse.json({ code: "GOOGLE_OAUTH_FAILED" }, { status: 502 })
  }
}
