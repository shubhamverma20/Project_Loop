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
// HELPER: ENV KEYS, MODELS & ERROR SANITIZATION
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

export function getGeminiModel(): string {
  const model = (process.env.GEMINI_MODEL || "").trim().replace(/^["']|["']$/g, "")
  return model || "gemini-3.8-flash"
}

export function getGroqModel(): string {
  const model = (process.env.GROQ_MODEL || "").trim().replace(/^["']|["']$/g, "")
  return model || "openai/gpt-oss-20b"
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

function extractErrorDetails(err: any): { status: string; code: string; message: string } {
  if (!err) return { status: "500", code: "UNKNOWN", message: "Unknown error" }
  let status = err.status || err.statusCode || err.response?.status
  if (!status) {
    const msg = String(err.message || err)
    if (msg.includes("401")) status = "401"
    else if (msg.includes("403")) status = "403"
    else if (msg.includes("404")) status = "404"
    else if (msg.includes("429")) status = "429"
    else if (msg.includes("503")) status = "503"
    else status = "500"
  }
  const code = err.code || err.errorCode || err.error?.code || "ERR"
  const message = sanitizeError(err.message || err)
  return { status: String(status), code: String(code), message }
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
  const isConfigured = Boolean(apiKey)
  const primaryModel = getGeminiModel()

  console.log(`[AI] Gemini configured: ${isConfigured}`)
  console.log(`[AI] Gemini model: ${primaryModel}`)

  if (!apiKey) {
    console.warn("[AI] Gemini failed: status=401, code=MISSING_KEY, message=GEMINI_API_KEY is not configured")
    throw new Error("GEMINI_API_KEY is not configured or invalid")
  }

  console.log("[AI] Gemini request started")

  const ai = new GoogleGenAI({ apiKey })
  const fallbackModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-2.5-flash"]
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]))

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
        console.log(`[AI] Gemini success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] Gemini success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
    }
  }

  const details = extractErrorDetails(lastErr)
  console.warn(`[AI] Gemini failed: status=${details.status}, code=${details.code}, message=${details.message}`)
  throw new Error(`Gemini generation failed: ${details.message}`)
}

// -----------------------------------------------------------------------------
// 2. FALLBACK PROVIDER: GROQ
// -----------------------------------------------------------------------------

async function generateWithGroq<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getGroqApiKey()
  const isConfigured = Boolean(apiKey)
  const primaryModel = getGroqModel()

  console.log(`[AI] Groq configured: ${isConfigured}`)
  console.log(`[AI] Groq model: ${primaryModel}`)

  if (!apiKey) {
    console.error("[AI] Groq failed: status=401, code=MISSING_KEY, message=GROQ_API_KEY is not configured")
    throw new Error("GROQ_API_KEY is not configured or invalid")
  }

  console.log("[AI] Groq request started")

  const fallbackModels = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "allam-2-7b"]
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]))

  let lastErr: unknown = null

  for (const modelName of modelsToTry) {
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
        console.log(`[AI] Groq success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] Groq success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const details = extractErrorDetails(lastErr)
  console.error(`[AI] Groq failed: status=${details.status}, code=${details.code}, message=${details.message}`)
  throw new Error(`Groq generation failed: ${details.message}`)
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
    const safeErr = sanitizeError(geminiError)
    console.warn(`[AI] Gemini failed: ${safeErr}`)
    console.log("[AI] Falling back to Groq")
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq(options, false)
    return result.text
  } catch (groqError: unknown) {
    const safeErr = sanitizeError(groqError)
    console.error(`[AI] Groq failed: ${safeErr}`)
    console.error("[AI] Both Gemini AND Groq AI providers failed")
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
    const safeErr = sanitizeError(geminiError)
    console.warn(`[AI] Gemini failed: ${safeErr}`)
    console.log("[AI] Falling back to Groq")
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (groqError: unknown) {
    const safeErr = sanitizeError(groqError)
    console.error(`[AI] Groq failed: ${safeErr}`)
    console.error("[AI] Both Gemini AND Groq AI providers failed")
    throw new Error("AI service is temporarily unavailable. Please try again later.")
  }

  throw new Error("AI service is temporarily unavailable. Please try again later.")
}

/**
 * Diagnostic helper function to test Gemini directly with a tiny prompt.
 */
export async function testGeminiDiagnostic(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await generateWithGemini({ prompt: "Reply with exactly: GEMINI_OK", temperature: 0.1 }, false)
    return { success: true, message: res.text }
  } catch (err: any) {
    const details = extractErrorDetails(err)
    return { success: false, message: `Status: ${details.status}, Code: ${details.code}, Msg: ${details.message}` }
  }
}
