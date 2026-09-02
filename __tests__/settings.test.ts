import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettingsData, updateWorkspaceName, updateProfile, inviteTeamMember, updateMemberRole, removeTeamMember } from '@/app/actions/settings'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth/session'
import { Role } from '@prisma/client'

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn()
    }
  }
}))

describe('Settings Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return settings data for authenticated user', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'test@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
      id: 'w-1', name: 'Test Corp', apiKey: 'key-123', createdAt: new Date()
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'u-1', name: 'Admin User', email: 'test@example.com', role: 'ADMIN', passwordHash: 'hash'
    } as any)

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: 'u-1', name: 'Admin User', email: 'test@example.com', role: 'ADMIN', image: null }
    ] as any)

    const res = await getSettingsData()
    expect(res.error).toBeNull()
    expect(res.data?.workspace.name).toBe('Test Corp')
    expect(res.data?.currentUser.hasPassword).toBe(true)
    expect(res.data?.members.length).toBe(1)
  })

  it('should enforce ADMIN role when updating workspace name', async () => {
    // Non-admin attempt
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-2', email: 'viewer@example.com', workspaceId: 'w-1', role: 'VIEWER' }
    } as any)

    const res = await updateWorkspaceName('New Name')
    expect(res.success).toBe(false)
    expect(res.error).toContain('Forbidden')

    // Admin attempt
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'admin@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.workspace.update).mockResolvedValueOnce({ id: 'w-1', name: 'New Name' } as any)

    const resAdmin = await updateWorkspaceName('New Workspace Name')
    expect(resAdmin.success).toBe(true)
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: 'w-1' },
      data: { name: 'New Workspace Name' }
    })
  })

  it('should allow user to update their own profile name', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'admin@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.user.update).mockResolvedValueOnce({ id: 'u-1', name: 'Updated Name' } as any)

    const res = await updateProfile('Updated Name')
    expect(res.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: { name: 'Updated Name' }
    })
  })

  it('should invite a new team member with RBAC validation', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'admin@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: 'u-new', email: 'newmember@company.com', role: Role.ANALYST, workspaceId: 'w-1'
    } as any)

    const res = await inviteTeamMember({
      email: 'newmember@company.com',
      name: 'New Analyst',
      role: Role.ANALYST
    })

    expect(res.success).toBe(true)
    expect(prisma.user.create).toHaveBeenCalled()
  })

  it('should update team member role with demotion safeguards', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'admin@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'u-1', workspaceId: 'w-1', role: Role.ADMIN
    } as any)

    vi.mocked(prisma.user.count).mockResolvedValueOnce(1) // Sole admin

    // Attempting self demotion when sole admin
    const res = await updateMemberRole('u-1', Role.VIEWER)
    expect(res.success).toBe(false)
    expect(res.error).toContain('sole ADMIN')
  })

  it('should prevent removing oneself from the workspace', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      user: { id: 'u-1', email: 'admin@example.com', workspaceId: 'w-1', role: 'ADMIN' }
    } as any)

    const res = await removeTeamMember('u-1')
    expect(res.success).toBe(false)
    expect(res.error).toContain('cannot remove yourself')
  })
})
