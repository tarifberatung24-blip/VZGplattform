import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Every case route scopes by both id and user_id. RLS already enforces this,
 * but the explicit filter means a leaked id cannot be used to probe another
 * user's case, and a miss is indistinguishable from a missing row.
 */
export async function loadCase(
  supabase: SupabaseClient,
  userId: string,
  caseId: string,
) {
  const { data, error } = await supabase
    .from("inkasso_cases")
    .select("*")
    .eq("id", caseId)
    .eq("user_id", userId)
    .maybeSingle()
  return { data, error }
}

export function caseRouteError(code: string, status: number) {
  return NextResponse.json({ code }, { status })
}

/** The case id arrives as a route param and must be a uuid before it hits the DB. */
export function isUuid(value: string | undefined): boolean {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
