import { prisma } from "../lib/prisma.js"
import { classifyFeedback } from "../lib/ai.js"
import { generateEmbedding } from "../lib/embeddings.js"
import { feedbackEvents } from "../lib/events.js"
import sanitizeHtml from "sanitize-html"

export interface IngestFeedbackParams {
  content: string
  channel?: string
  customerLabel?: string | null
  sourceRef?: string | null
  workspaceId: string
}

export function sanitizeText(text: string): string {
  if (!text) return ""
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim()
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, " ")
}

export async function processSingleFeedback(params: IngestFeedbackParams) {
  const { workspaceId, channel = "API", customerLabel = null, sourceRef = null } = params
  const sanitizedContent = sanitizeText(params.content)

  if (!sanitizedContent) {
    throw new Error("Feedback content is empty after sanitization")
  }

  const normalizedContent = normalizeText(sanitizedContent)

  const existingFeedback = await prisma.feedback.findFirst({
    where: { workspaceId, normalizedContent }
  })

  if (existingFeedback) {
    return { duplicate: true as const, feedback: existingFeedback }
  }

  const existingThemes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { name: true }
  })
  const themeNames = existingThemes.map(t => t.name)

  const aiResult = await classifyFeedback(sanitizedContent, themeNames)
  const embeddingVector = await generateEmbedding(normalizedContent)

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.feedback.create({
      data: {
        content: sanitizedContent,
        normalizedContent,
        channel: channel || "API",
        customerLabel: customerLabel || null,
        sourceRef: sourceRef || null,
        category: aiResult.category,
        sentiment: aiResult.sentiment,
        sentimentScore: aiResult.sentimentScore,
        featureArea: aiResult.featureArea,
        workspaceId,
      }
    })

    const vectorStr = JSON.stringify(embeddingVector)
    await tx.$executeRaw`
      INSERT INTO "Embedding" (id, "feedbackId", vector)
      VALUES (gen_random_uuid()::text, ${created.id}, ${vectorStr}::vector)
    `

    for (const themeName of aiResult.themes) {
      let theme = await tx.theme.findFirst({
        where: {
          name: { equals: themeName, mode: "insensitive" },
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
          feedbackId: created.id,
          themeId: theme.id,
          confidence: 0.9
        }
      })
    }

    return created
  }, { timeout: 15000, maxWait: 10000 })

  feedbackEvents.emitNewFeedback({
    workspaceId,
    feedback: {
      id: feedback.id,
      content: feedback.content,
      channel: feedback.channel,
      category: feedback.category,
      sentiment: feedback.sentiment,
      createdAt: feedback.createdAt
    }
  })

  return { duplicate: false as const, feedback }
}

export async function simulateChannelSync(channelName: string, workspaceId: string) {
  const channelData: Record<string, Array<{ content: string; customerLabel: string }>> = {
    Zendesk: [
      { content: "Customer cannot update billing info on checkout page", customerLabel: "Ticket #4091" },
      { content: "App performance degradation reported during peak hours", customerLabel: "Ticket #4092" }
    ],
    Intercom: [
      { content: "Live chat query: How to configure vector embeddings search?", customerLabel: "Intercom User" },
      { content: "Is dark mode support planned for mobile WebApp?", customerLabel: "Intercom Lead" }
    ],
    "Play Store": [
      { content: "Great Android app! Push notifications are very responsive.", customerLabel: "PlayStore Reviewer" },
      { content: "App crash occurs when switching tabs quickly on Android 14.", customerLabel: "PlayStore User" }
    ]
  }

  const items = channelData[channelName] || [
    { content: `Sample synced feedback item for ${channelName}`, customerLabel: `${channelName} User` }
  ]

  let syncedCount = 0
  for (const item of items) {
    await processSingleFeedback({
      content: item.content,
      channel: channelName,
      customerLabel: item.customerLabel,
      workspaceId
    })
    syncedCount++
  }

  return {
    success: true,
    message: `Successfully synced & classified ${syncedCount} new item(s) from ${channelName} into PostgreSQL.`,
    count: syncedCount
  }
}
