import { prisma } from "../lib/prisma.js"
import { subDays, format, startOfDay } from "date-fns"

export type DateRange = "7d" | "30d" | "90d" | "custom"

export async function getDashboardStats(
  workspaceId: string,
  range: DateRange = "30d",
  customStart?: string,
  customEnd?: string
) {
  let startDate: Date
  let endDate = new Date()

  if (range === "custom" && customStart) {
    startDate = new Date(customStart)
    if (customEnd) endDate = new Date(customEnd)
  } else {
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    startDate = startOfDay(subDays(new Date(), daysToSubtract))
  }

  try {
    const totalFeedback = await prisma.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    const negativeFeedbackCount = await prisma.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate },
        sentiment: "NEG"
      }
    })
    
    const positiveFeedbackCount = await prisma.feedback.count({
      where: { workspaceId, createdAt: { gte: startDate, lte: endDate }, sentiment: "POS" }
    })
    const neutralFeedbackCount = await prisma.feedback.count({
      where: { workspaceId, createdAt: { gte: startDate, lte: endDate }, sentiment: "NEU" }
    })

    const percentNegative = totalFeedback > 0 
      ? Math.round((negativeFeedbackCount / totalFeedback) * 100) 
      : 0

    const newThisWeek = await prisma.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay(subDays(new Date(), 7)) }
      }
    })

    const feedbackList = await prisma.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        createdAt: true,
        sentiment: true,
        category: true,
        channel: true
      },
      orderBy: {
        createdAt: "asc"
      }
    })

    const volumeMap = new Map<string, number>()
    const categoryCount: Record<string, number> = {}
    const channelCount: Record<string, number> = {}

    feedbackList.forEach(fb => {
      const dateStr = format(new Date(fb.createdAt), "MMM dd")
      volumeMap.set(dateStr, (volumeMap.get(dateStr) || 0) + 1)
      
      const cat = fb.category || "Uncategorized"
      categoryCount[cat] = (categoryCount[cat] || 0) + 1

      const ch = fb.channel || "Unknown"
      channelCount[ch] = (channelCount[ch] || 0) + 1
    })

    const volumeData = Array.from(volumeMap.entries()).map(([date, count]) => ({
      date,
      count
    }))

    const sentimentData = [
      { name: "Positive", value: positiveFeedbackCount, fill: "#10b981" },
      { name: "Neutral", value: neutralFeedbackCount, fill: "#a1a1aa" },
      { name: "Negative", value: negativeFeedbackCount, fill: "#f43f5e" },
    ].filter(item => item.value > 0)

    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
    const channelData = Object.entries(channelCount).map(([name, value]) => ({ name, value }))

    const topThemes = await prisma.theme.findMany({
      where: {
        workspaceId,
        feedbacks: {
          some: {
            feedback: { createdAt: { gte: startDate, lte: endDate } }
          }
        }
      },
      select: {
        name: true,
        _count: {
          select: { feedbacks: true }
        }
      },
      orderBy: {
        feedbacks: { _count: 'desc' }
      },
      take: 5
    })

    const themeData = topThemes.map(t => ({
      theme: t.name,
      count: t._count.feedbacks
    }))

    return {
      error: null,
      data: {
        stats: {
          totalFeedback,
          percentNegative,
          positiveFeedbackCount,
          neutralFeedbackCount,
          negativeFeedbackCount,
          newThisWeek
        },
        charts: {
          volumeData,
          sentimentData,
          themeData,
          categoryData,
          channelData
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch analytics:", error)
    return { error: "Failed to load dashboard statistics", data: null }
  }
}
