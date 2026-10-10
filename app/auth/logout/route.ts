import { createClient } from "@/lib/supabase/server"
import { publicUrl } from "@/lib/http/public-origin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(publicUrl("/", request), 303)
}
