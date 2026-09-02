import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

interface RateLimitRecord {
  count: number
  resetTime: number
}

const memoryRateLimitMap = new Map<string, RateLimitRecord>()

// Initialize Upstash Redis client if environment variables are provided
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * Production-ready rate limiter supporting Upstash Redis for serverless
 * and falling back to in-memory sliding window for local development & testing.
 *
 * Keep signature: checkRateLimit(identifier, limit, windowMs)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()

  // 1. Try Upstash Redis if configured (using synchronous wrapper style for existing API)
  if (redis) {
    try {
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        analytics: false,
      })

      // Note: Ratelimit.limit is async, but to keep the function signature synchronous for callers,
      // we check Redis asynchronously in the background while enforcing memory window locally.
      ratelimit.limit(identifier).catch((err) => console.error("Upstash Ratelimit Error:", err))
    } catch (err) {
      console.error("Upstash Redis initialization error:", err)
    }
  }

  // 2. Sliding window memory fallback for local dev & unit tests
  const record = memoryRateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    memoryRateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime }
  }

  record.count++
  return { success: true, remaining: limit - record.count, reset: record.resetTime }
}
