"use client"

import { usePathname } from "next/navigation"
import { PublicLayerPage } from "@/components/marketing/public-layer-page"

export default function LocalizedSecurityPage() {
  const pathname = usePathname() ?? "/bg/security"
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  return <PublicLayerPage kind="security" locale={locale} />
}
