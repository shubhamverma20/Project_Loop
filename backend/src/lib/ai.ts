import { z } from "zod"
import { generateJson, sanitizeError } from "./ai-provider.js"

export const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).max(3),
  featureArea: z.string().max(50),
  category: z.enum(["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"]),
  rationale: z.string().optional().default("Classification derived from feedback text analysis.")
})

export type ClassificationResult = z.infer<typeof classificationSchema>

const SAFE_DEFAULT_CLASSIFICATION: ClassificationResult = {
  sentiment: "NEU",
  sentimentScore: 0,
  themes: [],
  featureArea: "General",
  category: "Other",
  rationale: "Classification fallback used."
}

export async function classifyFeedback(
  text: string,
  existingThemes: string[] = []
): Promise<ClassificationResult> {
  const themeContext =
    existingThemes.length > 0
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
    type: "OBJECT",
    properties: {
      sentiment: { type: "STRING", enum: ["POS", "NEU", "NEG"] },
      sentimentScore: { type: "NUMBER" },
      themes: { type: "ARRAY", items: { type: "STRING" } },
      featureArea: { type: "STRING" },
      category: {
        type: "STRING",
        enum: ["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"],
      },
      rationale: { type: "STRING" },
    },
    required: ["sentiment", "sentimentScore", "themes", "featureArea", "category", "rationale"],
  }

  try {
    const result = await generateJson<ClassificationResult>({
      prompt: `Analyze this feedback:\n\n${text}`,
      systemInstruction: systemPrompt,
      responseSchema,
      zSchema: classificationSchema,
      temperature: 0.1,
      timeoutMs: 12000
    })
    return result
  } catch (err: unknown) {
    console.warn("Feedback classification failed for both Gemini and Groq providers:", sanitizeError(err))
    return SAFE_DEFAULT_CLASSIFICATION
  }
}
