import { prisma } from "../lib/prisma.js"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { GoogleGenAI, Type } from "@google/genai"
import { DateRange } from "./analytics.js"

export interface InsightReport {
  metrics: {
    totalFeedback: number
    positive: number
    neutral: number
    negative: number
    priorTotalFeedback: number
    sentimentShiftPercentage: number
  }
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
  notableCustomerQuotes: string[]
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

    const rawApiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
    if (!rawApiKey || rawApiKey.startsWith("your_")) {
      return { error: "Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env.", data: null }
    }

    // 1. CALCULATE REAL STATISTICS IN APPLICATION CODE
    const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const prevStartDate = subDays(startDate, periodDays)

    const [currentFeedbackList, priorTotalFeedback, priorNegativeCount] = await Promise.all([
      prisma.feedback.findMany({
        where: { workspaceId, createdAt: { gte: startDate, lte: endDate } },
        select: { id: true, content: true, sentiment: true, category: true, normalizedContent: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.feedback.count({
        where: { workspaceId, createdAt: { gte: prevStartDate, lt: startDate } }
      }),
      prisma.feedback.count({
        where: { workspaceId, createdAt: { gte: prevStartDate, lt: startDate }, sentiment: "NEG" }
      })
    ])

    if (currentFeedbackList.length === 0) {
      return { error: "No feedback available for this date range. Submit, upload, or sync feedback first.", data: null }
    }

    const totalFeedback = currentFeedbackList.length
    let positiveCount = 0
    let neutralCount = 0
    let negativeCount = 0

    const notableQuotes: string[] = []

    currentFeedbackList.forEach(fb => {
      if (fb.sentiment === "POS") positiveCount++
      else if (fb.sentiment === "NEG") negativeCount++
      else neutralCount++

      if (notableQuotes.length < 5 && fb.content.length > 20) {
        notableQuotes.push(fb.content)
      }
    })

    const currNegPct = totalFeedback > 0 ? (negativeCount / totalFeedback) * 100 : 0
    const prevNegPct = priorTotalFeedback > 0 ? (priorNegativeCount / priorTotalFeedback) * 100 : 0
    const sentimentShiftPercentage = Math.round((currNegPct - prevNegPct) * 10) / 10

    const calculatedStats = {
      totalFeedback,
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount,
      priorTotalFeedback,
      sentimentShiftPercentage
    }

    // 2. PREPARE GROUNDED CONTEXT FOR GEMINI NARRATIVE GENERATION
    const uniqueFeedbackSet = new Set<string>()
    const sampledFeedback: Array<{ content: string; sentiment: string; category: string }> = []

    for (const fb of currentFeedbackList) {
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

    const ai = new GoogleGenAI({ apiKey: rawApiKey })

    const systemPrompt = `You are an elite Chief Product Officer and Voice-of-Customer (VoC) Intelligence AI Analyst.
Synthesize the provided CALCULATED REAL STATISTICS and customer feedback samples to compose a Voice-of-Customer Executive Report.
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
        notableCustomerQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },
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
      required: ["executiveSummary", "keyTrends", "topCustomerPains", "notableCustomerQuotes", "recommendedActions", "sentimentAnalysis"]
    }

    const promptContext = `
CALCULATED REAL APPLICATION STATS:
${JSON.stringify(calculatedStats, null, 2)}

REPRESENTATIVE CUSTOMER QUOTES:
${JSON.stringify(notableQuotes, null, 2)}

FEEDBACK SAMPLES (${sampledFeedback.length} items):
${JSON.stringify(sampledFeedback, null, 2)}
`

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.6-flash"
    const fallbackModel = "gemini-3.5-flash"
    const modelsToTry = [primaryModel, fallbackModel, "gemini-3.5-flash-lite"]

    let response: any = null
    let lastError: unknown = null

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: promptContext,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        })
        if (response?.text) break
      } catch (err: any) {
        lastError = err
        const msg = String(err?.message || err || "")
        if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("401") || msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("invalid")) {
          return { error: "Gemini API Authentication Failed: Invalid or unauthorized API key. Please generate a valid key starting with 'AIzaSy...' from https://aistudio.google.com and set GEMINI_API_KEY in backend/.env.", data: null }
        }
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
          return { error: "Gemini API Rate Limit / Quota Exceeded. Please try again later.", data: null }
        }
      }
    }

    if (!response || !response.text) {
      const errMessage = lastError instanceof Error ? lastError.message : String(lastError)
      return { error: `Gemini AI Report Generation Failed: ${errMessage}`, data: null }
    }

    let textToParse = (response.text || "").trim()
    if (textToParse.startsWith("```json")) {
      textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
    } else if (textToParse.startsWith("```")) {
      textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
    }

    const parsedNarrative = JSON.parse(textToParse)

    const reportData: InsightReport = {
      metrics: calculatedStats,
      executiveSummary: parsedNarrative.executiveSummary || "Voice-of-Customer report generated.",
      keyTrends: parsedNarrative.keyTrends || [],
      topCustomerPains: parsedNarrative.topCustomerPains || [],
      notableCustomerQuotes: parsedNarrative.notableCustomerQuotes || notableQuotes,
      recommendedActions: parsedNarrative.recommendedActions || [],
      sentimentAnalysis: parsedNarrative.sentimentAnalysis || { overallMood: "Neutral", positiveDrivers: [], negativeDrivers: [] }
    }

    const savedReport = await prisma.report.create({
      data: {
        title: `Voice of Customer (VoC) Report (${range})`,
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
    console.error("Generate VoC Report Error:", err)
    const errMessage = err instanceof Error ? err.message : String(err)
    if (errMessage.includes("API key") || errMessage.includes("401") || errMessage.includes("403") || errMessage.includes("UNAUTHENTICATED")) {
      return { error: "Gemini API Authentication Failed: Invalid or unauthorized API key. Please generate a valid key starting with 'AIzaSy...' from https://aistudio.google.com and set GEMINI_API_KEY in backend/.env.", data: null }
    }
    if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
      return { error: "Gemini API Rate Limit / Quota Exceeded. Please try again later.", data: null }
    }
    return { error: errMessage || "Failed to generate Voice of Customer report", data: null }
  }
}
