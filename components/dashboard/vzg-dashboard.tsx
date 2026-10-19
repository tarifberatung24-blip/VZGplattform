"use client"

import { HorizonHome } from "@/components/horizon/horizon-home"
import type { DashboardDocument } from "@/components/dashboard/document-analyzer"
import type { YourValue } from "@/lib/value/your-value"
import type { GrundversorgungMatch } from "@/lib/value/grundversorgung"

export type VzgDashboardProps = {
  firstName?: string | null
  profile?: { completeness: number | null } | null
  contracts: Array<{ id: string; title: string; category: string; provider_name: string | null; monthly_amount: number | null; status: string | null; end_date: string | null; review_status?: string | null; cancellation_deadline?: string | null }>
  documents: DashboardDocument[]
  reviewCount: number
  reminders: Array<{ id: string; title: string; due_at: string | null; status: string | null }>
  caseCounts?: Record<string, number>
  moduleError?: string | null
  yourValue?: YourValue | null
  grundversorgung?: GrundversorgungMatch[]
}

/**
 * The dashboard is a simple service launcher. Detailed figures, warnings and
 * history stay inside their service, where a person asks for them deliberately.
 */
export function VzgDashboard({ caseCounts, moduleError }: VzgDashboardProps) {
  return (
    <div className="mobile-client-dashboard horizon-dashboard relative min-h-[calc(100svh-4.5rem)] min-w-0 overflow-x-hidden bg-background px-4 pb-28 pt-5 text-foreground sm:px-6 sm:pt-6 md:min-h-[calc(100svh-3.5rem)] md:pb-8 lg:px-8">
      <div className="relative z-10 mx-auto min-w-0 max-w-[1100px]">
        <HorizonHome errorCode={moduleError ?? null} caseCounts={caseCounts ?? {}} />
      </div>
    </div>
  )
}
