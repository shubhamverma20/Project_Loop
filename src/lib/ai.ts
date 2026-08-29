import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const anthropic = new Anthropic()

export const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).max(3),
  featureArea: z.string().max(50),
  category: z.enum(["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"])
})

export type ClassificationResult = z.infer<typeof classificationSchema>

const DEFAULT_CLASSIFICATION: ClassificationResult = {
  sentiment: "NEU",
  sentimentScore: 0,
  themes: [],
  featureArea: "General",
  category: "Other"
}

// Timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI Request Timed Out")), ms))
  ])
}

export async function classifyFeedback(text: string, existingThemes: string[] = []): Promise<ClassificationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("No ANTHROPIC_API_KEY found. Falling back to default classification.")
    return DEFAULT_CLASSIFICATION
  }

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
  "category": "Bug" | "Feature Request" | "Complaint" | "Praise" | "Question" | "Other"
}${themeContext}

Example valid response:
{"sentiment":"NEG","sentimentScore":-0.8,"themes":["Bug","Login"],"featureArea":"Authentication","category":"Bug"}`

  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: `Analyze this feedback:\n\n${text}` }],
        temperature: 0.1,
      }), 10000) // 10 second timeout

      const rawContent = response.content[0].type === "text" ? response.content[0].text : ""
      
      const parsedJson = JSON.parse(rawContent.trim())
      const validatedData = classificationSchema.parse(parsedJson)
      
      return validatedData
    } catch (error) {
      console.error(`AI Classification Error (Attempt ${attempt + 1}):`, error)
      if (attempt === maxRetries) {
        return DEFAULT_CLASSIFICATION
      }
      // Wait before retrying (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }
  
  return DEFAULT_CLASSIFICATION
}
