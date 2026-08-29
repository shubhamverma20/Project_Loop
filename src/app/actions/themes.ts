"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay } from "date-fns"

export async function getWorkspaceThemes() {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", data: null }
  }
  const workspaceId = session.user.workspaceId

  try {
    const themes = await prisma.theme.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { feedbacks: true }
        }
      },
      orderBy: {
        feedbacks: {
          _count: 'desc'
        }
      }
    })

    return { data: themes, error: null }
  } catch (error) {
    console.error("Error fetching themes:", error)
    return { error: "Failed to fetch themes", data: null }
  }
}

export async function getThemeTrends() {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", data: null }
  }
  const workspaceId = session.user.workspaceId

  const now = new Date()
  const sevenDaysAgo = startOfDay(subDays(now, 7))
  const fourteenDaysAgo = startOfDay(subDays(now, 14))

  try {
    // Current period (last 7 days)
    const currentPeriod = await prisma.theme.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        feedbacks: {
          where: {
            feedback: { createdAt: { gte: sevenDaysAgo } }
          },
          select: { feedbackId: true }
        }
      }
    })

    // Previous period (7-14 days ago)
    const previousPeriod = await prisma.theme.findMany({
      where: { workspaceId },
      select: {
        id: true,
        feedbacks: {
          where: {
            feedback: {
              createdAt: {
                gte: fourteenDaysAgo,
                lt: sevenDaysAgo
              }
            }
          },
          select: { feedbackId: true }
        }
      }
    })

    const previousMap = new Map(previousPeriod.map(t => [t.id, t.feedbacks.length]))

    const trends = currentPeriod.map(theme => {
      const currentVolume = theme.feedbacks.length
      const previousVolume = previousMap.get(theme.id) || 0
      
      let growth = 0
      if (previousVolume === 0 && currentVolume > 0) {
        growth = 100 // 100% growth if it's new
      } else if (previousVolume > 0) {
        growth = ((currentVolume - previousVolume) / previousVolume) * 100
      }

      return {
        id: theme.id,
        name: theme.name,
        currentVolume,
        previousVolume,
        growth: Math.round(growth),
        isSpiking: growth > 20 && currentVolume >= 3 // Must have at least 3 items to be considered a spike
      }
    }).sort((a, b) => b.growth - a.growth)

    return { data: trends, error: null }
  } catch (error) {
    console.error("Error fetching theme trends:", error)
    return { error: "Failed to calculate theme trends", data: null }
  }
}
