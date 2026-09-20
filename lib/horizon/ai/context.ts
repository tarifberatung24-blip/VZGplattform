import type { Case, CaseDraft, ExtractedFact, MissingInformation } from "@/lib/horizon/case/contract"

/**
 * P7 — persistent case context.
 *
 * Builds the context the assistant answers inside. The context is assembled
 * server-side from the case spine the user already owns, so the assistant sees
 * the same facts the case page shows and cannot be handed another tenant's data
 * by a crafted request.
 *
 * Only *confirmed* facts enter the context as established information.
 * Unconfirmed facts are listed separately and explicitly marked as unconfirmed,
 * so the assistant cannot present an unverified extraction as fact. Missing
 * required keys are passed through so the assistant can ask about them rather
 * than guess.
 */

export type CaseContextFact = {
  key: string
  value: string
  confirmed: boolean
  sourceType: "document" | "user"
  pageNo: number | null
}

export type CaseContext = {
  caseId: string
  module: string
  caseStatus: string
  title: string
  intent: string
  institution: string | null
  deadline: string | null
  conversationLocale: string
  /** Authoritative output language for anything sent to an authority. */
  outputLocale: "de"
  confirmedFacts: CaseContextFact[]
  unconfirmedFacts: CaseContextFact[]
  missingFactKeys: string[]
  unconfirmedCriticalFactKeys: string[]
  draftSummaries: { version: number; subject: string; reviewStatus: string; approved: boolean }[]
  documentCount: number
  /** True when the case has no usable input yet, so the assistant must ask. */
  empty: boolean
}

export const OUTPUT_LOCALE = "de" as const

function toContextFact(fact: ExtractedFact): CaseContextFact {
  return {
    key: fact.key,
    value: fact.value,
    confirmed: fact.confirmedAt != null,
    sourceType: fact.sourceType,
    pageNo: fact.pageNo,
  }
}

/**
 * Assembles the context. `approvedDraftIds` decides the `approved` flag on each
 * draft summary; approval validity is computed by the caller from the stored
 * hashes, never inferred here.
 */
export function buildCaseContext(input: {
  case: Case
  facts: readonly ExtractedFact[]
  missing: MissingInformation | null
  drafts: readonly CaseDraft[]
  approvedDraftIds: readonly string[]
  documentCount: number
}): CaseContext {
  const confirmedFacts: CaseContextFact[] = []
  const unconfirmedFacts: CaseContextFact[] = []
  for (const fact of input.facts) {
    const mapped = toContextFact(fact)
    if (mapped.confirmed) confirmedFacts.push(mapped)
    else unconfirmedFacts.push(mapped)
  }

  const approved = new Set(input.approvedDraftIds)
  const draftSummaries = input.drafts.map((draft) => ({
    version: draft.version,
    subject: draft.subject,
    reviewStatus: draft.reviewStatus,
    approved: approved.has(draft.id),
  }))

  return {
    caseId: input.case.id,
    module: input.case.module,
    caseStatus: input.case.status,
    title: input.case.title,
    intent: input.case.intent,
    institution: input.case.institution,
    deadline: input.case.deadline,
    conversationLocale: input.case.conversationLocale,
    outputLocale: OUTPUT_LOCALE,
    confirmedFacts,
    unconfirmedFacts,
    missingFactKeys: input.missing?.missingFactKeys ?? [],
    unconfirmedCriticalFactKeys: input.missing?.unconfirmedCriticalFactKeys ?? [],
    draftSummaries,
    documentCount: input.documentCount,
    empty: confirmedFacts.length === 0 && unconfirmedFacts.length === 0 && input.documentCount === 0,
  }
}

/**
 * Renders the context as the untrusted-data block handed to the model.
 *
 * The block is labelled as data, not instructions: text a user pasted into a
 * case can contain anything, including text shaped like a command, and the
 * model must treat it as content to reason about.
 */
export function serializeCaseContext(context: CaseContext): string {
  return JSON.stringify({
    case: {
      module: context.module,
      status: context.caseStatus,
      title: context.title,
      intent: context.intent,
      institution: context.institution,
      deadline: context.deadline,
    },
    output_language: context.outputLocale,
    conversation_language: context.conversationLocale,
    confirmed_facts: context.confirmedFacts,
    unconfirmed_facts: context.unconfirmedFacts,
    missing_fact_keys: context.missingFactKeys,
    unconfirmed_critical_fact_keys: context.unconfirmedCriticalFactKeys,
    drafts: context.draftSummaries,
    document_count: context.documentCount,
  })
}