type Bucket = { count: number; resetAt: number }

type RateLimitOptions = {
  limit: number
  windowMs: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey)
      }
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string)
    }
    const next = { count: 1, resetAt: now + options.windowMs }
    buckets.set(key, next)
    return { allowed: true, remaining: options.limit - 1, retryAfter: 0 }
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }

  current.count += 1
  return { allowed: true, remaining: options.limit - current.count, retryAfter: 0 }
}

export function getRequestKey(request: Request, suffix: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  return `${suffix}:${forwarded || realIp || "unknown"}`
}
