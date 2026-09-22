"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { createCaseEngine } from "../case"
import { guideCasePath } from "../guide/intents"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import {
  contractFactSeeds,
  isContractVerified,
  kuendigungCaseForContract,
  type LinkableContract,
} from "./linkage"

/**
 * P17 — open a Kündigung case from an archived contract.
 *
 * Reads the contract through the **session** client, so the `contracts_household_owner_all`
 * policy and the household check both apply and another household's contract is
 * indistinguishable from a missing one. The case itself is created through the
 * shared case engine, so it is owner-scoped by `cases.owner_id` like every other
 * case rather than through a parallel path.
 *
 * Only evidenced fields are seeded. A field the archive does not hold is simply
 * absent, so the Kündigung workflow's own missing-information state asks for it.
 * A date from a contract still at `needs_review` is seeded **unconfirmed**, so
 * P14's timing logic treats it as not relied upon and the letter does not carry a
 * termination date that was never checked.
 *
 * Nothing is sent and no letter is generated here: this creates the case and its
 * starting facts, and the user continues in the normal P14 flow.
 */
export async function startKuendigungFromContract(formData: FormData): Promise<void> {
  const rawContractId = formData.get("contractId")
  const rawLocale = formData.get("locale")
  const locale: Locale =
    typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/${locale}/vertraege`)}`)

  if (typeof rawContractId !== "string" || rawContractId.length === 0) {
    redirect(`/${locale}/vertraege?error=contract-not-found`)
  }

  const householdId = await ensureHousehold(supabase)
  const { data: row } = await supabase
    .from("contracts")
    .select(
      "id,title,category,provider_name,contract_number,monthly_amount,start_date,end_date,cancellation_deadline,review_status,document_id",
    )
    .eq("id", rawContractId)
    .eq("household_id", householdId)
    .maybeSingle()

  if (!row) redirect(`/${locale}/vertraege?error=contract-not-found`)

  const contract: LinkableContract = {
    id: row.id,
    title: row.title,
    category: row.category,
    provider: row.provider_name,
    contractNumber: row.contract_number,
    monthlyAmount: row.monthly_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    cancellationDeadline: row.cancellation_deadline,
    reviewStatus: row.review_status as LinkableContract["reviewStatus"],
    documentId: row.document_id,
  }

  const engine = await createCaseEngine()
  if (!engine.repository) {
    redirect(`/auth/login?next=${encodeURIComponent(`/${locale}/vertraege`)}`)
  }

  const definition = kuendigungCaseForContract(contract)
  const created = await engine.repository.createCase({
    title: definition.title,
    module: definition.module,
    intent: definition.intent,
    uiLocale: locale,
    conversationLocale: locale,
  })
  if (created.error || !created.data) {
    redirect(`/${locale}/vertraege?error=create-failed`)
  }

  const caseId = created.data.id
  const verified = isContractVerified(contract)
  const seeds = contractFactSeeds(contract)

  if (seeds.length > 0) {
    const added = await engine.repository.addFacts(
      caseId,
      seeds.map((seed) => ({
        key: seed.key,
        value: seed.value,
        evidence: seed.evidence,
        // A confirmed contract yields facts the workflow may rely on; an
        // unconfirmed one yields facts that are present but must be checked.
        critical: true,
        confidence: verified ? 1 : null,
        pageNo: null,
        documentId: null,
      })),
    )
    if (added.error) {
      await engine.repository.appendAudit(caseId, "contract_link_seed_failed", {
        contract_id: contract.id,
        reason: added.error,
      })
    } else {
      // Only a confirmed contract's facts are auto-confirmed. An unconfirmed
      // contract's values stay unconfirmed on the case, so P14 refuses to compute
      // a deadline from them until the user checks them.
      if (verified) {
        for (const fact of added.data ?? []) {
          await engine.repository.confirmFact(fact.id)
        }
      }
    }
  }

  await engine.repository.appendAudit(caseId, "contract_linked", {
    contract_id: contract.id,
    contract_verified: verified,
    seeded_facts: seeds.map((seed) => seed.key),
  })

  redirect(guideCasePath(locale, caseId))
}
