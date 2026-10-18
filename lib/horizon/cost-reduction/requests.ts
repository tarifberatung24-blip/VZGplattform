import "server-only"

import { createCaseEngine } from "@/lib/horizon/case"
import type { HorizonCaseStatus } from "@/lib/horizon/case/contract"
import { serviceRequestTypeFromFacts } from "@/lib/horizon/service-requests/registry"

type CostReductionRequestSummary = {
  id: string
  title: string
  status: HorizonCaseStatus
  documentCount: number
}

/**
 * The energy document centre is derived from owner-scoped case records. It
 * never reads a broad storage bucket or another user's document metadata.
 */
export async function loadCostReductionRequests(): Promise<CostReductionRequestSummary[]> {
  const engine = await createCaseEngine()
  if (!engine.repository) return []

  const cases = await engine.repository.listMine(50)
  if (cases.error) return []

  const summaries = await Promise.all(
    (cases.data ?? [])
      .filter((caseRecord) => caseRecord.module === "contract_management")
      .map(async (caseRecord) => {
        const [facts, documents] = await Promise.all([
          engine.repository!.listFacts(caseRecord.id),
          engine.repository!.listDocuments(caseRecord.id),
        ])
        if (facts.error || serviceRequestTypeFromFacts(facts.data ?? []) !== "energy_cost_check") {
          return null
        }
        return {
          id: caseRecord.id,
          title: caseRecord.title,
          status: caseRecord.status,
          documentCount: documents.data?.length ?? 0,
        }
      }),
  )

  return summaries.filter((item): item is NonNullable<typeof item> => item !== null)
}
