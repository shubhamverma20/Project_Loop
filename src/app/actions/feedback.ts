"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { Status, Sentiment, Role, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { classifyFeedback } from "@/lib/ai"

export async function getDashboardFeedback() {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", data: null }
  }

  try {
    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId: session.user.workspaceId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50 // Limit to 50 for the initial dashboard view
    })

    return { data: feedback, error: null }
  } catch (error) {
    console.error("Error fetching feedback:", error)
    return { error: "Failed to fetch feedback", data: null }
  }
}

export interface GetPaginatedFeedbackParams {
  page: number
  limit: number
  search?: string
  status?: string
  sentiment?: string
  channel?: string
}

export async function getPaginatedFeedback(params: GetPaginatedFeedbackParams) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", data: null, totalCount: 0 }
  }

  const { page, limit, search, status, sentiment, channel } = params
  const skip = (page - 1) * limit

  // Construct dynamic where clause
  const where: Prisma.FeedbackWhereInput = {
    workspaceId: session.user.workspaceId,
  }

  if (search) {
    where.content = { contains: search, mode: "insensitive" }
  }
  if (status && status !== "ALL") {
    where.status = status as Status
  }
  if (sentiment && sentiment !== "ALL") {
    where.sentiment = sentiment as Sentiment
  }
  if (channel && channel !== "ALL") {
    where.channel = channel
  }

  try {
    const [data, totalCount] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.feedback.count({ where })
    ])

    return { data, totalCount, error: null }
  } catch (error) {
    console.error("Error fetching paginated feedback:", error)
    return { error: "Failed to fetch feedback", data: null, totalCount: 0 }
  }
}

export async function updateFeedbackStatus(id: string, newStatus: Status) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", success: false }
  }

  // RBAC: Only ADMIN and ANALYST can update status
  if (session.user.role === Role.VIEWER) {
    return { error: "Forbidden: Viewers cannot change status", success: false }
  }

  try {
    // First ensure the feedback belongs to the user's workspace
    const existing = await prisma.feedback.findUnique({
      where: { id }
    })

    if (!existing || existing.workspaceId !== session.user.workspaceId) {
      return { error: "Feedback not found", success: false }
    }

    await prisma.feedback.update({
      where: { id },
      data: { status: newStatus }
    })

    revalidatePath("/feedback")
    revalidatePath("/dashboard")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error updating status:", error)
    return { error: "Failed to update status", success: false }
  }
}

export async function reclassifyFeedback(id: string) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", success: false }
  }

  // RBAC: Only ADMIN and ANALYST can re-classify
  if (session.user.role === Role.VIEWER) {
    return { error: "Forbidden: Viewers cannot trigger AI classification", success: false }
  }

  try {
    const existing = await prisma.feedback.findUnique({
      where: { id }
    })

    if (!existing || existing.workspaceId !== session.user.workspaceId) {
      return { error: "Feedback not found", success: false }
    }

    const workspaceId = session.user.workspaceId

    // Fetch existing themes for context
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId },
      select: { name: true }
    })
    const themeNames = existingThemes.map(t => t.name)

    // Call Claude
    const aiResult = await classifyFeedback(existing.content, themeNames)

    await prisma.$transaction(async (tx) => {
      // Update the record
      await tx.feedback.update({
        where: { id },
        data: {
          sentiment: aiResult.sentiment,
          sentimentScore: aiResult.sentimentScore,
          featureArea: aiResult.featureArea,
        }
      })

      // Delete existing theme links for this feedback
      await tx.feedbackTheme.deleteMany({
        where: { feedbackId: id }
      })

      // Re-link new themes
      for (const themeName of aiResult.themes) {
        let theme = await tx.theme.findFirst({
          where: { 
            name: { equals: themeName, mode: 'insensitive' },
            workspaceId 
          }
        })

        if (!theme) {
          theme = await tx.theme.create({
            data: {
              name: themeName,
              workspaceId
            }
          })
        }

        await tx.feedbackTheme.create({
          data: {
            feedbackId: id,
            themeId: theme.id,
            confidence: 0.9
          }
        })
      }
    })

    revalidatePath("/feedback")
    revalidatePath("/dashboard")
    revalidatePath("/themes")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error reclassifying feedback:", error)
    return { error: "Failed to run AI classification", success: false }
  }
}
