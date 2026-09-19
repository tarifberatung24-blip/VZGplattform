import { CASE_MODULES, type CaseModule } from "./contract"

/**
 * Compatibility adapter from the legacy `cases.intent` vocabulary (used by the
 * existing assistant flows) to the HORIZON module vocabulary. Existing rows keep
 * their intent; new HORIZON cases are assigned a module explicitly.
 */
const intentToModule: Record<string, CaseModule> = {
  explanation: "unterlagen_erklaeren",
  reply: "general",
  complaint: "general",
  application: "agentur_fuer_arbeit",
  objection: "general",
  cancellation: "kuendigung",
  document_request: "general",
  reminder: "general",
  free_email: "general",
}

export function isCaseModule(value: unknown): value is CaseModule {
  return typeof value === "string" && (CASE_MODULES as readonly string[]).includes(value)
}

export function moduleFromIntent(intent: string | null | undefined): CaseModule {
  if (!intent) return "general"
  return intentToModule[intent] ?? "general"
}

/**
 * Resolves the module for a stored row: the canonical column wins, otherwise the
 * legacy intent is mapped so pre-P5 rows render in the right place.
 */
export function resolveCaseModule(row: {
  horizon_module?: string | null
  intent?: string | null
}): CaseModule {
  if (isCaseModule(row.horizon_module)) return row.horizon_module
  return moduleFromIntent(row.intent)
}