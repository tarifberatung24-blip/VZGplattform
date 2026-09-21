import type { MissingInformation } from "./contract"
import { isAgenturTask, requiredFactKeysForTask } from "../agentur/registry"
import {
  isJobcenterTask,
  requiredFactKeysForJobcenterTask,
} from "../jobcenter/registry"

/**
 * Required fact keys per module. A key is "required" only in the sense that the
 * module's workflow cannot produce a correct deliverable without it; an absent
 * key is reported as missing rather than invented.
 */
export const REQUIRED_FACT_KEYS: Record<string, readonly string[]> = {
  agentur_fuer_arbeit: ["recipient_institution", "claim_type"],
  jobcenter: ["recipient_institution", "claim_type"],
  kuendigung: ["contract_provider", "contract_reference"],
  steuererklaerung: ["tax_year"],
  unterlagen_erklaeren: [],
  contract_management: ["contract_provider"],
  general: [],
}

/**
 * The fact key under which an Agentur-für-Arbeit task selection is stored.
 *
 * Kept as a fact rather than a new column because the case spine already carries
 * facts and a task choice is exactly that: a user-supplied value the workflow
 * derives its questions from. Storing it here means the selection survives a
 * reload and appears in the audit trail like every other input.
 */
export const AGENTUR_TASK_FACT_KEY = "agentur_task"

/**
 * The fact key under which a Jobcenter task selection is stored.
 *
 * Separate from the Agentur key so the same case cannot confuse a BA claim with a
 * Jobcenter claim: the two authorities have different forms and different
 * processes, and merging the selections would let one module's task answer the
 * other's questions.
 */
export const JOBCENTER_TASK_FACT_KEY = "jobcenter_task"

/**
 * The most recently created fact for a key.
 *
 * Re-selecting a task appends a superseding fact rather than updating the old
 * one (the repository has no update-value path), and `listFacts` returns rows in
 * ascending creation order. Taking the first match would therefore resolve to the
 * *oldest* selection and ignore the user's latest choice, so the last match wins.
 */
function latestFactWithKey(
  facts: readonly { key: string; value?: string }[],
  key: string,
): { key: string; value?: string } | undefined {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    if (facts[index].key === key) return facts[index]
  }
  return undefined
}

/**
 * Required keys for a module, plus — for the Agentur module — whatever the
 * selected task adds.
 *
 * A task can only add requirements; it never removes the module's own. Until a
 * task is chosen the module keys alone apply, so the workflow asks which task
 * before asking anything task-specific instead of demanding answers to questions
 * the user's situation may make irrelevant.
 */
export function requiredKeysFor(
  module: string,
  facts: readonly { key: string; value?: string }[],
): readonly string[] {
  const base = REQUIRED_FACT_KEYS[module] ?? []

  if (module === "agentur_fuer_arbeit") {
    const taskFact = latestFactWithKey(facts, AGENTUR_TASK_FACT_KEY)
    if (!taskFact || !isAgenturTask(taskFact.value)) return base
    return [...new Set([...base, ...requiredFactKeysForTask(taskFact.value)])]
  }

  if (module === "jobcenter") {
    const taskFact = latestFactWithKey(facts, JOBCENTER_TASK_FACT_KEY)
    if (!taskFact || !isJobcenterTask(taskFact.value)) return base
    return [...new Set([...base, ...requiredFactKeysForJobcenterTask(taskFact.value)])]
  }

  return base
}

/** The Agentur task recorded on a case, when one has been chosen. */
export function selectedAgenturTask(
  facts: readonly { key: string; value?: string }[],
): string | null {
  const taskFact = latestFactWithKey(facts, AGENTUR_TASK_FACT_KEY)
  if (!taskFact) return null
  return isAgenturTask(taskFact.value) ? taskFact.value : null
}

/** The Jobcenter task recorded on a case, when one has been chosen. */
export function selectedJobcenterTask(
  facts: readonly { key: string; value?: string }[],
): string | null {
  const taskFact = latestFactWithKey(facts, JOBCENTER_TASK_FACT_KEY)
  if (!taskFact) return null
  return isJobcenterTask(taskFact.value) ? taskFact.value : null
}

/**
 * Derives missing-information state from the facts on a case.
 *
 * A fact counts as confirmed only when `confirmed_at` is set; critical facts
 * that are present but unconfirmed are surfaced separately so the UI can ask
 * the user to confirm rather than to type.
 *
 * Takes the minimum shape it needs rather than `Pick<ExtractedFact, …>`, so a
 * caller holding only confirmation state does not have to fabricate a value it
 * never read. The Agentur task selection is read from `value` when present.
 */
export type MissingInfoFact = {
  key: string
  critical?: boolean
  confirmedAt?: string | null
  value?: string
}

export function deriveMissingInformation(
  facts: readonly MissingInfoFact[],
  module: string,
): MissingInformation {
  const presentKeys = new Set(facts.map((fact) => fact.key))
  const required = requiredKeysFor(module, facts)

  const missingFactKeys = required.filter((key) => !presentKeys.has(key))

  const unconfirmedCriticalFactKeys = facts
    .filter((fact) => fact.critical && !fact.confirmedAt)
    .map((fact) => fact.key)

  return {
    missingFactKeys,
    unconfirmedCriticalFactKeys,
    complete: missingFactKeys.length === 0 && unconfirmedCriticalFactKeys.length === 0,
  }
}