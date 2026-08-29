import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchFeedback } from '@/app/actions/explorer'
import { bulkImportFeedback } from '@/app/actions/ingestion'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/session'

describe('Week 2 Capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tenant Isolation & Search', () => {
    it('should throw an error if no session/workspace is present', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce(null)
      await expect(searchFeedback({})).rejects.toThrow('Unauthorized')
    })

    it('should inject workspaceId into the findMany query to enforce tenant isolation', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({
        user: { id: 'u1', workspaceId: 'tenant-A', role: 'ADMIN' }
      } as any)
      
      vi.mocked(prisma.feedback.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.feedback.count).mockResolvedValueOnce(0)

      await searchFeedback({ category: 'Bug' })

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'tenant-A',
            category: 'Bug'
          })
        })
      )
    })
  })

  describe('Feedback Ingestion & Validation', () => {
    it('should reject invalid rows based on Zod validation', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({
        user: { id: 'u1', workspaceId: 'tenant-A', role: 'ADMIN' }
      } as any)

      const invalidData = [
        { channel: 'Twitter' } // Missing content
      ]

      const res = await bulkImportFeedback(invalidData)
      
      expect(res.success).toBe(true)
      expect(res.summary?.failed).toBe(1)
      expect(res.summary?.success).toBe(0)
    })
    
    it('should successfully process valid rows', async () => {
      vi.mocked(verifySession).mockResolvedValueOnce({
        user: { id: 'u1', workspaceId: 'tenant-A', role: 'ADMIN' }
      } as any)
      
      vi.mocked(prisma.theme.findMany).mockResolvedValueOnce([])

      const validData = [
        { content: 'Great app!', channel: 'Twitter' }
      ]

      const res = await bulkImportFeedback(validData)
      
      expect(res.success).toBe(true)
      expect(res.summary?.failed).toBe(0)
      expect(res.summary?.success).toBe(1)
      
      // Verification that prisma transaction was called
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})
