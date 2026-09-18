/**
 * Deterministic FinancialFact validation.
 *
 * No LLM, no network, no clock: every rule is a pure function of the input, so
 * the same fact always produces the same issues. Missing data is reported as an
 * issue — it is never replaced with an invented value.
 */

import {
  FINANCIAL_FACT_STATUSES,
  FINANCIAL_FACT_TYPES,
  type FinancialFact,
  type FinancialFactStatus,
} from "./financial-fact"
import { isAiDerivedSource, isIsoDate, isIsoTimestamp } from "./provenance"

export const FINANCIAL_FACT_ISSUE_CODES = [
  "ID_MISSING",
  "HOUSEHOLD_ID_MISSING",
  "KEY_MISSING",
  "STATUS_UNSUPPORTED",
  "TYPE_UNSUPPORTED",
  "VERSION_INVALID",
  "CONFIDENCE_OUT_OF_BOUNDS",
  "VALUE_TYPE_MISMATCH",
  "VALUE_MISSING",
  "CURRENCY_REQUIRED",
  "CURRENCY_INVALID",
  "CURRENCY_NOT_APPLICABLE",
  "UNIT_NOT_APPLICABLE",
  "CONFIRMATION_METADATA_REQUIRED",
  "AI_FACT_AUTO_CONFIRMED",
  "AI_FACT_CONFIRMED_WITHOUT_REVIEW",
  "SOURCE_UNSUPPORTED",
  "OBSERVED_AT_INVALID",
  "EVIDENCE_REFERENCE_REQUIRED",
] as const

export type FinancialFactIssueCode = (typeof FINANCIAL_FACT_ISSUE_CODES)[number]

export type FinancialFactIssue = {
  code: FinancialFactIssueCode
  field: string
  message: string
}

const CURRENCY_CODE = /^[A-Z]{3}$/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isSupportedStatus(value: unknown): value is FinancialFactStatus {
  return typeof value === "string" && (FINANCIAL_FACT_STATUSES as readonly string[]).includes(value)
}

/**
 * Validates a FinancialFact against the domain invariants.
 * Returns every issue found, in a stable order.
 */
export function validateFinancialFact(fact: FinancialFact): FinancialFactIssue[] {
  const issues: FinancialFactIssue[] = []

  if (!isNonEmptyString(fact.id)) {
    issues.push({ code: "ID_MISSING", field: "id", message: "FinancialFact.id is required." })
  }
  if (!isNonEmptyString(fact.householdId)) {
    issues.push({
      code: "HOUSEHOLD_ID_MISSING",
      field: "householdId",
      message: "FinancialFact.householdId is required; facts are always household-scoped.",
    })
  }
  if (!isNonEmptyString(fact.key)) {
    issues.push({ code: "KEY_MISSING", field: "key", message: "FinancialFact.key is required." })
  }
  if (!isSupportedStatus(fact.status)) {
    issues.push({
      code: "STATUS_UNSUPPORTED",
      field: "status",
      message: `status must be one of ${FINANCIAL_FACT_STATUSES.join(", ")}.`,
    })
  }
  if (!(FINANCIAL_FACT_TYPES as readonly string[]).includes(fact.type)) {
    issues.push({
      code: "TYPE_UNSUPPORTED",
      field: "type",
      message: `type must be one of ${FINANCIAL_FACT_TYPES.join(", ")}.`,
    })
  }
  if (!Number.isInteger(fact.version) || fact.version < 1) {
    issues.push({
      code: "VERSION_INVALID",
      field: "version",
      message: "version must be an integer >= 1.",
    })
  }
  if (fact.confidence !== null && (!isFiniteNumber(fact.confidence) || fact.confidence < 0 || fact.confidence > 1)) {
    issues.push({
      code: "CONFIDENCE_OUT_OF_BOUNDS",
      field: "confidence",
      message: "confidence must be null or a finite number within [0, 1].",
    })
  }

  const provenanceSource = fact.provenance?.source
  if (typeof provenanceSource !== "string") {
    issues.push({
      code: "SOURCE_UNSUPPORTED",
      field: "provenance.source",
      message: "provenance.source must be one of USER, DOCUMENT, PROVIDER, SYSTEM, AI_EXTRACTED.",
    })
  }

  if (fact.observedAt !== null && !isIsoTimestamp(fact.observedAt) && !isIsoDate(fact.observedAt)) {
    issues.push({
      code: "OBSERVED_AT_INVALID",
      field: "observedAt",
      message: "observedAt must be null or an ISO-8601 date/timestamp.",
    })
  }

  issues.push(...validateValueShape(fact))
  issues.push(...validateCurrencyAndUnit(fact))
  issues.push(...validateConfirmation(fact))

  return issues
}

function validateValueShape(fact: FinancialFact): FinancialFactIssue[] {
  const issues: FinancialFactIssue[] = []
  const { value, type } = fact

  if (value === null) {
    if (fact.status === "CONFIRMED") {
      issues.push({
        code: "VALUE_MISSING",
        field: "value",
        message: "A CONFIRMED fact must carry a value; missing data must stay DRAFT.",
      })
    }
    return issues
  }

  const mismatch = (expected: string) => {
    issues.push({
      code: "VALUE_TYPE_MISMATCH",
      field: "value",
      message: `value must be ${expected} for type "${type}".`,
    })
  }

  switch (type) {
    case "money":
      if (!Number.isInteger(value)) mismatch("an integer number of minor units (cents)")
      break
    case "number":
      if (!isFiniteNumber(value)) mismatch("a finite number")
      break
    case "boolean":
      if (typeof value !== "boolean") mismatch("a boolean")
      break
    case "date":
      if (!isIsoDate(value)) mismatch("an ISO-8601 date string (YYYY-MM-DD)")
      break
    case "text":
    case "enum":
      if (typeof value !== "string") mismatch("a string")
      break
    default:
      break
  }

  return issues
}

function validateCurrencyAndUnit(fact: FinancialFact): FinancialFactIssue[] {
  const issues: FinancialFactIssue[] = []

  if (fact.type === "money") {
    if (fact.currency === null || fact.currency === "") {
      issues.push({
        code: "CURRENCY_REQUIRED",
        field: "currency",
        message: "Monetary facts require an explicit currency.",
      })
    } else if (!CURRENCY_CODE.test(fact.currency)) {
      issues.push({
        code: "CURRENCY_INVALID",
        field: "currency",
        message: "currency must be an uppercase ISO-4217 code.",
      })
    }
    if (fact.unit !== null) {
      issues.push({
        code: "UNIT_NOT_APPLICABLE",
        field: "unit",
        message: "Monetary facts are expressed in a currency and must not carry a unit.",
      })
    }
    return issues
  }

  if (fact.currency !== null) {
    issues.push({
      code: "CURRENCY_NOT_APPLICABLE",
      field: "currency",
      message: `currency is only applicable to monetary facts, not type "${fact.type}".`,
    })
  }
  if (fact.unit !== null && fact.type !== "number") {
    issues.push({
      code: "UNIT_NOT_APPLICABLE",
      field: "unit",
      message: `unit is only applicable to "number" and "money" facts, not type "${fact.type}".`,
    })
  }

  return issues
}

function validateConfirmation(fact: FinancialFact): FinancialFactIssue[] {
  const issues: FinancialFactIssue[] = []
  const aiDerived = isAiDerivedSource(fact.provenance.source)

  if (fact.status === "CONFIRMED") {
    const hasConfirmationMetadata = isNonEmptyString(fact.confirmedBy) && isNonEmptyString(fact.confirmedAt)
    if (!hasConfirmationMetadata) {
      issues.push({
        code: "CONFIRMATION_METADATA_REQUIRED",
        field: "confirmedBy",
        message: "A CONFIRMED fact requires both confirmedBy and confirmedAt.",
      })
    }

    // AI-derived facts must be confirmed by an explicit human action, never by
    // the extraction pipeline that produced them.
    if (aiDerived) {
      if (!hasConfirmationMetadata) {
        issues.push({
          code: "AI_FACT_AUTO_CONFIRMED",
          field: "status",
          message: "An AI_EXTRACTED fact cannot become CONFIRMED without explicit human confirmation.",
        })
      } else if (!isIsoTimestamp(fact.confirmedAt)) {
        issues.push({
          code: "CONFIRMATION_METADATA_REQUIRED",
          field: "confirmedAt",
          message: "confirmedAt must be an ISO-8601 timestamp.",
        })
      } else {
        const retrievedAt = fact.provenance.retrievedAt
        if (retrievedAt !== null && isIsoTimestamp(retrievedAt) && Date.parse(fact.confirmedAt) <= Date.parse(retrievedAt)) {
          issues.push({
            code: "AI_FACT_CONFIRMED_WITHOUT_REVIEW",
            field: "confirmedAt",
            message: "AI-derived confirmation must occur after the extraction was retrieved, not during it.",
          })
        }
      }
    }
  }

  // Evidence-backed extraction must point at its evidence.
  if (aiDerived && fact.status !== "DRAFT" && fact.status !== "REJECTED" && fact.evidenceReference === null) {
    issues.push({
      code: "EVIDENCE_REFERENCE_REQUIRED",
      field: "evidenceReference",
      message: "An AI_EXTRACTED fact that leaves DRAFT must reference its evidence.",
    })
  }

  return issues
}

export function isValidFinancialFact(fact: FinancialFact): boolean {
  return validateFinancialFact(fact).length === 0
}

export class FinancialFactValidationError extends Error {
  readonly issues: FinancialFactIssue[]

  constructor(issues: FinancialFactIssue[]) {
    super(`INVALID_FINANCIAL_FACT: ${issues.map((issue) => issue.code).join(", ")}`)
    this.name = "FinancialFactValidationError"
    this.issues = issues
  }
}

export function assertValidFinancialFact(fact: FinancialFact): FinancialFact {
  const issues = validateFinancialFact(fact)
  if (issues.length > 0) throw new FinancialFactValidationError(issues)
  return fact
}
