import { createClient } from "@/lib/supabase/server"
import { requestOrigin } from "@/lib/supabase/auth-routing"
import { NextResponse } from "next/server"

export async function POST(request: Request) { const supabase = await createClient(); await supabase.auth.signOut(); const origin = requestOrigin(request.headers, new URL(request.url).origin); return NextResponse.redirect(new URL("/", origin), 303) }
