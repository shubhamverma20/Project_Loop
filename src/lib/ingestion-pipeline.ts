import { prisma } from "@/lib/prisma"
import { classifyFeedback } from "@/lib/ai"
import { generateEmbedding } from "@/lib/embeddings"
import { revalidatePath } from "next/cache"
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

  // Item 10: Check if duplicate feedback exists in workspace
  const existingFeedback = await prisma.feedback.findFirst({
    where: { workspaceId, normalizedContent }
  })

  if (existingFeedback) {
    return { duplicate: true as const, feedback: existingFeedback }
  }

  // Fetch workspace themes for classification context
  const existingThemes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { name: true }
  })
  const themeNames = existingThemes.map(t => t.name)

  // Execute AI tasks sequentially to prevent CPU-bound embedding pipeline from starving AI network timeouts
  const aiResult = await classifyFeedback(sanitizedContent, themeNames)
  const embeddingVector = await generateEmbedding(normalizedContent)

  // Execute database transaction with 15s timeout for Neon pooler
  const feedback = await prisma.$transaction(async (tx) => {
    // 1. Create Feedback Record
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

    // 2. Insert Vector Embedding using raw SQL for pgvector Unsupported type
    const vectorStr = JSON.stringify(embeddingVector)
    await tx.$executeRaw`
      INSERT INTO "Embedding" (id, "feedbackId", vector)
      VALUES (gen_random_uuid()::text, ${created.id}, ${vectorStr}::vector)
    `

    // 3. Upsert Themes & Link via FeedbackTheme
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

  // Trigger Next.js revalidation for real-time dashboard updates (safely handles standalone CLI execution)
  try {
    revalidatePath("/dashboard")
    revalidatePath("/feedback")
    revalidatePath("/themes")
    revalidatePath("/insights")
  } catch {
    // Ignored when executed outside Next.js request context (e.g. CLI scripts)
  }

  return { duplicate: false as const, feedback }
}
