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
