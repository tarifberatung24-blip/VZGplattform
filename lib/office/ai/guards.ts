import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/database'

const intEnv = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export const aiLimits = () => ({
  daily: intEnv('AI_DAILY_LIMIT', 5),
  monthly: intEnv('AI_MONTHLY_LIMIT', 50),
})

export async function consumeAiQuota(admin: SupabaseClient<Database>, userId: string) {
  const limits = aiLimits()
  const { data, error } = await admin.rpc('consume_ai_quota', {
    p_user_id: userId,
    p_daily_limit: limits.daily,
    p_monthly_limit: limits.monthly,
  })
  if (error) return { error: error.message }
  const result = Array.isArray(data) ? data[0] : data
  if (!result) return { error: 'AI quota check returned no result' }
  return { quota: result }
}

class GroqCircuitBreaker {
  private failures = 0
  private openedAt = 0
  private readonly threshold = 3
  private readonly cooldownMs = 60_000

  allow() {
    if (!this.openedAt) return true
    if (Date.now() - this.openedAt >= this.cooldownMs) {
      this.failures = 0
      this.openedAt = 0
      return true
    }
    return false
  }

  success() {
    this.failures = 0
    this.openedAt = 0
  }

  failure() {
    this.failures += 1
    if (this.failures >= this.threshold) this.openedAt = Date.now()
  }
}

export const groqCircuitBreaker = new GroqCircuitBreaker()
