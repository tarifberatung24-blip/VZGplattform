import { daysUntil } from "@/lib/format"
import type { DataStatus } from "@/lib/status"

/**
 * FinanzBG Opportunity Engine (deterministic).
 *
 * PRINCIPLE: this engine NEVER invents government benefits, eligibility, tax
 * deductions, savings, or euro amounts. It only surfaces actions that can be
 * derived deterministically from data the user has already provided
 * (contracts, profile, family). Every opportunity carries a machine-readable
 * `reason`, a `dataSource`, and a `ruleVersion` so it is fully traceable.
 *
 * Anything that requires official eligibility rules or partner pricing is
 * emitted only as a NEEDS_DATA / ELIGIBILITY_CHECK prompt — never as a
 * confirmed result.
 */

export const OPPORTUNITY_ENGINE_VERSION = "oe-2025.11.0"

export type OpportunityType = "TAX" | "BENEFIT" | "CONTRACT" | "DEADLINE" | "ENERGY" | "DOCUMENT" | "FINANCIAL"

export type OpportunityState =
  | "DISCOVERED"
  | "NEEDS_DATA"
  | "ELIGIBILITY_CHECK"
  | "READY_TO_ACT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DISMISSED"
  | "EXPIRED"

export type DerivedOpportunity = {
  key: string
  type: OpportunityType
  state: OpportunityState
  titleBg: string
  titleDe: string
  reason: string
  actionRoute: string
  dataSource: DataStatus
  ruleVersion: string
  relatedContractId?: string
}

export type EngineContract = {
  id: string
  category: string
  provider: string | null
  end_date: string | null
  notice_period_months: number | null
  price_guarantee_until: string | null
}

export type EngineProfile = {
  number_of_children: number | null
  employment_status: string | null
  completeness_percent: number | null
} | null

export type EngineFamilyMember = { relationship: string; lives_in_germany: boolean | null }

export type EngineInput = {
  contracts: EngineContract[]
  profile: EngineProfile
  family: EngineFamilyMember[]
  hasTaxCase: boolean
}

/**
 * Compute the deterministic notice deadline for a contract: the latest date on
 * which the user must send a Kündigung to avoid auto-renewal.
 */
export function computeNoticeDeadline(contract: EngineContract): Date | null {
  if (!contract.end_date) return null
  const end = new Date(contract.end_date)
  if (Number.isNaN(end.getTime())) return null
  const months = contract.notice_period_months ?? 0
  const deadline = new Date(end)
  deadline.setMonth(deadline.getMonth() - months)
  return deadline
}

export function deriveOpportunities(input: EngineInput): DerivedOpportunity[] {
  const out: DerivedOpportunity[] = []

  // --- CONTRACT: upcoming notice deadlines (deterministic, from user data) ---
  for (const c of input.contracts) {
    const deadline = computeNoticeDeadline(c)
    if (!deadline) continue
    const days = daysUntil(deadline)
    if (days == null) continue
    if (days >= 0 && days <= 60) {
      out.push({
        key: `contract-notice-${c.id}`,
        type: "CONTRACT",
        state: "READY_TO_ACT",
        titleBg: `Договорът ти изтича скоро — провери Kündigung`,
        titleDe: `Dein Vertrag läuft bald aus — Kündigung prüfen`,
        reason: `notice_deadline_in_${days}_days`,
        actionRoute: "/kuendigung",
        dataSource: "SYSTEM_DERIVED",
        ruleVersion: OPPORTUNITY_ENGINE_VERSION,
        relatedContractId: c.id,
      })
    }
  }

  // --- ENERGY/CONTRACT: price guarantee expiring => worth a tariff check ---
  for (const c of input.contracts) {
    if (!c.price_guarantee_until) continue
    const days = daysUntil(c.price_guarantee_until)
    if (days != null && days >= 0 && days <= 90 && (c.category === "STROM" || c.category === "GAS")) {
      out.push({
        key: `price-guarantee-${c.id}`,
        type: "ENERGY",
        state: "NEEDS_DATA",
        titleBg: `Ценовата гаранция изтича скоро — готово за тарифна проверка`,
        titleDe: `Preisgarantie läuft bald aus — bereit für Tarifprüfung`,
        reason: `price_guarantee_in_${days}_days`,
        actionRoute: "/tarife",
        dataSource: "SYSTEM_DERIVED",
        ruleVersion: OPPORTUNITY_ENGINE_VERSION,
        relatedContractId: c.id,
      })
    }
  }

  // --- BENEFIT: children present => Kindergeld / Kinderzuschlag worth checking ---
  const childCount =
    (input.profile?.number_of_children ?? 0) || input.family.filter((f) => f.relationship === "CHILD").length
  if (childCount > 0) {
    out.push({
      key: "benefit-kindergeld",
      type: "BENEFIT",
      state: "ELIGIBILITY_CHECK",
      titleBg: "Имаш деца — провери условията за Kindergeld",
      titleDe: "Du hast Kinder — Voraussetzungen für Kindergeld prüfen",
      reason: "children_present",
      actionRoute: "/kindergeld",
      dataSource: "SYSTEM_DERIVED",
      ruleVersion: OPPORTUNITY_ENGINE_VERSION,
    })
    out.push({
      key: "benefit-kinderzuschlag",
      type: "BENEFIT",
      state: "ELIGIBILITY_CHECK",
      titleBg: "Възможно е да отговаряш на условията за Kinderzuschlag — направи проверка",
      titleDe: "Kinderzuschlag könnte für dich in Frage kommen — Prüfung starten",
      reason: "children_present",
      actionRoute: "/anspruch",
      dataSource: "SYSTEM_DERIVED",
      ruleVersion: OPPORTUNITY_ENGINE_VERSION,
    })
  }

  // --- TAX: employed and no tax case yet => Steuererklärung worth exploring ---
  if (input.profile?.employment_status === "EMPLOYEE" && !input.hasTaxCase) {
    out.push({
      key: "tax-steuererklaerung",
      type: "TAX",
      state: "NEEDS_DATA",
      titleBg: "Като служител може да си върнеш надплатени данъци — провери",
      titleDe: "Als Arbeitnehmer könntest du Steuern zurückbekommen — prüfen",
      reason: "employee_without_tax_case",
      actionRoute: "/steuer",
      dataSource: "SYSTEM_DERIVED",
      ruleVersion: OPPORTUNITY_ENGINE_VERSION,
    })
  }

  return out
}
