import { prisma } from "../lib/prisma.js"
import { generateEmbedding } from "../lib/embeddings.js"
import { generateText, sanitizeError } from "../lib/ai-provider.js"

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

    let answerText = ""
    try {
      answerText = await generateText({
        prompt: `User Question: "${trimmedQuestion}"\n\nRETRIEVED EVIDENCE ITEMS:\n${evidenceText}`,
        systemInstruction: systemPrompt,
        temperature: 0.1
      })
    } catch (aiErr: unknown) {
      console.error("Ask LOOP AI Generation Error (Gemini & Groq failed):", sanitizeError(aiErr))
      return {
        answer: "AI service is temporarily unavailable. Please try again later.",
        hasSufficientEvidence: false,
        evidence: citations,
        error: "AI service is temporarily unavailable."
      }
    }

    const answer = answerText.trim() || "Based on the available customer feedback, there is insufficient evidence to answer this question."

    return {
      answer,
      hasSufficientEvidence: !answer.toLowerCase().includes("insufficient evidence"),
      evidence: citations
    }
  } catch (err: unknown) {
    console.error("Ask LOOP Grounded Q&A Error:", sanitizeError(err))
    return {
      answer: "Unable to process Ask LOOP request. Please try again later.",
      hasSufficientEvidence: false,
      evidence: [],
      error: "Failed to process Q&A request"
    }
  }
}
