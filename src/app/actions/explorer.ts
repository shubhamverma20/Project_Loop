"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "@/lib/embeddings"
import { Prisma } from "@prisma/client"

export type SearchFilters = {
  query?: string
  category?: string
  sentiment?: string
  channel?: string
  startDate?: string
  endDate?: string
}

export async function searchFeedback(filters: SearchFilters, page = 1, limit = 10) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) {
    throw new Error("Unauthorized")
  }
  const workspaceId = session.user.workspaceId
  const offset = (page - 1) * limit

  let feedbackIds: string[] | null = null

  // 1. Semantic Search (Vector)
  if (filters.query && filters.query.trim().length > 0) {
    try {
      const queryVector = await generateEmbedding(filters.query)
      
      // Perform pgvector cosine similarity search (<=>)
      // We only fetch IDs to keep it performant, then use findMany for relationships
      const vectorResults = await prisma.$queryRaw<{ id: string }[]>`
        SELECT f.id
        FROM "Feedback" f
        JOIN "Embedding" e ON e."feedbackId" = f.id
        WHERE f."workspaceId" = ${workspaceId}
        ORDER BY e.vector <=> ${queryVector}::vector
        LIMIT 50
      `
      
      feedbackIds = vectorResults.map(r => r.id)
      
      if (feedbackIds.length === 0) {
        return { data: [], total: 0 }
      }
    } catch (err) {
      console.error("Vector search failed, falling back to standard filters", err)
      // Fallback behavior if vector generation or DB fails
    }
  }

  // 2. Build Prisma Where Clause for standard filters
  const where: Prisma.FeedbackWhereInput = {
    workspaceId,
    ...(feedbackIds ? { id: { in: feedbackIds } } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(filters.sentiment ? { sentiment: filters.sentiment as any } : {}),
    ...(filters.channel ? { channel: filters.channel } : {}),
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
  }

  // 3. Item 5 Fix: If vector search is active, fetch all matching rows, sort by vector score, then slice
  if (feedbackIds) {
    const [total, allMatchingData] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        include: {
          themes: {
            include: { theme: true }
          }
        }
      })
    ])

    const sortedData = [...allMatchingData].sort((a, b) => {
      const indexA = feedbackIds!.indexOf(a.id)
      const indexB = feedbackIds!.indexOf(b.id)
      return indexA - indexB
    })

    const paginatedData = sortedData.slice(offset, offset + limit)
    return { data: paginatedData, total }
  }

  // Standard non-vector query pagination
  const [total, data] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      include: {
        themes: {
          include: { theme: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  ])

  return { data, total }
}
