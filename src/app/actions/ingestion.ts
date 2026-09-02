"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { processSingleFeedback, normalizeText } from "@/lib/ingestion-pipeline"

const feedbackRowSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000, "Content too long"),
  channel: z.string().trim().optional().default("CSV"),
  customerLabel: z.string().trim().optional().nullable(),
  sourceRef: z.string().trim().optional().nullable(),
})

const productRowSchema = z.object({
  productName: z.string().trim().min(1, "Product name is required"),
  price: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  stock: z.string().trim().optional().nullable()
})

const FEEDBACK_SYNONYMS = [
  "content", "feedback", "message", "comment", "review", "text", "description",
  "customer_feedback", "customer_comment", "customer_review", "user_feedback",
  "user_comment", "user_review", "feedback_text", "review_text", "comments",
  "reviews", "messages", "feedbacks", "details", "notes", "body", "issue", "opinion"
]
const CHANNEL_SYNONYMS = ["channel", "source", "origin", "platform", "medium", "provider"]
const CUSTOMER_SYNONYMS = ["customerlabel", "customer_label", "customer", "user", "label"]
const REF_SYNONYMS = ["sourceref", "source_ref", "ref", "ticket_id", "id"]

const PRODUCT_SYNONYMS = ["product", "title", "item", "name", "product_name", "productname", "item_name"]
const PRICE_SYNONYMS = ["price", "cost", "amount", "unit_price", "unitprice"]
const CATEGORY_SYNONYMS = ["category", "department", "group", "type"]
const STOCK_SYNONYMS = ["stock", "quantity", "qty", "inventory"]

export type IngestionResult =
  | { success: true; duplicate?: boolean; message: string; feedback: { id: string; category: string | null; sentiment: string | null; channel: string } }
  | { success: false; error: string }

export async function ingestSingleFeedback(payload: { content: string; channel?: string; customerLabel?: string }): Promise<IngestionResult> {
  const session = await verifySession()
  if (!session?.user?.workspaceId) {
    return { success: false, error: "Unauthorized: Session missing" }
  }

  if (!payload.content || !payload.content.trim()) {
    return { success: false, error: "Content is required" }
  }

  try {
    const result = await processSingleFeedback({
      content: payload.content,
      channel: payload.channel || "Test Ingestion",
      customerLabel: payload.customerLabel || "Test User",
      workspaceId: session.user.workspaceId
    })

    if ("duplicate" in result && result.duplicate) {
      return {
        success: true,
        duplicate: true,
        message: "Duplicate feedback detected. Existing item returned.",
        feedback: {
          id: result.feedback.id,
          category: result.feedback.category,
          sentiment: result.feedback.sentiment,
          channel: result.feedback.channel
        }
      }
    }

    const feedback = "feedback" in result ? result.feedback : result

    return {
      success: true,
      duplicate: false,
      message: "Feedback submitted and processed successfully!",
      feedback: {
        id: feedback.id,
        category: feedback.category,
        sentiment: feedback.sentiment,
        channel: feedback.channel
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process feedback"
    return { success: false, error: errorMsg }
  }
}

export async function bulkImportFeedback(parsedData: unknown[], datasetType?: "CUSTOMER_FEEDBACK" | "ECOMMERCE_PRODUCT") {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized: Workspace ID missing", success: false, summary: null }
  }
  const workspaceId = session.user.workspaceId

  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    return { error: "No data provided in CSV file", success: false, summary: null }
  }

  try {
    let successCount = 0
    let failCount = 0
    let skippedCount = 0
    let rowIdx = 0

    // Fetch existing feedback contents to detect duplicates
    const existingFeedbacks = (await prisma.feedback.findMany({
      where: { workspaceId },
      select: { normalizedContent: true }
    })) || []
    const existingSet = new Set(
      existingFeedbacks
        .map(f => f.normalizedContent)
        .filter((c): c is string => Boolean(c))
    )

    for (const row of parsedData) {
      rowIdx++
      if (!row || typeof row !== "object") {
        failCount++
        continue
      }

      // Normalize row keys (trim spaces, lowercase, underscores)
      const normalizedRow: Record<string, string> = {}
      for (const [key, val] of Object.entries(row as Record<string, unknown>)) {
        if (key && typeof val === "string") {
          const normKey = key.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, "_")
          normalizedRow[normKey] = val.trim()
        } else if (key && val !== null && val !== undefined) {
          const normKey = key.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, "_")
          normalizedRow[normKey] = String(val).trim()
        }
      }

      // Check if product row
      const isProductRow = datasetType === "ECOMMERCE_PRODUCT" || 
        (!datasetType && PRODUCT_SYNONYMS.some(syn => normalizedRow[syn]) && (PRICE_SYNONYMS.some(syn => normalizedRow[syn]) || STOCK_SYNONYMS.some(syn => normalizedRow[syn])))

      if (isProductRow) {
        let productName = ""
        for (const syn of PRODUCT_SYNONYMS) {
          if (normalizedRow[syn]) { productName = normalizedRow[syn]; break }
        }
        let price = ""
        for (const syn of PRICE_SYNONYMS) {
          if (normalizedRow[syn]) { price = normalizedRow[syn]; break }
        }
        let category = ""
        for (const syn of CATEGORY_SYNONYMS) {
          if (normalizedRow[syn]) { category = normalizedRow[syn]; break }
        }
        let stock = ""
        for (const syn of STOCK_SYNONYMS) {
          if (normalizedRow[syn]) { stock = normalizedRow[syn]; break }
        }

        const parsedProd = productRowSchema.safeParse({ productName, price, category, stock })
        if (parsedProd.success) {
          const formattedContent = `Product: ${productName}${category ? ` | Category: ${category}` : ''}${price ? ` | Price: $${price}` : ''}${stock ? ` | Stock: ${stock}` : ''}`
          const normalized = normalizeText(formattedContent)

          if (existingSet.has(normalized)) {
            skippedCount++
            continue
          }

          try {
            await processSingleFeedback({
              content: formattedContent,
              channel: "E-commerce Product",
              customerLabel: "Catalog Item",
              sourceRef: `prod-${rowIdx}`,
              workspaceId
            })
            existingSet.add(normalized)
            successCount++
          } catch (err) {
            console.error("Product row import failed:", err)
            failCount++
          }
        } else {
          failCount++
        }
      } else {
        // Customer Feedback row - Pass 1: exact synonym key lookup
        let contentVal = ""
        for (const syn of FEEDBACK_SYNONYMS) {
          if (normalizedRow[syn]) {
            contentVal = normalizedRow[syn]
            break
          }
        }

        // Pass 2: substring keyword lookup if exact synonym didn't find anything
        if (!contentVal) {
          for (const [k, v] of Object.entries(normalizedRow)) {
            if (v && FEEDBACK_SYNONYMS.some(syn => k.includes(syn))) {
              contentVal = v
              break
            }
          }
        }

        let channelVal = "CSV"
        for (const syn of CHANNEL_SYNONYMS) {
          if (normalizedRow[syn]) { channelVal = normalizedRow[syn]; break }
        }
        let customerLabelVal: string | null = null
        for (const syn of CUSTOMER_SYNONYMS) {
          if (normalizedRow[syn]) { customerLabelVal = normalizedRow[syn]; break }
        }
        let sourceRefVal: string | null = null
        for (const syn of REF_SYNONYMS) {
          if (normalizedRow[syn]) { sourceRefVal = normalizedRow[syn]; break }
        }

        const parsedFb = feedbackRowSchema.safeParse({
          content: contentVal,
          channel: channelVal || "CSV",
          customerLabel: customerLabelVal,
          sourceRef: sourceRefVal
        })

        if (parsedFb.success) {
          const { content, channel, customerLabel, sourceRef } = parsedFb.data
          const normalized = normalizeText(content)

          if (existingSet.has(normalized)) {
            skippedCount++
            continue
          }

          try {
            await processSingleFeedback({
              content,
              channel: channel || "CSV",
              customerLabel: customerLabel || null,
              sourceRef: sourceRef || null,
              workspaceId
            })
            existingSet.add(normalized)
            successCount++
          } catch (err) {
            console.error("Feedback row import failed:", err)
            failCount++
          }
        } else {
          failCount++
        }
      }
    }
    
    return { 
      success: true, 
      error: null,
      summary: { 
        total: parsedData.length, 
        success: successCount,
        successful: successCount, 
        failed: failCount, 
        skipped: skippedCount 
      } 
    }
  } catch (error: unknown) {
    console.error("Bulk import error:", error)
    return { error: "Failed to process imported CSV data", success: false, summary: null }
  }
}

// Source-specific realistic feedback samples for channels
const SOURCE_FEEDBACK_POOLS: Record<string, Array<{ content: string; customerLabel: string; sourceRef: string }>> = {
  Zendesk: [
    {
      content: "Zendesk Ticket #4102: Users are reporting 504 Gateway Timeouts when downloading monthly analytics exports.",
      customerLabel: "Zendesk Ticket #4102",
      sourceRef: "zd-4102"
    },
    {
      content: "Zendesk Ticket #4109: Support request: Need assistance setting up SAML SSO authentication for our enterprise tier.",
      customerLabel: "Enterprise Admin",
      sourceRef: "zd-4109"
    },
    {
      content: "Zendesk Ticket #4115: Password reset emails are taking over 15 minutes to arrive in Outlook inbox.",
      customerLabel: "Zendesk Ticket #4115",
      sourceRef: "zd-4115"
    },
    {
      content: "Zendesk Ticket #4128: Requesting custom webhook integrations for PagerDuty alert forwarding.",
      customerLabel: "DevOps Lead",
      sourceRef: "zd-4128"
    },
    {
      content: "Zendesk Ticket #4133: Customer praised the instant support response time for critical billing inquiry.",
      customerLabel: "Client Success",
      sourceRef: "zd-4133"
    }
  ],
  Intercom: [
    {
      content: "Intercom Chat #802: User asked if there is a dark mode toggle for the mobile web dashboard.",
      customerLabel: "Intercom User #802",
      sourceRef: "int-802"
    },
    {
      content: "Intercom Chat #814: Customer mentioned the onboarding checklist was extremely intuitive and saved 2 hours of setup.",
      customerLabel: "New Onboarding User",
      sourceRef: "int-814"
    },
    {
      content: "Intercom Chat #829: Live Chat: Navigation menu flickers on Safari iOS version 17.4.",
      customerLabel: "Mobile Safari User",
      sourceRef: "int-829"
    },
    {
      content: "Intercom Chat #840: Customer requested bulk CSV tag editing feature for feedback items.",
      customerLabel: "Product Manager",
      sourceRef: "int-840"
    },
    {
      content: "Intercom Chat #855: Searching for older feedback items feels sluggish when workspace has over 1000 items.",
      customerLabel: "Analytics Power User",
      sourceRef: "int-855"
    }
  ],
  "Play Store": [
    {
      content: "Play Store Review (5★): Absolutely love the real-time AI Insights! Makes product roadmap planning so much faster.",
      customerLabel: "Android User @alex_g",
      sourceRef: "ps-rev-901"
    },
    {
      content: "Play Store Review (2★): App crashes when opening large PDF reports on Android 14.",
      customerLabel: "Android User @dev_mike",
      sourceRef: "ps-rev-905"
    },
    {
      content: "Play Store Review (1★): Can't log in using Google OAuth on mobile chrome browser. Stuck on redirect screen.",
      customerLabel: "Mobile Chrome User",
      sourceRef: "ps-rev-912"
    },
    {
      content: "Play Store Review (4★): Great UI design and smooth animations, but please add push notifications for new feedback.",
      customerLabel: "Android User @sarah_k",
      sourceRef: "ps-rev-920"
    },
    {
      content: "Play Store Review (5★): Cleanest feedback explorer app I've used. Classification tags are surprisingly accurate!",
      customerLabel: "Verified App Buyer",
      sourceRef: "ps-rev-934"
    }
  ],
  "App Store": [
    {
      content: "Play Store Review (5★): Absolutely love the real-time AI Insights! Makes product roadmap planning so much faster.",
      customerLabel: "Android User @alex_g",
      sourceRef: "ps-rev-901"
    },
    {
      content: "Play Store Review (2★): App crashes when opening large PDF reports on Android 14.",
      customerLabel: "Android User @dev_mike",
      sourceRef: "ps-rev-905"
    },
    {
      content: "Play Store Review (1★): Can't log in using Google OAuth on mobile chrome browser. Stuck on redirect screen.",
      customerLabel: "Mobile Chrome User",
      sourceRef: "ps-rev-912"
    },
    {
      content: "Play Store Review (4★): Great UI design and smooth animations, but please add push notifications for new feedback.",
      customerLabel: "Android User @sarah_k",
      sourceRef: "ps-rev-920"
    },
    {
      content: "Play Store Review (5★): Cleanest feedback explorer app I've used. Classification tags are surprisingly accurate!",
      customerLabel: "Verified App Buyer",
      sourceRef: "ps-rev-934"
    }
  ]
}

export async function simulateChannelSync(channelName: string) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) {
    return { error: "Unauthorized", success: false }
  }
  const workspaceId = session.user.workspaceId

  // Select source pool or default pool
  const pool = SOURCE_FEEDBACK_POOLS[channelName] || [
    { content: `Feedback from ${channelName}: Great performance and fast response!`, customerLabel: `User-${channelName}`, sourceRef: `ref-${Date.now()}` },
    { content: `Feedback from ${channelName}: Feature request for automated report scheduling.`, customerLabel: `User-${channelName}`, sourceRef: `ref-${Date.now() + 1}` }
  ]

  try {
    // 1. Fetch existing feedbacks for duplicate prevention
    const existingFeedbacks = (await prisma.feedback.findMany({
      where: { workspaceId },
      select: { normalizedContent: true }
    })) || []

    const existingSet = new Set(
      existingFeedbacks
        .map(f => f.normalizedContent)
        .filter((c): c is string => Boolean(c))
    )

    // 2. Filter candidate pool to find un-synced items
    const availableItems = pool.filter(item => {
      const norm = normalizeText(item.content)
      return !existingSet.has(norm)
    })

    if (availableItems.length === 0) {
      return { 
        success: true, 
        message: `All available feedback items for ${channelName} are already synced and up to date!`, 
        count: 0,
        skipped: pool.length
      }
    }

    // 3. Sync up to 2 un-synced items to Neon PostgreSQL via processSingleFeedback
    const itemsToSync = availableItems.slice(0, 2)
    let syncedCount = 0

    for (const item of itemsToSync) {
      await processSingleFeedback({
        content: item.content,
        channel: channelName,
        customerLabel: item.customerLabel,
        sourceRef: item.sourceRef,
        workspaceId
      })
      syncedCount++
    }
    
    return { 
      success: true, 
      message: `Successfully synced & classified ${syncedCount} new item(s) from ${channelName} into PostgreSQL.`, 
      count: syncedCount 
    }
  } catch (error: unknown) {
    console.error("Channel Sync Error:", error)
    return { error: `Failed to sync ${channelName} channel`, success: false }
  }
}

export async function getWorkspaceApiKey() {
  const session = await verifySession()
  if (!session?.user?.workspaceId) {
    return { apiKey: null, hasApiKey: false, error: "Unauthorized" }
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: { apiKey: true, apiKeyHash: true }
    })

    return {
      apiKey: workspace?.apiKey || null,
      hasApiKey: Boolean(workspace?.apiKeyHash || workspace?.apiKey),
      error: null
    }
  } catch (error) {
    console.error("Failed to fetch workspace API key:", error)
    return { apiKey: null, hasApiKey: false, error: "Failed to fetch workspace API key" }
  }
}



