import "server-only"
import { getAuthenticatedUser } from "@/lib/office/supabase/auth"
import { adminEmailsFromEnv } from "./admin-emails"

export type AdminIdentity = { id: string; email: string }

/** The signed-in admin, or null for everyone else. Admin pages answer null with a plain 404. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const { user } = await getAuthenticatedUser()
  const email = user?.email?.toLowerCase()
  if (!user || !email) return null
  return adminEmailsFromEnv().includes(email) ? { id: user.id, email } : null
}
