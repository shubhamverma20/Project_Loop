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
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  return value.replace(/^["']|["']$/g, "").trim()
}

export function getNvidiaApiKey(): string {
  const key = cleanEnv("NVIDIA_API_KEY")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function getOpenRouterApiKey(): string {
  const key = cleanEnv("OPENROUTER_API_KEY")
  if (!key || key.startsWith("your_")) return ""
  return key
}

export function getNvidiaModel(): string {
  return cleanEnv("NVIDIA_MODEL") || "meta/llama-3.3-70b-instruct"
}

export function getOpenRouterModel(): string {
  return cleanEnv("OPENROUTER_MODEL") || "meta-llama/llama-3.3-70b-instruct"
}

export function sanitizeError(error: unknown): string {
  if (!error) return "Unknown error"
  let msg = error instanceof Error ? error.message : String(error)
  const nvidiaKey = getNvidiaApiKey()
  const openrouterKey = getOpenRouterApiKey()

  if (nvidiaKey && nvidiaKey.length > 5) {
    msg = msg.replaceAll(nvidiaKey, "[REDACTED_NVIDIA_KEY]")
  }
  if (openrouterKey && openrouterKey.length > 5) {
    msg = msg.replaceAll(openrouterKey, "[REDACTED_OPENROUTER_KEY]")
  }
  msg = msg.replace(/nvapi-[A-Za-z0-9_-]{30,}/g, "[REDACTED_KEY]")
  msg = msg.replace(/sk-or-[A-Za-z0-9_-]{30,}/g, "[REDACTED_KEY]")
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

function parseJsonText(rawText: string): any {
  let textToParse = rawText.trim()
  if (textToParse.startsWith("```json")) {
    textToParse = textToParse.replace(/^```json/, "").replace(/```$/, "").trim()
  } else if (textToParse.startsWith("```")) {
    textToParse = textToParse.replace(/^```/, "").replace(/```$/, "").trim()
  }
  return JSON.parse(textToParse)
}

function schemaToHint(schema: any): string {
  try {
    return JSON.stringify(schema, null, 1)
  } catch {
    return ""
  }
}

// -----------------------------------------------------------------------------
// 1. PRIMARY PROVIDER: NVIDIA
// -----------------------------------------------------------------------------

async function generateWithNvidia<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getNvidiaApiKey()
  const primaryModel = getNvidiaModel()

  console.log(`[AI] NVIDIA configured: ${Boolean(apiKey)}`)
  console.log(`[AI] NVIDIA model: ${primaryModel}`)

  if (!apiKey) {
    console.warn("[AI] NVIDIA failed: status=401, code=MISSING_KEY, message=NVIDIA_API_KEY is not configured")
    throw new Error("NVIDIA_API_KEY is not configured or invalid")
  }

  console.log("[AI] NVIDIA request started")

  const fallbackModels = [
    "meta/llama-3.1-70b-instruct",
    "mistralai/mistral-large-2-instruct",
    "deepseek-ai/deepseek-r1",
    "meta/llama-3.3-70b-instruct",
  ]
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]))

  let lastErr: unknown = null

  for (const modelName of modelsToTry) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000)

    try {
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

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
        throw new Error(`NVIDIA API returned HTTP ${res.status}: ${errText}`)
      }

      const json: any = await res.json()
      const rawText = (json?.choices?.[0]?.message?.content || "").trim()
      if (!rawText) {
        throw new Error(`Empty response from NVIDIA model ${modelName}`)
      }

      if (isJson) {
        const parsed = parseJsonText(rawText)
        const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
        console.log(`[AI] NVIDIA success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] NVIDIA success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
      console.warn(`[AI] NVIDIA ${modelName} failed: ${sanitizeError(err)}`)
      if (isAuthError(err)) break
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const details = extractErrorDetails(lastErr)
  console.warn(`[AI] NVIDIA failed: status=${details.status}, code=${details.code}`)
  throw new Error(`NVIDIA failed: ${details.message}`)
}

// -----------------------------------------------------------------------------
// 2. FALLBACK PROVIDER: OPENROUTER
// -----------------------------------------------------------------------------

async function generateWithOpenRouter<T = any>(
  options: AiRequestOptions<T>,
  isJson: boolean
): Promise<{ text: string; data?: T }> {
  const apiKey = getOpenRouterApiKey()
  const primaryModel = getOpenRouterModel()

  console.log(`[AI] OpenRouter configured: ${Boolean(apiKey)}`)
  console.log(`[AI] OpenRouter model: ${primaryModel}`)

  if (!apiKey) {
    console.error("[AI] OpenRouter failed: status=401, code=MISSING_KEY, message=OPENROUTER_API_KEY is not configured")
    throw new Error("OPENROUTER_API_KEY is not configured or invalid")
  }

  console.log("[AI] OpenRouter request started")

  const fallbackModels = [
    "meta-llama/llama-3.3-70b-instruct",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "deepseek/deepseek-r1:free",
  ]
  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]))

  let lastErr: unknown = null

  for (const modelName of modelsToTry) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000)

    try {
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

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://project-loop.app",
          "X-Title": "Project LOOP",
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(`OpenRouter API returned HTTP ${res.status}: ${errText}`)
      }

      const json: any = await res.json()
      const rawText = (json?.choices?.[0]?.message?.content || "").trim()
      if (!rawText) {
        throw new Error(`Empty response from OpenRouter model ${modelName}`)
      }

      if (isJson) {
        const parsed = parseJsonText(rawText)
        const validated = options.zSchema ? options.zSchema.parse(parsed) : (parsed as T)
        console.log(`[AI] OpenRouter success with model: ${modelName}`)
        return { text: rawText, data: validated }
      }

      console.log(`[AI] OpenRouter success with model: ${modelName}`)
      return { text: rawText }
    } catch (err: unknown) {
      lastErr = err
      console.warn(`[AI] OpenRouter ${modelName} failed: ${sanitizeError(err)}`)
      if (isAuthError(err)) break
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const details = extractErrorDetails(lastErr)
  console.error(`[AI] OpenRouter failed: status=${details.status}, code=${details.code}`)
  throw new Error(`OpenRouter failed: ${details.message}`)
}

// -----------------------------------------------------------------------------
// PUBLIC CENTRALIZED AI PROVIDER API
// -----------------------------------------------------------------------------

export async function generateText(options: AiRequestOptions): Promise<string> {
  let nvidiaErrStr = ""

  // 1. Try NVIDIA (Primary)
  try {
    const result = await generateWithNvidia(options, false)
    return result.text
  } catch (nvidiaError: unknown) {
    nvidiaErrStr = sanitizeError(nvidiaError)
    console.warn(`[AI] NVIDIA failed: ${nvidiaErrStr}`)
    console.log("[AI] Falling back to OpenRouter")
  }

  // 2. Try OpenRouter (Fallback)
  try {
    const result = await generateWithOpenRouter(options, false)
    return result.text
  } catch (openrouterError: unknown) {
    const openrouterErrStr = sanitizeError(openrouterError)
    console.error(`[AI] OpenRouter failed: ${openrouterErrStr}`)
    console.error("[AI] Both NVIDIA AND OpenRouter AI providers failed")
    throw new Error(`AI service is temporarily unavailable. (NVIDIA: ${nvidiaErrStr} | OpenRouter: ${openrouterErrStr})`)
  }
}

export async function generateJson<T = any>(options: AiRequestOptions<T>): Promise<T> {
  let nvidiaErrStr = ""

  // 1. Try NVIDIA (Primary)
  try {
    const result = await generateWithNvidia<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (nvidiaError: unknown) {
    nvidiaErrStr = sanitizeError(nvidiaError)
    console.warn(`[AI] NVIDIA failed: ${nvidiaErrStr}`)
    console.log("[AI] Falling back to OpenRouter")
  }

  // 2. Try OpenRouter (Fallback)
  try {
    const result = await generateWithOpenRouter<T>(options, true)
    if (result.data !== undefined) return result.data
  } catch (openrouterError: unknown) {
    const openrouterErrStr = sanitizeError(openrouterError)
    console.error(`[AI] OpenRouter failed: ${openrouterErrStr}`)
    console.error("[AI] Both NVIDIA AND OpenRouter AI providers failed")
    throw new Error(`AI service is temporarily unavailable. (NVIDIA: ${nvidiaErrStr} | OpenRouter: ${openrouterErrStr})`)
  }

  throw new Error(`AI service is temporarily unavailable. (NVIDIA: ${nvidiaErrStr} | OpenRouter: Unknown error)`)
}

export async function testAiDiagnostic(): Promise<{
  nvidia: { configured: boolean; success: boolean; status?: string; message?: string };
  openrouter: { configured: boolean; success: boolean; status?: string; message?: string };
}> {
  const nvidiaKey = getNvidiaApiKey()
  const nvidiaConfigured = Boolean(nvidiaKey)
  const openrouterKey = getOpenRouterApiKey()
  const openrouterConfigured = Boolean(openrouterKey)

  let nvidiaResult: { configured: boolean; success: boolean; status?: string; message?: string } = {
    configured: nvidiaConfigured,
    success: false,
  }

  if (nvidiaConfigured) {
    try {
      const res = await generateWithNvidia({
        prompt: "Respond with status ok",
        systemInstruction: "Respond with valid JSON only.",
        responseSchema: { type: "OBJECT", properties: { status: { type: "STRING" } } },
        zSchema: z.object({ status: z.string() }),
        temperature: 0.1,
        timeoutMs: 10000
      }, true)
      nvidiaResult.success = true
      nvidiaResult.message = res.data?.status || res.text || "NVIDIA operational"
    } catch (err: any) {
      const details = extractErrorDetails(err)
      nvidiaResult.success = false
      nvidiaResult.status = details.status
      nvidiaResult.message = details.message
    }
  } else {
    nvidiaResult.message = "NVIDIA_API_KEY is not configured"
  }

  let openrouterResult: { configured: boolean; success: boolean; status?: string; message?: string } = {
    configured: openrouterConfigured,
    success: false,
  }

  if (openrouterConfigured) {
    try {
      const res = await generateWithOpenRouter({
        prompt: "Respond with status ok",
        systemInstruction: "Respond with valid JSON only.",
        responseSchema: { type: "OBJECT", properties: { status: { type: "STRING" } } },
        zSchema: z.object({ status: z.string() }),
        temperature: 0.1,
        timeoutMs: 10000
      }, true)
      openrouterResult.success = true
      openrouterResult.message = res.data?.status || res.text || "OpenRouter operational"
    } catch (err: any) {
      const details = extractErrorDetails(err)
      openrouterResult.success = false
      openrouterResult.status = details.status
      openrouterResult.message = details.message
    }
  } else {
    openrouterResult.message = "OPENROUTER_API_KEY is not configured"
  }

  return { nvidia: nvidiaResult, openrouter: openrouterResult }
}
