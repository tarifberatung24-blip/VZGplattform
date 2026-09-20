import type { HorizonAiCapability } from "./registry"

/**
 * P7 — per-module rail rails.
 *
 * The capabilities each module's assistant may offer. A module absent from this
 * map falls back to explanation-only, which is the safe default: a new module
 * gets the narrowest surface until it is widened deliberately.
 *
 * `draft` is granted only to modules whose deliverable is a German letter. The
 * Steuererklärung module is intentionally excluded: its output depends on
 * deterministic calculation, and a free-text model draft must not be the source
 * of a tax figure.
 */
export const MODULE_CAPABILITIES: Record<string, readonly HorizonAiCapability[]> = {
  unterlagen_erklaeren: ["explain", "translate", "summarize", "ask_missing_questions"],
  contract_management: ["explain", "summarize", "ask_missing_questions"],
  kuendigung: ["explain", "draft", "ask_missing_questions"],
  agentur_fuer_arbeit: ["explain", "draft", "ask_missing_questions"],
  jobcenter: ["explain", "draft", "ask_missing_questions"],
  steuererklaerung: ["explain", "summarize", "ask_missing_questions"],
  general: ["explain", "summarize", "ask_missing_questions"],
}

const EXPLAIN_ONLY: readonly HorizonAiCapability[] = ["explain"]

export function capabilitiesForModule(module: string): readonly HorizonAiCapability[] {
  return MODULE_CAPABILITIES[module] ?? EXPLAIN_ONLY
}

export function moduleAllowsCapability(module: string, capability: HorizonAiCapability): boolean {
  return capabilitiesForModule(module).includes(capability)
}