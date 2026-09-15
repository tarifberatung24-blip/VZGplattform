import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getAffiliateOffer, type AffiliateOfferId } from "@/lib/affiliate-offers"

export type OptimizeCategory = "energy" | "kfz"
type Provenance = "document" | "user_profile" | "ai_inferred"

type ProvenanceField = { value: string | number | null; source: Provenance }

export type OptimizeFilledData = {
  title: ProvenanceField
  provider: ProvenanceField
  monthly_amount: ProvenanceField
  contract_end: ProvenanceField
  cancellation_deadline: ProvenanceField
  household_size: ProvenanceField
  monthly_income: ProvenanceField
}

export function partnerForCategory(category: OptimizeCategory): { id: AffiliateOfferId; label: string } {
  return category === "energy" ? { id: "energy", label: "Energy partner" } : { id: "kfz", label: "KFZ partner" }
}

export function buildFilledData(contract: Record<string, unknown> | null, profile: Record<string, unknown> | null): OptimizeFilledData {
  const documentSource: Provenance = contract?.document_id ? "document" : "user_profile"
  return {
    title: { value: typeof contract?.title === "string" ? contract.title : null, source: documentSource },
    provider: { value: typeof contract?.provider_name === "string" ? contract.provider_name : null, source: documentSource },
    monthly_amount: { value: typeof contract?.monthly_amount === "number" ? contract.monthly_amount : null, source: documentSource },
    contract_end: { value: typeof contract?.end_date === "string" ? contract.end_date : null, source: documentSource },
    cancellation_deadline: { value: typeof contract?.cancellation_deadline === "string" ? contract.cancellation_deadline : null, source: documentSource },
    household_size: { value: typeof profile?.household_size === "number" ? profile.household_size : null, source: "user_profile" },
    monthly_income: { value: typeof profile?.monthly_income === "number" ? profile.monthly_income : null, source: "user_profile" },
  }
}

export function criticalMissing(filledData: OptimizeFilledData): string[] {
  const missing: string[] = []
  if (filledData.provider.value == null || filledData.provider.value === "") missing.push("provider")
  if (filledData.monthly_amount.value == null) missing.push("monthly_amount")
  return missing.slice(0, 2)
}

export function buildComparison(filledData: OptimizeFilledData) {
  const oldMonthly = typeof filledData.monthly_amount.value === "number" ? filledData.monthly_amount.value : null
  return { old_monthly: oldMonthly, new_monthly: null, saving: null, saving_status: "PARTNER_QUOTE_REQUIRED" }
}

export async function loadOptimizeInputs(supabase: SupabaseClient, userId: string, householdId: string, contractId: string | null) {
  const [{ data: contract, error: contractError }, { data: profile, error: profileError }] = await Promise.all([
    contractId
      ? supabase.from("contracts").select("id,document_id,title,provider_name,monthly_amount,end_date,cancellation_deadline").eq("id", contractId).eq("household_id", householdId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("profiles").select("household_size,monthly_income").eq("id", userId).maybeSingle(),
  ])
  if (contractError || profileError) throw new Error("OPTIMIZE_INPUTS_UNAVAILABLE")
  if (contractId && !contract) throw new Error("OPTIMIZE_CONTRACT_NOT_FOUND")
  return { contract: contract as Record<string, unknown> | null, profile: profile as Record<string, unknown> | null }
}

export function partnerDetails(category: OptimizeCategory) {
  const partner = partnerForCategory(category)
  const offer = getAffiliateOffer(partner.id)
  return { ...partner, url: offer.url ?? null, configured: offer.isConfigured }
}
