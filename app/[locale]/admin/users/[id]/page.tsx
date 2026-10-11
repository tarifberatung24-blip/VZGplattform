import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdminUserJourneyView } from "@/components/admin/user-journey-view"
import { getAdmin } from "@/lib/admin/access"
import { loadAdminUserJourney } from "@/lib/admin/journey"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminUserJourneyPage({ params }: Props) {
  const { locale, id } = await params
  if (locale !== "bg" && locale !== "de") notFound()
  const admin = await getAdmin()
  if (!admin) notFound()
  const journey = await loadAdminUserJourney(admin, id)
  if (!journey) notFound()
  return <AdminUserJourneyView locale={locale} row={journey.row} events={journey.events} />
}
