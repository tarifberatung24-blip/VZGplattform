import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { evaluateBenefits, BENEFIT_RULES_VERSION } from "@/lib/benefits/rules"
import { BENEFIT_ANSWER_KEYS, type BenefitAnswers } from "@/lib/benefits/types"

function getServerClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const authorization = request.headers.get("authorization")
  if (!url || !key || !authorization?.startsWith("Bearer ")) return null
  return createClient(url, key, { global: { headers: { Authorization: authorization } } })
}

function parseAnswers(value: unknown): BenefitAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (BENEFIT_ANSWER_KEYS.some((key) => typeof input[key] !== "boolean")) return null
  return Object.fromEntries(BENEFIT_ANSWER_KEYS.map((key) => [key, input[key]])) as BenefitAnswers
}

export async function POST(request: Request) {
  try {
    const supabase = getServerClient(request)
    if (!supabase) return NextResponse.json({ error: "Authentication and Supabase configuration are required." }, { status: 401 })
    const token = request.headers.get("authorization")!.slice("Bearer ".length)
    const userResult = await supabase.auth.getUser(token)
    if (userResult.error || !userResult.data.user) return NextResponse.json({ error: "Please sign in before saving a check." }, { status: 401 })

    const body = await request.json().catch(() => null)
    const answers = parseAnswers(body?.answers)
    if (!answers) return NextResponse.json({ error: "All eligibility answers must be true or false." }, { status: 400 })

    const decision = evaluateBenefits(answers)
    const { data, error } = await supabase
      .from("benefit_checks")
      .insert({
        user_id: userResult.data.user.id,
        answers,
        eligible_benefits: decision.benefits,
        eligible_benefit_keys: decision.eligibleBenefitKeys,
        reasoning: decision.reasoning,
        rules_version: BENEFIT_RULES_VERSION,
      })
      .select("id,user_id,answers,eligible_benefits,eligible_benefit_keys,reasoning,rules_version,created_at")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ check: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "The eligibility check could not be saved." }, { status: 500 })
  }
}
