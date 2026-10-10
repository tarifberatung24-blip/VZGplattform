/**
 * Grundversorgungs-Check: find electricity/gas contracts that are evidenced as
 * Grundversorgung (or Ersatzversorgung) in the user's own data.
 *
 * Detection is deterministic and evidence-only: the word must appear in the
 * contract's title, notes or extracted document facts. HORIZON never guesses a
 * tariff type and never estimates a saving here; a real price comes only from
 * an approved partner quote in the Optimize flow.
 *
 * Fact used in the UI: Grundversorgung contracts can be cancelled with two
 * weeks' notice (§ 20 Abs. 1 StromGVV / GasGVV).
 */

export const GRUNDVERSORGUNG_NOTICE_DAYS = 14

const energyCategories = new Set(["electricity", "gas", "energy", "strom"])
const grundversorgungPattern = /grundversorg|ersatzversorg/i

export type GrundversorgungInput = {
  id: string
  title: string | null
  category: string | null
  provider_name: string | null
  notes?: string | null
  extracted_facts?: unknown
}

export type GrundversorgungMatch = {
  id: string
  title: string
  providerName: string | null
  category: "electricity" | "gas"
}

function factsText(facts: unknown): string {
  if (facts == null) return ""
  try {
    return typeof facts === "string" ? facts : JSON.stringify(facts)
  } catch {
    return ""
  }
}

export function isEnergyCategory(category: string | null | undefined): boolean {
  return Boolean(category && energyCategories.has(category.trim().toLowerCase()))
}

export function isGrundversorgung(contract: GrundversorgungInput): boolean {
  if (!isEnergyCategory(contract.category)) return false
  const evidence = [contract.title, contract.notes, factsText(contract.extracted_facts)].filter(Boolean).join("\n")
  return grundversorgungPattern.test(evidence)
}

export function findGrundversorgung(contracts: GrundversorgungInput[]): GrundversorgungMatch[] {
  return contracts.filter(isGrundversorgung).map((contract) => ({
    id: contract.id,
    title: contract.title?.trim() || contract.provider_name?.trim() || "",
    providerName: contract.provider_name?.trim() || null,
    category: contract.category?.trim().toLowerCase() === "gas" ? "gas" : "electricity",
  }))
}
