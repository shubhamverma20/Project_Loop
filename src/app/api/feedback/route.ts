import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { processSingleFeedback } from "@/lib/ingestion-pipeline"

const apiFeedbackSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000, "Content exceeds 5000 character limit"),
  channel: z.string().optional().default("API"),
  customerLabel: z.string().optional().nullable(),
  sourceRef: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip"

    // Item 3: Apply rate limiting BEFORE workspace authentication (stricter limit for unauthenticated attempts)
    const preAuthLimit = checkRateLimit("unauth_api_" + clientIp, 20, 60 * 1000)
    if (!preAuthLimit.success) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((preAuthLimit.reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0"
          }
        }
      )
    }

    // 1. Authenticate Request
    let workspaceId: string | null = null

    // Check Header API Key (x-api-key or Authorization: Bearer <key>)
    const headerApiKey = req.headers.get("x-api-key")
    const authHeader = req.headers.get("authorization")
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null
    const apiKey = headerApiKey || bearerToken

    if (apiKey) {
      // Item 2: Hash incoming API key before DB lookup (with fallback for raw/seeded keys)
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
      const workspace = await prisma.workspace.findFirst({
        where: {
          OR: [
            { apiKeyHash: keyHash },
            { apiKey: apiKey }
          ]
        }
      })
      if (workspace) {
        workspaceId = workspace.id
      }
    }

    // Fallback to Session Auth if API Key is not provided
    if (!workspaceId) {
      try {
        const session = await auth()
        if (session?.user?.workspaceId) {
          workspaceId = session.user.workspaceId
        }
      } catch {
        // Ignored if called outside Next.js server request context
      }
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key / authorization token" },
        { status: 401 }
      )
    }

    // 2. Workspace Rate Limiting Check
    const rateLimit = checkRateLimit("ws_api_" + workspaceId, 60, 60 * 1000)

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0"
          }
        }
      )
    }

    // 3. Parse & Validate Payload with Zod
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const validation = apiFeedbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request payload", 
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { content, channel, customerLabel, sourceRef } = validation.data

    // 4. Process Feedback through Core Ingestion Pipeline
    const feedbackResult = await processSingleFeedback({
      content,
      channel: channel || "API",
      customerLabel,
      sourceRef,
      workspaceId
    })

    // Item 10: Handle duplicate feedback cleanly
    if ("duplicate" in feedbackResult && feedbackResult.duplicate) {
      return NextResponse.json(
        {
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
        },
        { status: 200 }
      )
    }

    const feedback = "feedback" in feedbackResult ? feedbackResult.feedback : feedbackResult

    return NextResponse.json(
      {
        success: true,
        message: "Feedback submitted successfully",
        data: {
          id: feedback.id,
          category: feedback.category,
          sentiment: feedback.sentiment,
          channel: feedback.channel,
          createdAt: feedback.createdAt
        }
      },
      { 
        status: 201,
        headers: {
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": rateLimit.remaining.toString()
        }
      }
    )
  } catch (error) {
    console.error("API Feedback Submission Error:", error)
    return NextResponse.json(
      { error: "Failed to process feedback submission" },
      { status: 500 }
    )
  }
}
