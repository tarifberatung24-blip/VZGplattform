/**
 * HORIZON P0 intake model — independently authored neutral categories.
 *
 * These categories were designed for HORIZON by VZG from the household's own
 * data structure. They do not reproduce, translate, or paraphrase any DIN
 * standard text, table, formula, threshold, questionnaire, or scoring scheme,
 * and they make no DIN compliance claim.
 *
 * The model is a neutral collection structure: it defines what may be asked
 * for and where the answer belongs. It contains no arithmetic, no thresholds,
 * no weighting, and no recommendations.
 */

import { CAPITAL_FACT_KEYS } from "../engine"

/** Neutral intake sections, in presentation order. */
export const CAPITAL_INTAKE_CATEGORIES = [
  "household",
  "income",
  "essential_expenses",
  "liabilities_debt",
  "insurance_protection",
  "savings",
  "liquid_reserve",
  "goals",
  "priorities",
  "evidence",
  "missing_information",
] as const

export type CapitalIntakeCategory = (typeof CAPITAL_INTAKE_CATEGORIES)[number]

/** How an intake item is expected to be answered. */
export const CAPITAL_INTAKE_VALUE_KINDS = ["money", "number", "boolean", "date", "text", "enum"] as const

export type CapitalIntakeValueKind = (typeof CAPITAL_INTAKE_VALUE_KINDS)[number]

export type CapitalIntakeItem = {
  /** Canonical Capital fact key this item populates, when it maps to one. */
  key: string | null
  category: CapitalIntakeCategory
  valueKind: CapitalIntakeValueKind
  /** Whether the P0 engine cannot run without this item. */
  required: boolean
  /** Currency is required for monetary items and forbidden otherwise. */
  currencyRequired: boolean
}

/**
 * The P0 intake catalogue. Every `key` that maps to the engine uses the
 * canonical engine key so intake and calculation cannot drift apart.
 */
export const CAPITAL_INTAKE_ITEMS: readonly CapitalIntakeItem[] = [
  { key: null, category: "household", valueKind: "number", required: false, currencyRequired: false },
  { key: null, category: "household", valueKind: "enum", required: false, currencyRequired: false },
  { key: CAPITAL_FACT_KEYS.income, category: "income", valueKind: "money", required: true, currencyRequired: true },
  {
    key: CAPITAL_FACT_KEYS.essentialExpenses,
    category: "essential_expenses",
    valueKind: "money",
    required: true,
    currencyRequired: true,
  },
  {
    key: CAPITAL_FACT_KEYS.debtPayments,
    category: "liabilities_debt",
    valueKind: "money",
    required: true,
    currencyRequired: true,
  },
  {
    key: CAPITAL_FACT_KEYS.insuranceCosts,
    category: "insurance_protection",
    valueKind: "money",
    required: true,
    currencyRequired: true,
  },
  {
    key: CAPITAL_FACT_KEYS.existingSavings,
    category: "savings",
    valueKind: "money",
    required: true,
    currencyRequired: true,
  },
  {
    key: CAPITAL_FACT_KEYS.liquidReserve,
    category: "liquid_reserve",
    valueKind: "money",
    required: true,
    currencyRequired: true,
  },
  { key: null, category: "goals", valueKind: "money", required: false, currencyRequired: true },
  { key: null, category: "goals", valueKind: "number", required: false, currencyRequired: false },
  { key: null, category: "priorities", valueKind: "enum", required: false, currencyRequired: false },
  { key: null, category: "evidence", valueKind: "text", required: false, currencyRequired: false },
  { key: null, category: "missing_information", valueKind: "text", required: false, currencyRequired: false },
]

export function intakeItemsForCategory(category: CapitalIntakeCategory): CapitalIntakeItem[] {
  return CAPITAL_INTAKE_ITEMS.filter((item) => item.category === category)
}

/** Canonical keys the intake marks as required for P0. */
export function requiredIntakeKeys(): string[] {
  return CAPITAL_INTAKE_ITEMS.filter((item) => item.required && item.key !== null).map(
    (item) => item.key as string,
  )
}

/** An answer supplied by the household, user, or advisor. */
export type CapitalIntakeAnswer = {
  category: CapitalIntakeCategory
  key: string | null
  value: string | number | boolean | null
  valueKind: CapitalIntakeValueKind
  currency: string | null
  evidenceReference: string | null
  /** True only when a human confirmed the answer. */
  confirmed: boolean
}

export type IntakeGap = {
  category: CapitalIntakeCategory
  key: string | null
  /** Why the item is not usable; intake never fills the gap itself. */
  reason: "absent" | "unconfirmed" | "unsupported"
}

/**
 * Reports which required intake items are unanswered or unconfirmed. This is a
 * gap report, not a score: it ranks nothing and recommends nothing.
 */
export function findIntakeGaps(answers: readonly CapitalIntakeAnswer[]): IntakeGap[] {
  const gaps: IntakeGap[] = []
  const byKey = new Map<string, CapitalIntakeAnswer>()
  for (const answer of answers) {
    if (answer.key) byKey.set(answer.key, answer)
  }

  for (const item of CAPITAL_INTAKE_ITEMS) {
    if (!item.required || item.key === null) continue
    const answer = byKey.get(item.key)
    if (!answer) {
      gaps.push({ category: item.category, key: item.key, reason: "absent" })
      continue
    }
    if (!answer.confirmed) {
      gaps.push({ category: item.category, key: item.key, reason: "unconfirmed" })
    }
  }

  return gaps.sort((a, b) => {
    const keyA = a.key ?? ""
    const keyB = b.key ?? ""
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0
  })
}
