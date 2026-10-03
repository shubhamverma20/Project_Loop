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

function cleanEnv(name: string): string {
  let value = (process.env[name] || "").trim()
  // If the whole line "KEY=value" was pasted into the value box, strip the "KEY=" part
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  return value.replace(/^["']|["']$/g, "").trim()
}

export function getGeminiApiKey(): string {
  const key = cleanEnv("GEMINI_API_KEY")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function getGroqApiKey(): string {
  const key = cleanEnv("GROQ_API_KEY")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function getGeminiModel(): string {
  return cleanEnv("GEMINI_MODEL") || "gemini-3.8-flash"
}

export function getGroqModel(): string {
  return cleanEnv("GROQ_MODEL") || "openai/gpt-oss-20b"
}

function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey })
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
  msg = msg.replace(/AQ\.[A-Za-z0-9_-]{20,}/g, "[REDACTED_KEY]")
  msg = msg.replace(/gsk_[A-Za-z0-9_-]{20,}/g, "[REDACTED_KEY]")
  return msg
}

function extractErrorDetails(err: any): { status: string; code: string; message: string } {
  if (!err) return { status: "500", code: "UNKNOWN", message: "Unknown error" }
  let status = err.status || err.statusCode || err.response?.status
  if (!status) {
    const msg = String(err.message || err)
    const httpMatch = msg.match(/HTTP (\d{3})/)
    if (httpMatch) status = httpMatch[1]
    else if (msg.includes("401")) status = "401"
    else if (msg.includes("403")) status = "403"
    else if (msg.includes("404")) status = "404"
    else if (msg.includes("413")) status = "413"
    else if (msg.includes("429")) status = "429"
    else if (msg.includes("503")) status = "503"
    else status = "500"
  }
  const code = err.code || err.errorCode || err.error?.code || "ERR"
  const message = sanitizeError(err.message || err)
  return { status: String(status), code: String(code), message }
}

function isAuthError(err: unknown): boolean {
  const { status } = extractErrorDetails(err)
  return status === "401" || status === "403"
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI Request timed out after ${ms}ms`)), ms)
    ),
  ])
}

function parseJsonText(rawText: string): any {
  let textToParse = rawText
  if (textToParse.startsWith("```json")) {
    textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
  } else if (textToParse.startsWith("```")) {
    textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
  }
  return JSON.parse(textToParse)
}

// Converts the Gemini-style responseSchema into a plain-text shape hint for Groq
function schemaToHint(schema: any): string {
  try {
    return JSON.stringify(schema, null, 1)
  } catch {
    return ""
  }
}

// -----------------------------------------------------------------------------
// 1. PRIMARY PROVIDER: GEMINI
// -----------------------------------------------------------------------------

async function generateWithGemini<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getGeminiApiKey()
  const primaryModel = getGeminiModel()

  console.log(`[AI] Gemini configured: ${Boolean(apiKey)}`)
  console.log(`[AI] Gemini model: ${primaryModel}`)

  if (!apiKey) {
    console.warn("[AI] Gemini failed: status=401, code=MISSING_KEY, message=GEMINI_API_KEY is not configured")
    throw new Error("GEMINI_API_KEY is not configured or invalid")
  }

  console.log("[AI] Gemini request started")

  const ai = createGeminiClient(apiKey)
  const fallbackModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"]
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
        const parsed = parseJsonText(rawText)
        const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
        console.log(`[AI] Gemini success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] Gemini success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
      console.warn(`[AI] Gemini ${modelName} failed: ${sanitizeError(err)}`)
      // Bad key: trying other models is pointless
      if (isAuthError(err)) break
    }
  }

  const details = extractErrorDetails(lastErr)
  console.warn(`[AI] Gemini failed: status=${details.status}, code=${details.code}`)
  throw new Error(`Gemini failed: ${details.message}`)
}

// -----------------------------------------------------------------------------
// 2. FALLBACK PROVIDER: GROQ
// -----------------------------------------------------------------------------

async function generateWithGroq<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getGroqApiKey()
  const primaryModel = getGroqModel()

  console.log(`[AI] Groq configured: ${Boolean(apiKey)}`)
  console.log(`[AI] Groq model: ${primaryModel}`)

  if (!apiKey) {
    console.error("[AI] Groq failed: status=401, code=MISSING_KEY, message=GROQ_API_KEY is not configured")
    throw new Error("GROQ_API_KEY is not configured or invalid")
  }

  console.log("[AI] Groq request started")

  const fallbackModels = [
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ]
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]))

  let lastErr: unknown = null

  for (const modelName of modelsToTry) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000)

    try {
      // Groq json_object mode needs the word "JSON" in the messages,
      // and Groq does not receive the Gemini responseSchema, so describe the shape in text.
      let systemContent = options.systemInstruction || ""
      if (isJson) {
        systemContent += "\n\nRespond with valid JSON only."
        if (options.responseSchema) {
          systemContent += `\nThe JSON must follow this schema:\n${schemaToHint(options.responseSchema)}`
        }
      }

      const messages: Array<{ role: string; content: string }> = []
      if (systemContent.trim()) {
        messages.push({ role: "system", content: systemContent.trim() })
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
        const parsed = parseJsonText(rawText)
        const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
        console.log(`[AI] Groq success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] Groq success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
      console.warn(`[AI] Groq ${modelName} failed: ${sanitizeError(err)}`)
      if (isAuthError(err)) break
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const details = extractErrorDetails(lastErr)
  console.error(`[AI] Groq failed: status=${details.status}, code=${details.code}`)
  throw new Error(`Groq failed: ${details.message}`)
}

// -----------------------------------------------------------------------------
// PUBLIC CENTRALIZED AI PROVIDER API
// -----------------------------------------------------------------------------

/**
 * Generate text output using Gemini as primary and Groq as automatic fallback.
 */
export async function generateText(options: AiRequestOptions): Promise<string> {
  let geminiErrStr = ""

  // 1. Try Gemini
  try {
    const result = await generateWithGemini(options, false)
    return result.text
  } catch (geminiError: unknown) {
    geminiErrStr = sanitizeError(geminiError)
    console.warn(`[AI] Gemini failed: ${geminiErrStr}`)
    console.log("[AI] Falling back to Groq")
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq(options, false)
    return result.text
  } catch (groqError: unknown) {
    const groqErrStr = sanitizeError(groqError)
    console.error(`[AI] Groq failed: ${groqErrStr}`)
    console.error("[AI] Both Gemini AND Groq AI providers failed")
    throw new Error(`AI service is temporarily unavailable. (Gemini: ${geminiErrStr} | Groq: ${groqErrStr})`)
  }
}

/**
 * Generate structured JSON output using Gemini as primary and Groq as automatic fallback.
 */
export async function generateJson<T = any>(options: AiRequestOptions<T>): Promise<T> {
  let geminiErrStr = ""

  // 1. Try Gemini
  try {
    const result = await generateWithGemini<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (geminiError: unknown) {
    geminiErrStr = sanitizeError(geminiError)
    console.warn(`[AI] Gemini failed: ${geminiErrStr}`)
    console.log("[AI] Falling back to Groq")
  }

  // 2. Try Groq
  try {
    const result = await generateWithGroq<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (groqError: unknown) {
    const groqErrStr = sanitizeError(groqError)
    console.error(`[AI] Groq failed: ${groqErrStr}`)
    console.error("[AI] Both Gemini AND Groq AI providers failed")
    throw new Error(`AI service is temporarily unavailable. (Gemini: ${geminiErrStr} | Groq: ${groqErrStr})`)
  }

  throw new Error(`AI service is temporarily unavailable. (Gemini: ${geminiErrStr} | Groq: Unknown error)`)
}

/**
 * Diagnostic helper function to test both Gemini and Groq providers without exposing API keys.
 */
export async function testAiDiagnostic(): Promise<{
  gemini: { configured: boolean; success: boolean; status?: string; message?: string };
  groq: { configured: boolean; success: boolean; status?: string; message?: string };
}> {
  const geminiKey = getGeminiApiKey()
  const geminiConfigured = Boolean(geminiKey)
  const groqKey = getGroqApiKey()
  const groqConfigured = Boolean(groqKey)

  let geminiResult: { configured: boolean; success: boolean; status?: string; message?: string } = {
    configured: geminiConfigured,
    success: false,
  }

  if (geminiConfigured) {
    try {
      const res = await generateWithGemini({ prompt: "Reply with OK", temperature: 0.1, timeoutMs: 5000 }, false)
      geminiResult.success = true
      geminiResult.message = res.text || "Gemini operational"
    } catch (err: any) {
      const details = extractErrorDetails(err)
      geminiResult.success = false
      geminiResult.status = details.status
      geminiResult.message = details.message
    }
  } else {
    geminiResult.message = "GEMINI_API_KEY is not configured"
  }

  let groqResult: { configured: boolean; success: boolean; status?: string; message?: string } = {
    configured: groqConfigured,
    success: false,
  }

  if (groqConfigured) {
    try {
      const res = await generateWithGroq({ prompt: "Reply with OK", temperature: 0.1, timeoutMs: 5000 }, false)
      groqResult.success = true
      groqResult.message = res.text || "Groq operational"
    } catch (err: any) {
      const details = extractErrorDetails(err)
      groqResult.success = false
      groqResult.status = details.status
      groqResult.message = details.message
    }
  } else {
    groqResult.message = "GROQ_API_KEY is not configured"
  }

  return { gemini: geminiResult, groq: groqResult }
}
