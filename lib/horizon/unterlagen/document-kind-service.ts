import "server-only"

import { createCaseEngine } from "@/lib/horizon/case"
import { isDocumentKind } from "./classify"
import { DOCUMENT_KIND_FACT_KEY } from "./analysis"

export type UnterlagenState = {
  error: "invalid_kind" | "unauthorized" | "case_not_found" | "failed" | null
  ok: boolean
}

/** Records a user-confirmed document classification after checking ownership. */
export async function saveDocumentKind(input: {
  caseId: unknown
  kind: unknown
}): Promise<UnterlagenState> {
  if (typeof input.caseId !== "string" || input.caseId.length === 0) {
    return { error: "case_not_found", ok: false }
  }
  if (!isDocumentKind(input.kind)) return { error: "invalid_kind", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const owned = await engine.repository.getMine(input.caseId)
  if (owned.error || !owned.data) return { error: "case_not_found", ok: false }

  const added = await engine.repository.addFacts(input.caseId, [
    {
      key: DOCUMENT_KIND_FACT_KEY,
      value: input.kind,
      critical: false,
      evidence: null,
      confidence: 1,
      pageNo: null,
      documentId: null,
    },
  ])
  if (added.error || !added.data) return { error: "failed", ok: false }

  const confirmed = await engine.repository.confirmFact(added.data[0].id)
  if (confirmed.error) return { error: "failed", ok: false }

  const audit = await engine.repository.appendAudit(input.caseId, "document_kind_corrected", {
    kind: input.kind,
  })
  if (audit.error) return { error: "failed", ok: false }

  return { error: null, ok: true }
}
