import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdminUsersView } from "@/components/admin/users-view"
import { getAdmin } from "@/lib/admin/access"
import { loadAdminUsers } from "@/lib/admin/journey"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "bg" && locale !== "de") notFound()
  const admin = await getAdmin()
  if (!admin) notFound()
  const { rows, error } = await loadAdminUsers(admin)
  return <AdminUsersView locale={locale} rows={rows} error={error} />
}
