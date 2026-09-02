import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/feedback/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { bulkImportFeedback } from '@/app/actions/ingestion'
import { verifySession } from '@/lib/auth/session'

// Helper to create a request mock compatible with NextRequest API in Vitest
function createMockRequest(options: { headers?: Record<string, string>; body?: any }) {
  const map = new Map<string, string>()
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      map.set(k.toLowerCase(), v)
    }
  }
  return {
    headers: {
      get: (name: string) => map.get(name.toLowerCase()) || null,
    },
    ip: '127.0.0.1',
    json: async () => options.body,
  } as any
}

describe('Direct Feedback API & Ingestion Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/feedback Security & Validation', () => {
    it('should return 401 Unauthorized if no API key or session is present', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any)

      const req = createMockRequest({
        body: { content: 'Test feedback' },
        headers: { 'content-type': 'application/json' }
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should authenticate successfully using x-api-key header', async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: 'workspace-123',
        name: 'Test Workspace',
        apiKey: 'valid_api_key_123',
        createdAt: new Date()
      } as any)

      vi.mocked(prisma.theme.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) => {
        return cb({
          feedback: {
            create: vi.fn().mockResolvedValue({
              id: 'fb-1',
              content: 'Great product!',
              category: 'Praise',
              sentiment: 'POS',
              channel: 'API',
              createdAt: new Date()
            })
          },
          $executeRaw: vi.fn().mockResolvedValue(1),
          theme: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }) },
          feedbackTheme: { create: vi.fn().mockResolvedValue({}) }
        })
      })

      const req = createMockRequest({
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'valid_api_key_123'
        },
        body: { content: 'Great product!', channel: 'API' }
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('fb-1')
    })

    it('should return 400 Bad Request on invalid request body', async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: 'workspace-123',
        name: 'Test Workspace',
        apiKey: 'valid_api_key_123',
        createdAt: new Date()
      } as any)

      const req = createMockRequest({
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'valid_api_key_123'
        },
        body: { content: '' } // Empty content
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Invalid request payload')
    })

    it('should handle GET /api/feedback/stream session authentication', async () => {
      const { GET: GET_STREAM } = await import('@/app/api/feedback/stream/route')
      
      vi.mocked(verifySession).mockResolvedValueOnce(null as any)
      const unauthReq = { signal: { addEventListener: vi.fn() } } as any
      const unauthRes = await GET_STREAM(unauthReq)
      expect(unauthRes.status).toBe(401)

      vi.mocked(verifySession).mockResolvedValueOnce({
        user: { id: 'u1', workspaceId: 'workspace-123', role: 'ADMIN' }
      } as any)
      const authReq = { signal: { addEventListener: vi.fn() } } as any
      const authRes = await GET_STREAM(authReq)
      expect(authRes.status).toBe(200)
      expect(authRes.headers.get('content-type')).toBe('text/event-stream')
    })
  })

  describe('CSV Import Duplicate Prevention', () => {
    it('should skip duplicate records during bulk import', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({
        user: { id: 'u1', workspaceId: 'workspace-123', role: 'ADMIN' }
      } as any)

      vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce([
        { normalizedContent: 'already existing feedback' }
      ] as any)

      const csvRows = [
        { content: 'Already existing feedback', channel: 'CSV Import' },
        { content: 'Brand new feedback', channel: 'CSV Import' }
      ]

      vi.mocked(prisma.theme.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) => {
        return cb({
          feedback: {
            create: vi.fn().mockResolvedValue({ id: 'fb-new', content: 'Brand new feedback' })
          },
          $executeRaw: vi.fn().mockResolvedValue(1),
          theme: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }) },
          feedbackTheme: { create: vi.fn().mockResolvedValue({}) }
        })
      })

      const res = await bulkImportFeedback(csvRows)

      expect(res.success).toBe(true)
      expect(res.summary?.successful).toBe(1)
      expect(res.summary?.skipped).toBe(1)
      expect(res.summary?.total).toBe(2)
    })

    it('should correctly parse CSV rows with header variations (Content, feedback, review) and fallback channel to CSV', async () => {
      vi.mocked(verifySession).mockResolvedValue({
        user: { workspaceId: 'ws-test-123', email: 'test@example.com', role: 'MEMBER' }
      } as any)
      vi.mocked(prisma.feedback.findMany).mockResolvedValue([])
      vi.mocked(prisma.theme.findMany).mockResolvedValue([])
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          feedback: { create: vi.fn().mockResolvedValue({ id: 'fb-test' }) },
          $executeRaw: vi.fn().mockResolvedValue(1),
          theme: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }) },
          feedbackTheme: { create: vi.fn().mockResolvedValue({}) }
        })
      })

      // 1. content,channel
      const res1 = await bulkImportFeedback([{ content: 'Great app feature', channel: 'Web' }])
      expect(res1.summary?.successful).toBe(1)

      // 2. Content,Channel (case & space insensitive)
      const res2 = await bulkImportFeedback([{ ' Content ': 'Awesome UI responsiveness', ' Channel ': ' Mobile ' }])
      expect(res2.summary?.successful).toBe(1)

      // 3. feedback,channel
      const res3 = await bulkImportFeedback([{ feedback: 'Export function was fast', channel: 'Portal' }])
      expect(res3.summary?.successful).toBe(1)

      // 4. review (optional channel falls back to CSV)
      const res4 = await bulkImportFeedback([{ review: 'Love the AI report insights!' }])
      expect(res4.summary?.successful).toBe(1)

      // 5. E-commerce Product CSV (Product, Price, Category, Stock)
      const res5 = await bulkImportFeedback([{ Product: 'Wireless Headphones', Price: '199', Category: 'Audio', Stock: '50' }], 'ECOMMERCE_PRODUCT')
      expect(res5.summary?.successful).toBe(1)

      // 6. invalid CSV without any recognizable feedback or product column
      const res6 = await bulkImportFeedback([{ invalidColumn: 'No feedback key', rating: 5 }])
      expect(res6.summary?.failed).toBe(1)
      expect(res6.summary?.successful).toBe(0)
    })

    it('should simulate channel sync for Zendesk, Intercom, and Play Store without duplicates', async () => {
      const { simulateChannelSync } = await import('@/app/actions/ingestion')

      vi.mocked(verifySession).mockResolvedValue({
        user: { workspaceId: 'ws-test-123', email: 'test@example.com', role: 'MEMBER' }
      } as any)

      vi.mocked(prisma.feedback.findMany).mockResolvedValue([])
      vi.mocked(prisma.theme.findMany).mockResolvedValue([])
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          feedback: {
            create: vi.fn().mockResolvedValue({ id: 'fb-synced-1', content: 'Synced item' })
          },
          $executeRaw: vi.fn().mockResolvedValue(1),
          theme: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }) },
          feedbackTheme: { create: vi.fn().mockResolvedValue({}) }
        })
      })

      // Sync Zendesk
      const zdRes = await simulateChannelSync('Zendesk')
      expect(zdRes.success).toBe(true)
      expect(zdRes.count).toBe(2)

      // Sync Intercom
      const intRes = await simulateChannelSync('Intercom')
      expect(intRes.success).toBe(true)
      expect(intRes.count).toBe(2)

      // Sync Play Store
      const psRes = await simulateChannelSync('Play Store')
      expect(psRes.success).toBe(true)
      expect(psRes.count).toBe(2)
    })
  })
})
