import { vi } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      workspace: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      feedback: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      theme: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      report: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      feedbackTheme: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb({
        feedback: { create: vi.fn().mockResolvedValue({ id: 'test-id' }) },
        theme: { findFirst: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'theme-id' }) },
        feedbackTheme: { create: vi.fn() },
        $executeRaw: vi.fn(),
      })),
      $queryRaw: vi.fn(),
    }
  }
})

// Mock Session & Auth
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null)
}))

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', workspaceId: 'workspace-1', role: 'ADMIN' }
  })
}))

// Mock AI & Embeddings
vi.mock('@/lib/ai', () => ({
  classifyFeedback: vi.fn().mockResolvedValue({
    sentiment: 'POS',
    sentimentScore: 0.9,
    themes: ['Testing'],
    featureArea: 'Tests',
    category: 'Praise'
  })
}))

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))
