import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardStats } from '@/app/actions/analytics'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/session'

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should deny access if unauthorized', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null)
    const res = await getDashboardStats()
    expect(res.error).toBe('Unauthorized')
  })

  it('should enforce tenant isolation (workspaceId) on all aggregations', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u1', workspaceId: 'tenant-123', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.feedback.count).mockResolvedValue(0)
    vi.mocked(prisma.feedback.findMany).mockResolvedValue([])
    vi.mocked(prisma.theme.findMany).mockResolvedValue([])

    await getDashboardStats('30d')

    // Verify first count call uses workspaceId
    expect(prisma.feedback.count).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'tenant-123'
        })
      })
    )

    // Verify findMany uses workspaceId
    expect(prisma.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'tenant-123'
        })
      })
    )
  })
})
