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

const SAFE_DEFAULT_CLASSIFICATION: ClassificationResult = {
  sentiment: "NEU",
  sentimentScore: 0,
  themes: [],
  featureArea: "General",
  category: "Other",
  rationale: "Classification fallback used."
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI Request Timed Out")), ms))
  ])
}

async function callGroqClassification(
  text: string,
  systemPrompt: string
): Promise<ClassificationResult> {
  const apiKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!apiKey || apiKey.startsWith("your_")) {
    throw new Error("GROQ_API_KEY is not configured")
  }

  console.log("AI Provider: Groq")
  const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this feedback:\n\n${text}` },
        ],
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Groq API returned HTTP ${res.status}: ${errText}`)
    }

    const data: any = await res.json()
    const content = data?.choices?.[0]?.message?.content || ""
    let textToParse = content.trim()

    if (textToParse.startsWith("```json")) {
      textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
    } else if (textToParse.startsWith("```")) {
      textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
    }

    const parsedJson = JSON.parse(textToParse)
    return classificationSchema.parse(parsedJson)
  } finally {
    clearTimeout(timeoutId)
  }
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

  // 1. PRIMARY PROVIDER: GEMINI
  const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")

  if (geminiApiKey && !geminiApiKey.startsWith("your_")) {
    console.log("AI Provider: Gemini")
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey })
      const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
      const fallbackModels = ["gemini-1.5-flash", "gemini-2.0-flash"]
      const modelsToTry = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)]

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: ["POS", "NEU", "NEG"] },
          sentimentScore: { type: Type.NUMBER },
          themes: { type: Type.ARRAY, items: { type: Type.STRING } },
          featureArea: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ["Bug", "Feature Request", "Complaint", "Praise", "Question", "Other"],
          },
          rationale: { type: Type.STRING },
        },
        required: ["sentiment", "sentimentScore", "themes", "featureArea", "category", "rationale"],
      }

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
                responseSchema: responseSchema,
              },
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
          return classificationSchema.parse(parsedJson)
        } catch (err: any) {
          const msg = String(err?.message || err || "")
          if (
            msg.includes("401") ||
            msg.includes("403") ||
            msg.includes("API key") ||
            msg.includes("UNAUTHENTICATED") ||
            msg.includes("invalid")
          ) {
            console.error("Gemini API Authentication Failed: Invalid or unauthorized API key.")
            break
          }
        }
      }
      console.log("Gemini quota/rate limit reached. Switching to Groq...")
    } catch {
      console.log("Gemini quota/rate limit reached. Switching to Groq...")
    }
  } else {
    console.log("Gemini API key not configured. Switching to Groq...")
  }

  // 2. FALLBACK PROVIDER: GROQ
  try {
    return await callGroqClassification(text, systemPrompt)
  } catch {
    console.log("Groq failed. Using fallback classification.")
  }

  // 3. SAFE DEFAULT FALLBACK
  return SAFE_DEFAULT_CLASSIFICATION
}
