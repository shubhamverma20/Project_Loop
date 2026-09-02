interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

/**
 * In-memory rate limiter with sliding window.
 * Default: 60 requests per minute per identifier.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime }
  }

  record.count++
  return { success: true, remaining: limit - record.count, reset: record.resetTime }
}
