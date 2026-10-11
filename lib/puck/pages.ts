import "server-only"
import type { Data } from "@puckeditor/core"
import { createClient } from "@supabase/supabase-js"
import { getAuthenticatedUser } from "@/lib/office/supabase/auth"

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
export type PageLocale = "bg" | "de"

export async function getEditorEmail(): Promise<string | null> {
  const { user } = await getAuthenticatedUser()
  const email = user?.email?.toLowerCase()
  if (!email) return null
  const allowed = (process.env.EDITOR_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(email) ? email : null
}

export async function loadPage(locale: PageLocale, slug: string, opts: { publishedOnly: boolean }) {
  if (!SLUG.test(slug)) return null
  const admin = createAdminClient()
  if (!admin) return null
  let q = admin.from("site_pages").select("data, published").eq("locale", locale).eq("slug", slug)
  if (opts.publishedOnly) q = q.eq("published", true)
  const { data } = await q.maybeSingle()
  return data ? { data: data.data as Data, published: data.published as boolean } : null
}

export async function savePage(locale: PageLocale, slug: string, data: Data, published: boolean) {
  const email = await getEditorEmail()
  if (!email) return { error: "Unauthorized" as const }
  if (!SLUG.test(slug)) return { error: "Invalid slug" as const }
  if (JSON.stringify(data).length > 500_000) return { error: "Page too large" as const }
  const admin = createAdminClient()
  if (!admin) return { error: "Supabase is not configured" as const }
  const { error } = await admin.from("site_pages").upsert(
    { locale, slug, data, published, updated_by: email, updated_at: new Date().toISOString() },
    { onConflict: "locale,slug" },
  )
  return error ? { error: error.message } : { ok: true as const }
}
