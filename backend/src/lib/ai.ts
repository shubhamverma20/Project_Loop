import { GoogleGenAI, Type } from "@google/genai"
import { z } from "zod"

export const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).max(3),
  featureArea: z.string().max(50),
  category: z.enum(["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"]),
  rationale: z.string().optional().default("Classification derived from feedback text analysis.")
})

export type ClassificationResult = z.infer<typeof classificationSchema>

const DEFAULT_CLASSIFICATION: ClassificationResult = {
  sentiment: "NEU",
  sentimentScore: 0,
  themes: [],
  featureArea: "General",
  category: "Other",
  rationale: "Default fallback classification."
}

function getAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!apiKey || apiKey.startsWith("your_")) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env.")
  }
  return new GoogleGenAI({ apiKey })
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI Request Timed Out")), ms))
  ])
}

export async function classifyFeedback(text: string, existingThemes: string[] = []): Promise<ClassificationResult> {
  const ai = getAiClient()

  const themeContext = existingThemes.length > 0
    ? `\n\nEXISTING THEMES (Prioritize reusing these if applicable, but you may invent new ones if none fit):\n${existingThemes.join(", ")}`
    : ""

  const systemPrompt = `You are a strict data analyst AI for a SaaS product.
Your job is to analyze customer feedback and extract structured insights.

You MUST respond with a raw JSON object ONLY, with no markdown formatting, no \`\`\` blocks, and no extra text.
The JSON object must strictly match this schema:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number between -1 (very negative) and 1 (very positive),
  "themes": string[] (up to 3 short tags like "Pricing", "UX", "Bug"),
  "featureArea": string (a short label of the main product area mentioned, max 50 chars),
  "category": "Bug" | "Feature Request" | "Complaint" | "Praise" | "Question" | "Other",
  "rationale": string (brief 1-sentence reasoning for the classification)
}${themeContext}`

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      sentiment: { type: Type.STRING, enum: ["POS", "NEU", "NEG"] },
      sentimentScore: { type: Type.NUMBER },
      themes: { type: Type.ARRAY, items: { type: Type.STRING } },
      featureArea: { type: Type.STRING },
      category: { type: Type.STRING, enum: ["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"] },
      rationale: { type: Type.STRING }
    },
    required: ["sentiment", "sentimentScore", "themes", "featureArea", "category", "rationale"]
  }

  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.6-flash"
  const fallbackModel = "gemini-3.5-flash"
  const modelsToTry = [primaryModel, fallbackModel, "gemini-3.5-flash-lite"]

  let lastError: unknown = null

  for (const modelName of modelsToTry) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze this feedback:\n\n${text}`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        }),
        10000
      )

      const rawContent = response.text || ""
      let textToParse = rawContent.trim()
      if (textToParse.startsWith("```json")) {
        textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
      } else if (textToParse.startsWith("```")) {
        textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
      }

      const parsedJson = JSON.parse(textToParse)
      const validatedData = classificationSchema.parse(parsedJson)

      return validatedData
    } catch (error: any) {
      lastError = error
      const msg = String(error?.message || error || "")
      if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("401") || msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("invalid")) {
        throw new Error("Gemini API Authentication Failed: Invalid or unauthorized API key. Please generate a valid key from https://aistudio.google.com and set GEMINI_API_KEY in backend/.env.")
      }
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
        throw new Error("Gemini API Rate Limit / Quota Exceeded. Please try again later.")
      }
    }
  }

  const errMessage = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Gemini AI Classification Failed: ${errMessage}`)
}
