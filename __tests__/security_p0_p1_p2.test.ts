import { describe, it, expect } from 'vitest'
import { sanitizeText } from '@/lib/ingestion-pipeline'
import { POST as verifyOtpPost } from '@/app/api/verify-otp/route'

describe('P0 / P1 / P2 Security & Robustness Tests', () => {
  it('Item 15: should neutralize XSS attack vectors in sanitizeText', () => {
    const maliciousPayload = '<img src=x onerror=alert(1)>Hello <b>World</b><script>console.log("hacked")</script>'
    const sanitized = sanitizeText(maliciousPayload)
    expect(sanitized).toBe('Hello World')
    expect(sanitized).not.toContain('<img')
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('<script>')
  })

  it('Item 1: should return 400 if newPassword is missing in verify-otp route', async () => {
    const req = {
      json: async () => ({ email: 'user@example.com', otp: '123456' }),
    } as any

    const res = await verifyOtpPost(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('New password is required')
  })
})
