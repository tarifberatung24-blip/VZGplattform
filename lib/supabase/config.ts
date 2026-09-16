import project from "../../supabase/project.json"

const missingConfigurationMessage =
  'Supabase is not configured for this Preview. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in the Preview/Development environment.'

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(missingConfigurationMessage)
  }

  if (url.replace(/\/$/, "") !== `https://${project.projectRef}.supabase.co`) {
    throw new Error(`Wrong Supabase project. KintexBG uses ${project.projectName}. Run pnpm supabase:check before continuing.`)
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("A server-only Supabase secret cannot be used in the public client.")
  }
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payloadSegment = key.split(".")[1]
      const payload = JSON.parse(atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=")))
      if (payload.role !== "anon" || payload.ref !== project.projectRef) throw new Error()
    } catch {
      throw new Error("The public Supabase key does not match the canonical project or is not an anon key.")
    }
  }

  return { url, key }
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  )
}

export { missingConfigurationMessage }
