/**
 * HORIZON NEGOTIATION — bill verification.
 *
 * A saving is never marked VERIFIED because the provider said so. It becomes
 * VERIFIED only when a later billing statement proves the lower recurring cost.
 * Until then the saving stays CONFIRMED (or OFFERED), and the two are never
 * shown as one another.
 *
 * Verification compares the expected negotiated terms against what the bill
 * actually shows and returns one of:
 *
 *   VERIFIED            every expected term is met
 *   MISMATCH            an expected term is contradicted by the bill
 *   NOT_YET_EFFECTIVE   the negotiated terms have not started on this bill yet
 */

import type { VerificationResult } from "./contract"

/** The terms the negotiation expects to see on the next bill. */
export type ExpectedBillTerms = {
  monthlyCost: number | null
  oneTimeCredit: number | null
  activationFee: number | null
  effectiveDate: string | null
}

/** What a supplied bill actually shows. Absent fields are null, not zero. */
export type ActualBillTerms = {
  monthlyCost: number | null
  oneTimeCredit: number | null
  activationFee: number | null
  billingPeriodStart: string | null
  billingPeriodEnd: string | null
}

export type VerificationDiscrepancy = {
  field: "monthly_cost" | "one_time_credit" | "activation_fee" | "effective_date"
  expected: number | string | null
  actual: number | string | null
}

export type BillVerification = {
  result: VerificationResult
  discrepancies: VerificationDiscrepancy[]
  /** Human-readable codes the UI renders; no numbers are invented. */
  followUpActions: string[]
}

const TOLERANCE = 0.01

export function verifyBill(input: {
  expected: ExpectedBillTerms
  actual: ActualBillTerms
  /** Today, ISO. Used to decide whether the bill predates the effective date. */
  today: string
}): BillVerification {
  const { expected, actual } = input
  const discrepancies: VerificationDiscrepancy[] = []

  // A bill whose period ends before the negotiated terms take effect cannot
  // verify anything. This is the honest "check the next statement" outcome.
  if (
    expected.effectiveDate != null &&
    actual.billingPeriodEnd != null &&
    actual.billingPeriodEnd < expected.effectiveDate
  ) {
    return {
      result: "NOT_YET_EFFECTIVE",
      discrepancies: [],
      followUpActions: ["verification.not_yet_effective"],
    }
  }

  if (expected.monthlyCost != null) {
    if (actual.monthlyCost == null) {
      discrepancies.push({ field: "monthly_cost", expected: expected.monthlyCost, actual: null })
    } else if (Math.abs(actual.monthlyCost - expected.monthlyCost) > TOLERANCE) {
      discrepancies.push({
        field: "monthly_cost",
        expected: expected.monthlyCost,
        actual: actual.monthlyCost,
      })
    }
  }

  if (expected.oneTimeCredit != null && expected.oneTimeCredit > 0) {
    if (actual.oneTimeCredit == null) {
      discrepancies.push({
        field: "one_time_credit",
        expected: expected.oneTimeCredit,
        actual: null,
      })
    } else if (actual.oneTimeCredit + TOLERANCE < expected.oneTimeCredit) {
      discrepancies.push({
        field: "one_time_credit",
        expected: expected.oneTimeCredit,
        actual: actual.oneTimeCredit,
      })
    }
  }

  // An expected zero activation fee means "none should appear". Any charge is a
  // discrepancy, which is exactly the case a negotiation product tends to hide.
  if (expected.activationFee != null) {
    const expectedFee = expected.activationFee
    const actualFee = actual.activationFee ?? 0
    if (Math.abs(actualFee - expectedFee) > TOLERANCE) {
      discrepancies.push({
        field: "activation_fee",
        expected: expectedFee,
        actual: actual.activationFee,
      })
    }
  }

  if (discrepancies.length === 0) {
    return { result: "VERIFIED", discrepancies: [], followUpActions: [] }
  }

  return {
    result: "MISMATCH",
    discrepancies,
    followUpActions: discrepancies.map((item) => `verification.mismatch.${item.field}`),
  }
}
