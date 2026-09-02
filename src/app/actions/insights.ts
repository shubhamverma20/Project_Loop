"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { GoogleGenAI, Type } from "@google/genai"
import { DateRange } from "./analytics"
import { InsightReportSchema, InsightReport } from "@/types/insights"

export async function generateInsightsReport(range: DateRange = "30d", customStart?: string, customEnd?: string) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized: Workspace session missing", data: null }
  }

  const workspaceId = session.user.workspaceId

  let startDate: Date;
  let endDate: Date;

  if (range === "custom" && customStart) {
    startDate = startOfDay(new Date(customStart))
    endDate = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(new Date())
  } else {
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    startDate = startOfDay(subDays(new Date(), daysToSubtract))
    endDate = endOfDay(new Date())
  }

  try {
    // 1. Intelligent Cache Lookup: Check for existing report generated today
    const existingReport = await prisma.report.findFirst({
      where: {
        workspaceId,
        periodStart: startDate,
        periodEnd: endDate,
        createdAt: { gte: startOfDay(new Date()) }
      },
      orderBy: { createdAt: "desc" }
    })

    // Check if new feedback was created since the cached report was generated
    const latestFeedback = await prisma.feedback.findFirst({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    })

    if (existingReport) {
      // If no new feedback has been added since existingReport was created, return cached report instantly (<5ms)
      if (!latestFeedback || latestFeedback.createdAt <= existingReport.createdAt) {
        return { 
          error: null, 
          data: {
            id: existingReport.id,
            report: existingReport.contentJson as unknown as InsightReport
          }
        }
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return { error: "GEMINI_API_KEY environment variable is missing", data: null }
    }

    // 2. Selectively Query Database Feedback (only required fields, indexed by workspaceId + createdAt)
    const feedbackList = await prisma.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        content: true,
        sentiment: true,
        category: true,
        normalizedContent: true
      },
      orderBy: { createdAt: "desc" },
      take: 200
    })

    if (feedbackList.length === 0) {
      return { error: "No feedback available for this date range. Sync or upload feedback first.", data: null }
    }

    // 3. De-duplicate & Sample Feedback to prevent prompt token bloat & duplicate AI requests
    const uniqueFeedbackSet = new Set<string>()
    const sampledFeedback: Array<{ content: string; sentiment: string; category: string }> = []

    for (const fb of feedbackList) {
      const normKey = (fb.normalizedContent || fb.content).toLowerCase().trim()
      if (!uniqueFeedbackSet.has(normKey)) {
        uniqueFeedbackSet.add(normKey)
        // Truncate long content strings to ~250 chars max for optimal LLM response time
        const trimmedContent = fb.content.length > 250 ? `${fb.content.slice(0, 250)}...` : fb.content
        sampledFeedback.push({
          content: trimmedContent,
          sentiment: fb.sentiment || "UNKNOWN",
          category: fb.category || "General"
        })
      }
      if (sampledFeedback.length >= 60) break // Cap prompt context at top 60 unique items
    }

    // Server-side Aggregations for Sentiment & Category Analysis
    const totalFeedback = feedbackList.length
    const positive = feedbackList.filter(f => f.sentiment === "POS").length
    const neutral = feedbackList.filter(f => f.sentiment === "NEU").length
    const negative = feedbackList.filter(f => f.sentiment === "NEG").length

    const categoryCounts: Record<string, number> = {}
    feedbackList.forEach(fb => {
      const cat = fb.category || "General"
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })

    const categoryAnalysis = Object.entries(categoryCounts).map(([cat, count]) => ({
      category: cat,
      count,
      percentage: Math.round((count / totalFeedback) * 100)
    }))

    // 4. Construct AI prompt
    const feedbackPromptText = sampledFeedback
      .map(fb => `[Sentiment: ${fb.sentiment}, Category: ${fb.category}] ${fb.content}`)
      .join("\n")

    const systemPrompt = `You are a Senior Product Analyst. Analyze the following customer feedback dataset and generate a structured insights report.
Focus on identifying real trends, customer pain points, priority impact items, and actionable recommendations.
Provide your response strictly as valid JSON matching the schema.`

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        positiveTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
        negativeTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
        featureRequests: { type: Type.ARRAY, items: { type: Type.STRING } },
        risks: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
        priorityImpact: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              recommendation: { type: Type.STRING }
            },
            required: ["issue", "impact", "recommendation"]
          }
        }
      },
      required: ["summary", "keyThemes", "painPoints", "positiveTrends", "negativeTrends", "featureRequests", "risks", "recommendedActions"]
    }

    // 5. Initialize AI Client & call with 25-second Abort/Timeout Protection
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    
    let responseContent = ""
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: feedbackPromptText,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI service request timed out after 25 seconds")), 25000)
        )
      ])

      responseContent = response.text || ""
    } catch (aiErr: unknown) {
      const errObj = aiErr as { message?: string; status?: number }
      const errMessage = errObj?.message || String(aiErr)
      console.error("Gemini AI Report Error:", errMessage)

      if (errObj?.status === 429 || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
        return { error: "Gemini AI rate limit reached (quota exceeded). Please try again in a few moments.", data: null }
      }

      return { error: `AI Insights Error: ${errMessage}`, data: null }
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(responseContent)
    } catch {
      return { error: "AI service returned malformed JSON output", data: null }
    }

    // 6. Validate AI response structure with Zod
    const validatedData = InsightReportSchema.parse(parsedJson)
    
    // Attach calculated category & sentiment metrics from DB
    validatedData.categoryAnalysis = categoryAnalysis
    validatedData.metrics = { totalFeedback, positive, neutral, negative }

    // 7. Save report to Neon PostgreSQL Database
    const title = `Insights: ${range === "custom" ? "Custom Range" : `Last ${range}`}`
    const savedReport = await prisma.report.create({
      data: {
        title,
        periodStart: startDate,
        periodEnd: endDate,
        contentJson: validatedData,
        workspaceId,
        generatedById: session.user.id
      }
    })

    return { 
      error: null, 
      data: {
        id: savedReport.id,
        report: validatedData
      }
    }

  } catch (error: unknown) {
    console.error("Failed to generate insights:", error)
    const errMsg = (error as { message?: string })?.message || "Failed to generate AI insights"
    return { error: errMsg, data: null }
  }
}

export async function getReports() {
  const session = await verifySession()
  if (!session?.user?.workspaceId) return { error: "Unauthorized", data: null }

  try {
    const reports = await prisma.report.findMany({
      where: { workspaceId: session.user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20
    })
    return { error: null, data: reports }
  } catch {
    return { error: "Failed to fetch reports", data: null }
  }
}
