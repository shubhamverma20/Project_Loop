import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

interface MemoryRateLimitRecord {
  count: number
  resetTime: number
}

const memoryRateLimitStore = new Map<string, MemoryRateLimitRecord>()

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of memoryRateLimitStore.entries()) {
    if (now > record.resetTime) {
      memoryRateLimitStore.delete(key)
    }
  }
}, 60 * 1000)

let upstashRatelimit: Ratelimit | null = null

function getUpstashRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token || url.includes("your_upstash") || token.includes("your_upstash")) {
    return null
  }

  if (!upstashRatelimit) {
    try {
      const redis = new Redis({ url, token })
      upstashRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
      })
    } catch (err) {
      console.error("Failed to initialize Upstash Redis Ratelimit:", err)
      return null
    }
  }

  return upstashRatelimit
}

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const record = memoryRateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    memoryRateLimitStore.set(identifier, { count: 1, resetTime })
    return { success: true, remaining: limit - 1, reset: resetTime }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime }
  }

  record.count += 1
  memoryRateLimitStore.set(identifier, record)
  return { success: true, remaining: limit - record.count, reset: record.resetTime }
}

export async function checkRateLimitAsync(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const upstash = getUpstashRatelimit()
  if (upstash) {
    try {
      const res = await upstash.limit(identifier)
      return {
        success: res.success,
        remaining: res.remaining,
        reset: res.reset
      }
    } catch (err) {
      console.warn("Upstash Redis error, falling back to in-memory rate limiter:", err)
    }
  }

  return checkRateLimit(identifier, limit, windowMs)
}
