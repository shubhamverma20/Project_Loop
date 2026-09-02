import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateInsightsReport } from '@/app/actions/insights'
import { InsightReportSchema } from '@/types/insights'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/session'
import { GoogleGenAI } from '@google/genai'

// Mock GoogleGenAI
vi.mock('@google/genai', () => {
  const MockGoogleGenAI = vi.fn()
  MockGoogleGenAI.prototype.models = {
    generateContent: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: "Test summary",
        keyThemes: ["Test theme"],
        painPoints: ["Test pain"],
        positiveTrends: [],
        negativeTrends: [],
        featureRequests: [],
        risks: [],
        recommendedActions: []
      })
    })
  }
  return { GoogleGenAI: MockGoogleGenAI }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: { findFirst: vi.fn(), create: vi.fn() },
    feedback: { findFirst: vi.fn(), findMany: vi.fn() }
  }
}))

describe('AI Insights Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate the structured AI response with Zod', () => {
    const validPayload = {
      summary: "Summary",
      keyThemes: ["A", "B"],
      painPoints: ["C"],
      positiveTrends: [],
      negativeTrends: [],
      featureRequests: [],
      risks: [],
      recommendedActions: []
    }
    expect(() => InsightReportSchema.parse(validPayload)).not.toThrow()

    const invalidPayload = {
      summary: 123 // Should be string
    }
    expect(() => InsightReportSchema.parse(invalidPayload)).toThrow()
  })

  it('should return cached report if one was already generated today', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u1', workspaceId: 't1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.report.findFirst).mockResolvedValueOnce({
      id: 'report-123',
      title: 'Insights',
      periodStart: new Date(),
      periodEnd: new Date(),
      contentJson: { summary: "Cached summary" } as any,
      workspaceId: 't1',
      createdAt: new Date(),
      generatedById: 'u1'
    })

    vi.mocked(prisma.feedback.findFirst).mockResolvedValueOnce(null)

    const res = await generateInsightsReport()
    
    expect(res.data?.id).toBe('report-123')
    expect(res.data?.report.summary).toBe('Cached summary')
    
    // Ensure we did NOT fetch raw feedback since we hit the cache
    expect(prisma.feedback.findMany).not.toHaveBeenCalled()
  })
})
