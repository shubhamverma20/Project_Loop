import { prisma } from "../lib/prisma.js"
import { generateEmbedding } from "../lib/embeddings.js"
import { GoogleGenAI } from "@google/genai"

export interface GroundedCitation {
  id: string
  content: string
  category?: string | null
  sentiment?: string | null
  channel: string
  customerLabel?: string | null
  createdAt: Date
  similarity: number
}

export interface AskLoopResult {
  answer: string
  hasSufficientEvidence: boolean
  evidence: GroundedCitation[]
  error?: string | null
}

export async function askLoopGroundedQa(
  workspaceId: string,
  question: string,
  limit: number = 8
): Promise<AskLoopResult> {
  const trimmedQuestion = question.trim()
  if (!trimmedQuestion) {
    return {
      answer: "Please provide a question to ask about your customer feedback.",
      hasSufficientEvidence: false,
      evidence: [],
      error: "Question string is required"
    }
  }

  const rawApiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!rawApiKey || rawApiKey.startsWith("your_")) {
    return {
      answer: "Gemini API key is not configured.",
      hasSufficientEvidence: false,
      evidence: [],
      error: "Gemini API key is missing or not configured. Please set GEMINI_API_KEY in backend/.env."
    }
  }

  try {
    const queryVector = await generateEmbedding(trimmedQuestion)
    const vectorStr = JSON.stringify(queryVector)

    const rawResults: Array<any> = await prisma.$queryRaw`
      SELECT 
        f.id,
        f.content,
        f.category,
        f.sentiment,
        f."sentimentScore",
        f.channel,
        f."customerLabel",
        f."createdAt",
        ROUND((1 - (e.vector <=> ${vectorStr}::vector))::numeric, 4) AS similarity
      FROM "Feedback" f
      JOIN "Embedding" e ON f.id = e."feedbackId"
      WHERE f."workspaceId" = ${workspaceId}
      ORDER BY e.vector <=> ${vectorStr}::vector ASC
      LIMIT ${limit}
    `

    if (!rawResults || rawResults.length === 0) {
      return {
        answer: "Based on the available customer feedback in your workspace, there is insufficient evidence to answer this question.",
        hasSufficientEvidence: false,
        evidence: []
      }
    }

    const citations: GroundedCitation[] = rawResults.map(r => ({
      id: r.id,
      content: r.content,
      category: r.category,
      sentiment: r.sentiment,
      channel: r.channel,
      customerLabel: r.customerLabel,
      createdAt: new Date(r.createdAt),
      similarity: Number(r.similarity || 0)
    }))

    const evidenceText = citations.map((c, i) => 
      `[Evidence #${i + 1} | ID: ${c.id} | Category: ${c.category || "General"} | Sentiment: ${c.sentiment || "NEU"}]\n"${c.content}"`
    ).join("\n\n")

    const systemPrompt = `You are Ask LOOP, an enterprise AI assistant for customer feedback intelligence.
Your task is to answer the user's question STRICTLY based ONLY on the retrieved customer feedback evidence items provided below.

CRITICAL RULES:
1. You MUST rely ONLY on the provided EVIDENCE ITEMS.
2. If the evidence does not contain sufficient facts to answer the question directly, respond with:
   "Based on the available customer feedback, there is insufficient evidence to answer this question."
3. NEVER make up statistics, numbers, features, or quotes that are not present in the evidence.
4. Reference evidence numbers (e.g., [Evidence #1]) when highlighting specific customer points.
5. Keep your answer objective, concise, and structured.`

    const ai = new GoogleGenAI({ apiKey: rawApiKey })

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.6-flash"
    const fallbackModel = "gemini-3.5-flash"
    const modelsToTry = [primaryModel, fallbackModel, "gemini-3.5-flash-lite"]

    let response: any = null
    let lastError: unknown = null

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: `User Question: "${trimmedQuestion}"\n\nRETRIEVED EVIDENCE ITEMS:\n${evidenceText}`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1
          }
        })
        if (response?.text) break
      } catch (err: any) {
        lastError = err
        const msg = String(err?.message || err || "")
        if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("401") || msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("invalid")) {
          return {
            answer: "Gemini API Authentication Failed: Invalid or unauthorized API key.",
            hasSufficientEvidence: false,
            evidence: citations,
            error: "Gemini API Authentication Failed: Invalid or unauthorized API key. Please generate a valid key starting with 'AIzaSy...' from https://aistudio.google.com and set GEMINI_API_KEY in backend/.env."
          }
        }
      }
    }

    const answer = (response?.text || "").trim() || "Based on the available customer feedback, there is insufficient evidence to answer this question."

    return {
      answer,
      hasSufficientEvidence: !answer.toLowerCase().includes("insufficient evidence"),
      evidence: citations
    }
  } catch (err: unknown) {
    console.error("Ask LOOP Grounded Q&A Error:", err)
    const errMessage = err instanceof Error ? err.message : String(err)
    return {
      answer: "Unable to process Ask LOOP request.",
      hasSufficientEvidence: false,
      evidence: [],
      error: errMessage
    }
  }
}
