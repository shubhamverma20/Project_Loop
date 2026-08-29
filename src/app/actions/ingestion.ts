"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { classifyFeedback } from "@/lib/ai"
import { generateEmbedding } from "@/lib/embeddings"

const feedbackRowSchema = z.object({
  content: z.string().min(1, "Content is required"),
  channel: z.string().min(1, "Channel is required"),
  customerLabel: z.string().optional().nullable(),
})

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
}

export async function bulkImportFeedback(parsedData: unknown[]) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized: Workspace ID missing", success: false, summary: null }
  }
  const workspaceId = session.user.workspaceId

  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    return { error: "No data provided", success: false, summary: null }
  }

  try {
    let successCount = 0
    let failCount = 0

    // Fetch existing themes for context
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId },
      select: { name: true }
    })
    const themeNames = existingThemes.map(t => t.name)

    for (const row of parsedData) {
      const parsed = feedbackRowSchema.safeParse(row)
      if (parsed.success) {
        const content = parsed.data.content
        const normalizedContent = normalizeText(content)
        
        // Parallel AI tasks: Classification & Embedding
        const [aiResult, embeddingVector] = await Promise.all([
          classifyFeedback(content, themeNames),
          generateEmbedding(normalizedContent)
        ])
        
        await prisma.$transaction(async (tx) => {
          // 1. Create Feedback
          const feedback = await tx.feedback.create({
            data: {
              content,
              normalizedContent,
              channel: parsed.data.channel,
              customerLabel: parsed.data.customerLabel || null,
              category: aiResult.category,
              sentiment: aiResult.sentiment,
              sentimentScore: aiResult.sentimentScore,
              featureArea: aiResult.featureArea,
              workspaceId: workspaceId,
            }
          })

          // 2. Store Embedding using raw SQL for pgvector Unsupported type
          const vectorStr = JSON.stringify(embeddingVector)
          await tx.$executeRaw`
            INSERT INTO "Embedding" (id, "feedbackId", vector)
            VALUES (gen_random_uuid()::text, ${feedback.id}, ${vectorStr}::vector)
          `

          // 3. Upsert Themes and Link
          for (const themeName of aiResult.themes) {
            // Find or create theme
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
              themeNames.push(themeName) // Add to context for subsequent iterations
            }

            // Link via FeedbackTheme
            await tx.feedbackTheme.create({
              data: {
                feedbackId: feedback.id,
                themeId: theme.id,
                confidence: 0.9 // Placeholder since Claude doesn't give per-theme confidence yet
              }
            })
          }
        })
        
        successCount++
      } else {
        failCount++
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/feedback")
    revalidatePath("/themes")
    
    return { 
      success: true, 
      error: null,
      summary: { success: successCount, failed: failCount } 
    }
  } catch (error: unknown) {
    console.error("Bulk import error:", error)
    return { error: "Failed to process imported data", success: false, summary: null }
  }
}

export async function simulateChannelSync(channelName: string) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", success: false }
  }
  const workspaceId = session.user.workspaceId

  const count = Math.floor(Math.random() * 3) + 2 // 2 to 4 items

  const sampleContents = [
    "The new dashboard is incredibly fast!",
    "I can't figure out how to export my reports.",
    "Great customer service, very helpful.",
    "The application keeps crashing when I upload large files.",
    "Love the new dark mode feature.",
    "Can we get an integration with Slack?",
    "Pricing is a bit too high for small teams.",
    "The mobile app is very buggy.",
  ]

  try {
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId },
      select: { name: true }
    })
    const themeNames = existingThemes.map(t => t.name)

    for (let i = 0; i < count; i++) {
      const content = sampleContents[Math.floor(Math.random() * sampleContents.length)]
      const normalizedContent = normalizeText(content)
      
      const [aiResult, embeddingVector] = await Promise.all([
        classifyFeedback(content, themeNames),
        generateEmbedding(normalizedContent)
      ])

      await prisma.$transaction(async (tx) => {
        const feedback = await tx.feedback.create({
          data: {
            content,
            normalizedContent,
            channel: channelName,
            customerLabel: `User-${Math.floor(Math.random() * 1000)}`,
            category: aiResult.category,
            sentiment: aiResult.sentiment,
            sentimentScore: aiResult.sentimentScore,
            featureArea: aiResult.featureArea,
            workspaceId: workspaceId,
          }
        })

        const vectorStr = JSON.stringify(embeddingVector)
        await tx.$executeRaw`
          INSERT INTO "Embedding" (id, "feedbackId", vector)
          VALUES (gen_random_uuid()::text, ${feedback.id}, ${vectorStr}::vector)
        `

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
            themeNames.push(themeName)
          }

          await tx.feedbackTheme.create({
            data: {
              feedbackId: feedback.id,
              themeId: theme.id,
              confidence: 0.9
            }
          })
        }
      })
    }
    
    revalidatePath("/dashboard")
    revalidatePath("/feedback")
    revalidatePath("/themes")
    
    return { success: true, message: `Successfully synced & auto-classified ${count} items from ${channelName}`, count }
  } catch (error: unknown) {
    console.error("Simulation error:", error)
    return { error: "Failed to sync channel", success: false }
  }
}
