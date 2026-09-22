/**
 * P16 — the analysis a document gets, assembled from evidence.
 *
 * This module is the seam between the deterministic parts (classification,
 * deadline evidence, risk wording) and the surfaces that show them. It holds no
 * model call: everything here is derived from the document text, so the same text
 * always yields the same analysis and nothing is invented to fill a gap.
 *
 * A model may later *explain* this output in the user's language, but the
 * classification, the deadline and the risk state are computed, not generated.
 * That separation is what keeps an explanation from becoming the source of a
 * deadline or a risk verdict.
 */

import { classifyDocument, assessDocumentRisk, recommendNextAction, type DocumentKind } from "./classify"
import { findDeadlineEvidence } from "./deadline"

/** The fact key under which a user's corrected document kind is stored. */
export const DOCUMENT_KIND_FACT_KEY = "document_kind"

export type DocumentAnalysis = {
  kind: DocumentKind
  /** The printed phrase the kind rests on, quoted, or null when unclear. */
  kindEvidence: string | null
  alternatives: readonly DocumentKind[]
  deadline: ReturnType<typeof findDeadlineEvidence>
  risk: ReturnType<typeof assessDocumentRisk>
  nextAction: ReturnType<typeof recommendNextAction>
  /** True when a user correction overrides the computed kind. */
  userCorrected: boolean
}

/**
 * Analyses the combined text of a case's documents.
 *
 * When no page text exists the analysis still returns a complete shape: kind
 * `unclear`, deadline `unknown`, risk `cannot_determine`. An empty case is
 * reported as unanalysable rather than as a document with no deadline and no risk.
 */
export function analyseDocumentText(input: {
  text: string
  /** A user-corrected kind, when one is recorded on the case. */
  correctedKind?: DocumentKind | null
  unconfirmedFactCount?: number
  hasDraft?: boolean
}): DocumentAnalysis {
  const text = typeof input.text === "string" ? input.text : ""
  const classified = classifyDocument(text)
  const deadline = findDeadlineEvidence(text)
  const risk = assessDocumentRisk(text)

  // A user correction wins over the computed label. `userCorrected` records that
  // this happened, so the surface does not present a corrected label as the
  // engine's own finding.
  const userCorrected = input.correctedKind != null && input.correctedKind !== classified.kind
  const kind = input.correctedKind ?? classified.kind

  return {
    kind,
    kindEvidence: userCorrected ? null : classified.evidence,
    alternatives: classified.alternatives,
    deadline,
    risk,
    nextAction: recommendNextAction({
      deadline: { kind: deadline.kind, requiresUserVerification: deadline.requiresUserVerification },
      risk: risk.state,
      unconfirmedFactCount: input.unconfirmedFactCount ?? 0,
      hasDraft: input.hasDraft ?? false,
    }),
    userCorrected,
  }
}
