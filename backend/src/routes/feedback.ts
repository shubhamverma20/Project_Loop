import { Router } from "express"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"
import { checkRateLimit } from "../lib/rate-limit.js"
import { processSingleFeedback, simulateChannelSync } from "../services/ingestion.js"
import { feedbackEvents, FeedbackEventPayload } from "../lib/events.js"
import { requireAuth, AuthRequest } from "../middleware/auth.js"
import { z } from "zod"

const router = Router()

const apiFeedbackSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000, "Content exceeds 5000 character limit"),
  channel: z.string().optional().default("API"),
  customerLabel: z.string().optional().nullable(),
  sourceRef: z.string().optional().nullable(),
})

// 1. Direct Feedback Ingestion Endpoint (POST /api/feedback)
router.post("/feedback", async (req, res, next) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown_ip"
    const ipKey = Array.isArray(clientIp) ? clientIp[0] : clientIp

    const preAuthLimit = checkRateLimit("unauth_api_" + ipKey, 20, 60 * 1000)
    if (!preAuthLimit.success) {
      return res.status(429).json({ error: "Too many authentication attempts. Please try again later." })
    }

    let workspaceId: string | null = null

    const headerApiKey = req.headers["x-api-key"] as string | undefined
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null
    const cookieToken = req.cookies?.session_token

    // 1. Try Workspace API Key (via x-api-key header or Bearer header)
    const possibleApiKey = headerApiKey || bearerToken
    if (possibleApiKey) {
      const keyHash = crypto.createHash("sha256").update(possibleApiKey).digest("hex")
      const workspace = await prisma.workspace.findFirst({
        where: {
          OR: [
            { apiKeyHash: keyHash },
            { apiKey: possibleApiKey }
          ]
        }
      })
      if (workspace) {
        workspaceId = workspace.id
      }
    }

    // 2. Fallback to JWT User Session token (from Bearer header, Cookie, or Query parameter)
    if (!workspaceId) {
      const token = bearerToken || cookieToken || (req.query.token as string | undefined)
      if (token) {
        try {
          const secret = process.env.AUTH_SECRET || "default_dev_secret_key_32_chars_long"
          const decoded = jwt.verify(token, secret) as { id?: string; workspaceId?: string }
          if (decoded?.id) {
            const user = await prisma.user.findUnique({
              where: { id: decoded.id },
              select: { workspaceId: true }
            })
            if (user?.workspaceId) {
              workspaceId = user.workspaceId
            }
          } else if (decoded?.workspaceId) {
            workspaceId = decoded.workspaceId
          }
        } catch {
          // JWT token invalid or expired
        }
      }
    }

    if (!workspaceId) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing API key / authorization token" })
    }

    const rateLimit = checkRateLimit("ws_api_" + workspaceId, 60, 60 * 1000)
    if (!rateLimit.success) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." })
    }

    const validation = apiFeedbackSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid request payload", details: validation.error.flatten().fieldErrors })
    }

    const { content, channel, customerLabel, sourceRef } = validation.data

    const feedbackResult = await processSingleFeedback({
      content,
      channel: channel || "API",
      customerLabel,
      sourceRef,
      workspaceId
    })

    if ("duplicate" in feedbackResult && feedbackResult.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Duplicate feedback detected. Existing feedback returned.",
        data: {
          id: feedbackResult.feedback.id,
          category: feedbackResult.feedback.category,
          sentiment: feedbackResult.feedback.sentiment,
          channel: feedbackResult.feedback.channel,
          createdAt: feedbackResult.feedback.createdAt
        }
      })
    }

    const feedback = "feedback" in feedbackResult ? feedbackResult.feedback : feedbackResult

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        id: feedback.id,
        category: feedback.category,
        sentiment: feedback.sentiment,
        channel: feedback.channel,
        createdAt: feedback.createdAt
      }
    })
  } catch (err) {
    next(err)
  }
})

// 2. Real-Time Feedback Stream (GET /api/feedback/stream - SSE)
router.get("/feedback/stream", requireAuth, (req: AuthRequest, res) => {
  const workspaceId = req.user?.workspaceId
  if (!workspaceId) {
    return res.status(401).json({ error: "Unauthorized: Workspace session missing" })
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  res.write(`event: connected\ndata: ${JSON.stringify({ workspaceId })}\n\n`)

  const onNewFeedback = (payload: FeedbackEventPayload) => {
    if (payload.workspaceId === workspaceId) {
      res.write(`event: feedback\ndata: ${JSON.stringify(payload.feedback)}\n\n`)
    }
  }

  feedbackEvents.on("new-feedback", onNewFeedback)

  const heartbeatInterval = setInterval(() => {
    res.write(`: ping\n\n`)
  }, 15000)

  req.on("close", () => {
    feedbackEvents.removeListener("new-feedback", onNewFeedback)
    clearInterval(heartbeatInterval)
    res.end()
  })
})

// 3. Search & Query Feedback for Explorer
router.get("/feedback/explorer", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const query = req.query.query as string | undefined
    const category = req.query.category as string | undefined
    const sentiment = req.query.sentiment as string | undefined
    const channel = req.query.channel as string | undefined
    const page = parseInt((req.query.page as string) || "1", 10)
    const limit = parseInt((req.query.limit as string) || "10", 10)

    const skip = (page - 1) * limit
    const where: any = { workspaceId }

    if (query && query.trim()) {
      where.OR = [
        { content: { contains: query.trim(), mode: "insensitive" } },
        { customerLabel: { contains: query.trim(), mode: "insensitive" } },
        { category: { contains: query.trim(), mode: "insensitive" } }
      ]
    }

    if (category && category !== "ALL") where.category = category
    if (sentiment && sentiment !== "ALL") where.sentiment = sentiment
    if (channel && channel !== "ALL") where.channel = channel

    const [total, data] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      })
    ])

    return res.status(200).json({ success: true, total, data, page, limit })
  } catch (err) {
    next(err)
  }
})

// 4. Update Feedback Status
router.post("/feedback/status", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const { feedbackId, status } = req.body

    const feedback = await prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId }
    })

    if (!feedback) {
      return res.status(404).json({ error: "Feedback item not found" })
    }

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: { status }
    })

    return res.status(200).json({ success: true, feedback: updated })
  } catch (err) {
    next(err)
  }
})

// 5. Simulate Channel Sync
router.post("/feedback/sync", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const { channelName } = req.body
    const result = await simulateChannelSync(channelName || "Zendesk", workspaceId)
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

// 6. Re-classify Single Feedback
router.post("/feedback/reclassify", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const { feedbackId } = req.body

    if (!feedbackId) {
      return res.status(400).json({ error: "feedbackId is required" })
    }

    const feedbackItem = await prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId }
    })

    if (!feedbackItem) {
      return res.status(404).json({ error: "Feedback item not found" })
    }

    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId },
      select: { name: true }
    })
    const themeNames = existingThemes.map(t => t.name)

    const { classifyFeedback } = await import("../lib/ai.js")
    const aiResult = await classifyFeedback(feedbackItem.content, themeNames)

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        category: aiResult.category,
        sentiment: aiResult.sentiment,
        sentimentScore: aiResult.sentimentScore,
        featureArea: aiResult.featureArea
      }
    })

    return res.status(200).json({ success: true, feedback: updated })
  } catch (err) {
    next(err)
  }
})

export default router

