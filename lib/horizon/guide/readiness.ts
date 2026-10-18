import "server-only"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export type GuideReadiness = {
  available: boolean
  hasProfileBasics: boolean
  documentCount: number
}

/**
 * Preparation signals for the Guide. These signals deliberately say only
 * whether data exists; they never classify a document as sufficient or infer
 * eligibility for a public benefit.
 */
export async function loadGuideReadiness(userId: string | null): Promise<GuideReadiness> {
  if (!userId) return { available: false, hasProfileBasics: false, documentCount: 0 }

  try {
    const supabase = await createClient()
    const householdId = await ensureHousehold(supabase)
    const [profileResult, documentsResult] = await Promise.all([
      supabase.from("profiles").select("household_size,monthly_income").eq("id", userId).maybeSingle(),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("household_id", householdId),
    ])

    if (profileResult.error || documentsResult.error) {
      return { available: false, hasProfileBasics: false, documentCount: 0 }
    }

    return {
      available: true,
      hasProfileBasics:
        profileResult.data?.household_size !== null &&
        profileResult.data?.household_size !== undefined &&
        profileResult.data?.monthly_income !== null &&
        profileResult.data?.monthly_income !== undefined,
      documentCount: documentsResult.count ?? 0,
    }
  } catch {
    // Optional preparation information must never block the case workspace.
    return { available: false, hasProfileBasics: false, documentCount: 0 }
  }
}
