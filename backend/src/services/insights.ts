import { prisma } from "../lib/prisma.js"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { GoogleGenAI, Type } from "@google/genai"
import { DateRange } from "./analytics.js"

export interface InsightReport {
  executiveSummary: string
  keyTrends: Array<{
    title: string
    description: string
    impact: "HIGH" | "MEDIUM" | "LOW"
  }>
  topCustomerPains: Array<{
    issue: string
    frequency: number
    suggestedAction: string
  }>
  recommendedActions: Array<{
    action: string
    priority: "HIGH" | "MEDIUM" | "LOW"
    rationale: string
  }>
  sentimentAnalysis: {
    overallMood: string
    positiveDrivers: string[]
    negativeDrivers: string[]
  }
}

export async function generateInsightsReport(
  workspaceId: string,
  range: DateRange = "30d",
  customStart?: string,
  customEnd?: string
) {
  let startDate: Date
  let endDate: Date

  if (range === "custom" && customStart) {
    startDate = startOfDay(new Date(customStart))
    endDate = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(new Date())
  } else {
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    startDate = startOfDay(subDays(new Date(), daysToSubtract))
    endDate = endOfDay(new Date())
  }

  try {
    const existingReport = await prisma.report.findFirst({
      where: {
        workspaceId,
        periodStart: startDate,
        periodEnd: endDate,
        createdAt: { gte: startOfDay(new Date()) }
      },
      orderBy: { createdAt: "desc" }
    })

    const latestFeedback = await prisma.feedback.findFirst({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    })

    if (existingReport) {
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
      return { error: "Gemini API key is not configured.", data: null }
    }

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
      return { error: "No feedback available for this date range. Submit, upload, or sync feedback first.", data: null }
    }

    const uniqueFeedbackSet = new Set<string>()
    const sampledFeedback: Array<{ content: string; sentiment: string; category: string }> = []

    for (const fb of feedbackList) {
      const normKey = (fb.normalizedContent || fb.content).toLowerCase().trim()
      if (!uniqueFeedbackSet.has(normKey)) {
        uniqueFeedbackSet.add(normKey)
        const trimmedContent = fb.content.length > 250 ? `${fb.content.slice(0, 250)}...` : fb.content
        sampledFeedback.push({
          content: trimmedContent,
          sentiment: fb.sentiment || "NEU",
          category: fb.category || "General"
        })
        if (sampledFeedback.length >= 60) break
      }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const systemPrompt = `You are an elite Chief Product Officer and AI Data Analyst.
Analyze customer feedback items for a SaaS product and generate an executive report.
Return a raw JSON object ONLY with no markdown wrappers.`

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING },
        keyTrends: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
            },
            required: ["title", "description", "impact"]
          }
        },
        topCustomerPains: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue: { type: Type.STRING },
              frequency: { type: Type.NUMBER },
              suggestedAction: { type: Type.STRING }
            },
            required: ["issue", "frequency", "suggestedAction"]
          }
        },
        recommendedActions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              rationale: { type: Type.STRING }
            },
            required: ["action", "priority", "rationale"]
          }
        },
        sentimentAnalysis: {
          type: Type.OBJECT,
          properties: {
            overallMood: { type: Type.STRING },
            positiveDrivers: { type: Type.ARRAY, items: { type: Type.STRING } },
            negativeDrivers: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["overallMood", "positiveDrivers", "negativeDrivers"]
        }
      },
      required: ["executiveSummary", "keyTrends", "topCustomerPains", "recommendedActions", "sentimentAnalysis"]
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Feedback Sample Data (${sampledFeedback.length} items):\n${JSON.stringify(sampledFeedback, null, 2)}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    })

    let textToParse = (response.text || "").trim()
    if (textToParse.startsWith("```json")) {
      textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
    } else if (textToParse.startsWith("```")) {
      textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
    }

    const reportData: InsightReport = JSON.parse(textToParse)

    const savedReport = await prisma.report.create({
      data: {
        title: `AI Insights Report (${range})`,
        periodStart: startDate,
        periodEnd: endDate,
        contentJson: reportData as any,
        workspaceId
      }
    })

    return {
      error: null,
      data: {
        id: savedReport.id,
        report: reportData
      }
    }
  } catch (err: unknown) {
    console.error("Generate Insights Report Error:", err)
    const errMessage = err instanceof Error ? err.message : String(err)
    if (errMessage.includes("API key") || errMessage.includes("401") || errMessage.includes("403") || errMessage.includes("UNAUTHENTICATED")) {
      return { error: "Gemini API Authentication Failed: Invalid or unauthorized API key", data: null }
    }
    if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
      return { error: "Gemini API Rate Limit / Quota Exceeded. Please try again later.", data: null }
    }
    return { error: errMessage || "Failed to generate AI insights report", data: null }
  }
}
