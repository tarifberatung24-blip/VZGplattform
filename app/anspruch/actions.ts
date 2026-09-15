"use server"

import { createClient } from "@/lib/supabase/server"
import {
  BENEFIT_ELIGIBILITY_RULE_VERSION,
  evaluateBenefitEligibility,
} from "@/lib/benefits/eligibility-engine"
import { BENEFIT_QUIZ_QUESTIONS } from "@/lib/benefits/quiz-questions"
import type { BenefitAnswers, BenefitAnswerKey, BenefitCheckRecord, SaveBenefitCheckResult } from "@/lib/benefits/types"

const ANSWER_KEYS = BENEFIT_QUIZ_QUESTIONS.map((question) => question.key)

function isBenefitAnswers(value: unknown): value is BenefitAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return ANSWER_KEYS.every((key) => typeof record[key] === "boolean")
}

function normalizeAnswers(answers: BenefitAnswers): BenefitAnswers {
  return Object.fromEntries(ANSWER_KEYS.map((key) => [key, Boolean(answers[key as BenefitAnswerKey])])) as BenefitAnswers
}

export async function saveBenefitCheck(rawAnswers: unknown): Promise<SaveBenefitCheckResult> {
  if (!isBenefitAnswers(rawAnswers)) return { ok: false, code: "INVALID_ANSWERS" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: "AUTH_REQUIRED" }

  const answers = normalizeAnswers(rawAnswers)
  const results = evaluateBenefitEligibility(answers)

  const { data, error } = await supabase
    .from("benefit_checks")
    .insert({
      user_id: user.id,
      answers,
      results,
      rule_version: BENEFIT_ELIGIBILITY_RULE_VERSION,
    })
    .select("id, user_id, answers, results, rule_version, created_at")
    .single()

  if (error) {
    if (error.code === "42P01" || error.message.includes("benefit_checks")) {
      return { ok: false, code: "SCHEMA_MISSING" }
    }
    return { ok: false, code: "SAVE_FAILED" }
  }

  return { ok: true, check: data as BenefitCheckRecord }
}
