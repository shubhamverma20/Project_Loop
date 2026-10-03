import { GoogleGenAI } from "@google/genai"
import { z } from "zod"

export interface AiRequestOptions<T = any> {
  prompt: string
  systemInstruction?: string
  responseSchema?: any
  zSchema?: z.ZodType<T>
  temperature?: number
  timeoutMs?: number
}

// -----------------------------------------------------------------------------
// HELPER: ENV KEYS & ERROR SANITIZATION
// -----------------------------------------------------------------------------

export function getGeminiApiKey(): string {
  const key = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function getGroqApiKey(): string {
  const key = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function sanitizeError(error: unknown): string {
  if (!error) return "Unknown error"
  let msg = error instanceof Error ? error.message : String(error)
  const geminiKey = getGeminiApiKey()
  const groqKey = getGroqApiKey()

  if (geminiKey && geminiKey.length > 5) {
    msg = msg.replaceAll(geminiKey, "[REDACTED_GEMINI_KEY]")
  }
  if (groqKey && groqKey.length > 5) {
    msg = msg.replaceAll(groqKey, "[REDACTED_GROQ_KEY]")
  }
  msg = msg.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_KEY]")
  msg = msg.replace(/gsk_[A-Za-z0-9_-]{48}/g, "[REDACTED_KEY]")
  return msg
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI Request timed out after ${ms}ms`)), ms)
    ),
  ])
}

// -----------------------------------------------------------------------------
// 1. PRIMARY PROVIDER: GEMINI
// -----------------------------------------------------------------------------

async function generateWithGemini<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured or invalid")
  }

  const ai = new GoogleGenAI({ apiKey })
  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const fallbackModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.6-flash", "gemini-3.5-flash"]
  const modelsToTry = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)]

  let lastErr: unknown = null

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        temperature: options.temperature ?? 0.2,
      }
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction
      }
      if (isJson) {
        config.responseMimeType = "application/json"
        if (options.responseSchema) {
          config.responseSchema = options.responseSchema
        }
      }

      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: options.prompt,
          config,
        }),
        options.timeoutMs ?? 20000
      )

      const rawText = (response?.text || "").trim()
      if (!rawText) {
        throw new Error(`Empty response from Gemini model ${modelName}`)
      }

      if (isJson) {
        let textToParse = rawText
        if (textToParse.startsWith("```json")) {
          textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
        } else if (textToParse.startsWith("```")) {
          textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
        }

        const parsed = JSON.parse(textToParse)
        const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
        console.log(`[AI Provider] Successfully generated output using Gemini (${modelName})`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI Provider] Successfully generated text using Gemini (${modelName})`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
    }
  }

  throw new Error(`Gemini generation failed: ${sanitizeError(lastErr)}`)
}

// -----------------------------------------------------------------------------
// 2. FALLBACK PROVIDER: GROQ
// -----------------------------------------------------------------------------

async function generateWithGroq<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getGroqApiKey()
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured or invalid")
  }

  const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000)

  try {
    const messages: Array<{ role: string; content: string }> = []
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction })
    }
    messages.push({ role: "user", content: options.prompt })

    const body: any = {
      model: modelName,
      messages,
      temperature: options.temperature ?? 0.2,
    }

    if (isJson) {
      body.response_format = { type: "json_object" }
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Groq API returned HTTP ${res.status}: ${errText}`)
    }

    const json: any = await res.json()
    const rawText = (json?.choices?.[0]?.message?.content || "").trim()
    if (!rawText) {
      throw new Error(`Empty response from Groq model ${modelName}`)
    }

    if (isJson) {
      let textToParse = rawText
      if (textToParse.startsWith("```json")) {
        textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
      } else if (textToParse.startsWith("```")) {
        textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
      }

      const parsed = JSON.parse(textToParse)
      const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
      console.log(`[AI Provider] Successfully generated output using Groq Fallback (${modelName})`)
      return { text: rawText, data: validated }
    }

    console.log(`[AI Provider] Successfully generated text using Groq Fallback (${modelName})`)
    return { text: rawText }
  } finally {
    clearTimeout(timeoutId)
  }
}

// -----------------------------------------------------------------------------
// PUBLIC CENTRALIZED AI PROVIDER API
// -----------------------------------------------------------------------------

/**
 * Generate text output using Gemini as primary and Groq as automatic fallback.
 */
export async function generateText(options: AiRequestOptions): Promise<string> {
  // 1. Try Gemini
  try {
    const result = await generateWithGemini(options, false)
    return result.text
  } catch (geminiError: unknown) {
    console.warn(`[AI Provider] Gemini primary failed. Falling back to Groq:`, sanitizeError(geminiError))
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq(options, false)
    return result.text
  } catch (groqError: unknown) {
    console.error(`[AI Provider] Both Gemini AND Groq AI providers failed:`, sanitizeError(groqError))
    throw new Error("AI service is temporarily unavailable. Please try again later.")
  }
}

/**
 * Generate structured JSON output using Gemini as primary and Groq as automatic fallback.
 */
export async function generateJson<T = any>(options: AiRequestOptions<T>): Promise<T> {
  // 1. Try Gemini
  try {
    const result = await generateWithGemini<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (geminiError: unknown) {
    console.warn(`[AI Provider] Gemini primary failed. Falling back to Groq:`, sanitizeError(geminiError))
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (groqError: unknown) {
    console.error(`[AI Provider] Both Gemini AND Groq AI providers failed:`, sanitizeError(groqError))
    throw new Error("AI service is temporarily unavailable. Please try again later.")
  }

  throw new Error("AI service is temporarily unavailable. Please try again later.")
}
