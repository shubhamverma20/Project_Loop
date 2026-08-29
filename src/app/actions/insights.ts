"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"
import Anthropic from "@anthropic-ai/sdk"
import { DateRange } from "./analytics"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

import { InsightReportSchema, InsightReport } from "@/types/insights"

export async function generateInsightsReport(range: DateRange = "30d", customStart?: string, customEnd?: string) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", data: null }
  }

  const workspaceId = session.user.workspaceId

  let startDate: Date;
  let endDate = new Date();

  if (range === "custom" && customStart) {
    startDate = startOfDay(new Date(customStart))
    if (customEnd) endDate = endOfDay(new Date(customEnd))
  } else {
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    startDate = startOfDay(subDays(new Date(), daysToSubtract))
  }

  try {
    // Check Cache: See if we already generated a report for this exact date range today.
    const existingReport = await prisma.report.findFirst({
      where: {
        workspaceId,
        periodStart: startDate,
        periodEnd: endDate,
        createdAt: { gte: startOfDay(new Date()) } // Generated today
      }
    })

    if (existingReport) {
      return { 
        error: null, 
        data: {
          id: existingReport.id,
          report: existingReport.contentJson as unknown as InsightReport
        }
      }
    }

    // No cache, fetch raw feedback
    const feedbackList = await prisma.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        content: true,
        sentiment: true,
        category: true
      },
      // Limit to 500 to avoid context limits, sorting by most recent
      orderBy: { createdAt: "desc" },
      take: 500 
    })

    if (feedbackList.length === 0) {
      return { error: "No feedback found in this date range to analyze.", data: null }
    }

    // Construct prompt
    const feedbackText = feedbackList
      .map(fb => `[Sentiment: ${fb.sentiment || "UNKNOWN"}, Category: ${fb.category || "UNKNOWN"}] ${fb.content}`)
      .join("\n")

    const systemPrompt = `You are a Senior Product Analyst. Analyze the following customer feedback dataset and generate a structured insights report.
Focus on identifying real trends, customer pain points, risks, and actionable recommendations.
Provide your response strictly as valid JSON matching the following schema:
{
  "summary": "High-level summary paragraph",
  "keyThemes": ["theme 1", "theme 2"],
  "painPoints": ["point 1"],
  "positiveTrends": ["trend 1"],
  "negativeTrends": ["trend 1"],
  "featureRequests": ["req 1"],
  "risks": ["risk 1"],
  "recommendedActions": ["action 1"]
}
Return ONLY the JSON.`

    // Await Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: "user", content: feedbackText }
      ]
    })

    const responseContent = response.content[0]
    if (responseContent.type !== 'text') {
      throw new Error("Invalid response type from AI")
    }

    // Parse and validate
    let parsedJson;
    try {
      parsedJson = JSON.parse(responseContent.text)
    } catch {
      throw new Error("AI returned invalid JSON")
    }

    const validatedData = InsightReportSchema.parse(parsedJson)
    
    // Attach metrics from DB
    const totalFeedback = feedbackList.length
    const positive = feedbackList.filter(f => f.sentiment === "POS").length
    const neutral = feedbackList.filter(f => f.sentiment === "NEU").length
    const negative = feedbackList.filter(f => f.sentiment === "NEG").length
    validatedData.metrics = { totalFeedback, positive, neutral, negative }

    // Save to PostgreSQL
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

  } catch (error) {
    console.error("Failed to generate insights:", error)
    return { error: "Failed to generate AI insights", data: null }
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
