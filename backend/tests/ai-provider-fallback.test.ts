import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { generateJson, generateText, sanitizeError, testAiDiagnostic } from "../src/lib/ai-provider.js"
import { z } from "zod"

describe("Centralized AI Provider Fallback System (NVIDIA Primary & OpenRouter Fallback)", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("TEST 0: should sanitize API keys from error messages", () => {
    process.env.NVIDIA_API_KEY = "nvapi-TestNvidiaSecretKey12345678901234567890"
    process.env.OPENROUTER_API_KEY = "sk-or-TestOpenRouterSecretKey12345678901234567890"

    const rawError = new Error(
      `Failed with key nvapi-TestNvidiaSecretKey12345678901234567890 and openrouter sk-or-TestOpenRouterSecretKey12345678901234567890`
    )
    const sanitized = sanitizeError(rawError)

    expect(sanitized).not.toContain("nvapi-TestNvidiaSecretKey12345678901234567890")
    expect(sanitized).not.toContain("sk-or-TestOpenRouterSecretKey12345678901234567890")
    expect(sanitized).toContain("[REDACTED_NVIDIA_KEY]")
    expect(sanitized).toContain("[REDACTED_OPENROUTER_KEY]")
  })

  it("TEST 1: NVIDIA succeeds -> OpenRouter NOT called", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-mock-nvidia-key"
    process.env.OPENROUTER_API_KEY = "sk-or-mock-openrouter-key"

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("nvidia.com")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [{ message: { content: "NVIDIA text response" } }]
          }),
          json: async () => ({
            choices: [{ message: { content: "NVIDIA text response" } }]
          }),
        } as any
      }
      return {
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => "Internal error",
        json: async () => ({ error: "Internal error" })
      } as any
    })
    global.fetch = fetchSpy

    const result = await generateText({ prompt: "Hello" })
    expect(result).toBe("NVIDIA text response")
    expect(fetchSpy).toHaveBeenCalled()
    const calledUrls = fetchSpy.mock.calls.map(call => String(call[0]))
    expect(calledUrls.some(u => u.includes("openrouter.ai"))).toBe(false)
  })

  it("TEST 2: NVIDIA 429 / failure -> OpenRouter called -> report generated", async () => {
    process.env.NVIDIA_API_KEY = "invalid_nvidia_key"
    process.env.OPENROUTER_API_KEY = "sk-or-valid-openrouter-key"

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("openrouter.ai")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ summary: "Generated via OpenRouter", status: "OK" }),
                },
              },
            ],
          }),
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({ summary: "Generated via OpenRouter", status: "OK" }),
                },
              },
            ],
          }),
        } as any
      }
      return {
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => "Rate limited",
        json: async () => ({ error: "Rate limited" })
      } as any
    })
    global.fetch = fetchSpy

    const result = await generateJson({
      prompt: "Summarize feedback",
      zSchema: z.object({ summary: z.string(), status: z.string() }),
    })

    expect(fetchSpy).toHaveBeenCalled()
    expect(result).toEqual({ summary: "Generated via OpenRouter", status: "OK" })
  })

  it("TEST 3 & 4 & 5: NVIDIA 401/403/5xx/timeout -> OpenRouter called -> text response", async () => {
    process.env.NVIDIA_API_KEY = "invalid_nvidia_key_401"
    process.env.OPENROUTER_API_KEY = "sk-or-valid-openrouter-key"

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("openrouter.ai")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [{ message: { content: "OpenRouter text response" } }],
          }),
          json: async () => ({
            choices: [{ message: { content: "OpenRouter text response" } }],
          }),
        } as any
      }
      return {
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => "Unauthorized",
        json: async () => ({ error: "Unauthorized" })
      } as any
    })

    const text = await generateText({ prompt: "Test prompt" })
    expect(text).toBe("OpenRouter text response")
  })

  it("TEST 6: NVIDIA fails + OpenRouter succeeds -> Generate Report works", async () => {
    process.env.NVIDIA_API_KEY = "invalid"
    process.env.OPENROUTER_API_KEY = "valid"

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("openrouter.ai")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ executiveSummary: "VoC Report Success via OpenRouter" }) } }],
          }),
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({ executiveSummary: "VoC Report Success via OpenRouter" }) } }],
          }),
        } as any
      }
      return {
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => "Internal Error",
        json: async () => ({ error: "Internal Error" })
      } as any
    })

    const res = await generateJson({ prompt: "Report generation" })
    expect(res).toEqual({ executiveSummary: "VoC Report Success via OpenRouter" })
  })

  it("TEST 7: NVIDIA fails + OpenRouter fails -> proper final error", async () => {
    process.env.NVIDIA_API_KEY = "invalid_nvidia_key"
    process.env.OPENROUTER_API_KEY = "invalid_openrouter_key"

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => "Unauthorized OpenRouter Key",
        json: async () => ({ error: "Unauthorized OpenRouter Key" })
      } as any
    })

    await expect(
      generateText({ prompt: "Hello AI" })
    ).rejects.toThrow(/AI service is temporarily unavailable/)
  })

  it("TEST 8: NVIDIA HTTP 404 failure ('Not found for account') -> OpenRouter fallback succeeds", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-mock-nvidia-key-404"
    process.env.OPENROUTER_API_KEY = "sk-or-valid-openrouter-key"

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("nvidia.com")) {
        return {
          ok: false,
          status: 404,
          headers: new Headers(),
          text: async () => JSON.stringify({ status: 404, title: "Not Found", detail: "Function 'xyz': Not found for account '516mK49188a9CeL52eiImqAj9iNbZOLPEJZJi051F1M'" }),
          json: async () => ({ status: 404, title: "Not Found", detail: "Function 'xyz': Not found for account '516mK49188a9CeL52eiImqAj9iNbZOLPEJZJi051F1M'" })
        } as any
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({
          choices: [{ message: { content: "OpenRouter fallback text after NVIDIA 404" } }]
        }),
        json: async () => ({
          choices: [{ message: { content: "OpenRouter fallback text after NVIDIA 404" } }]
        })
      } as any
    })
    global.fetch = fetchSpy

    const text = await generateText({ prompt: "Test NVIDIA 404 fallback" })
    expect(text).toBe("OpenRouter fallback text after NVIDIA 404")
  })

  it("TEST 9: testAiDiagnostic reports provider configured status, success/failure, and safe error message", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-mock-nvidia-key-404"
    process.env.OPENROUTER_API_KEY = "sk-or-valid-openrouter-key"

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("nvidia.com")) {
        return {
          ok: false,
          status: 404,
          headers: new Headers(),
          text: async () => "NVIDIA 404 Not Found",
          json: async () => ({ error: "NVIDIA 404 Not Found" })
        } as any
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ status: "ok" }) } }]
        }),
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ status: "ok" }) } }]
        })
      } as any
    })

    const diag = await testAiDiagnostic()
    expect(diag.nvidia.configured).toBe(true)
    expect(diag.nvidia.success).toBe(false)
    expect(diag.nvidia.status).toBe("404")
    expect(diag.nvidia.message).toContain("NVIDIA 404")

    expect(diag.openrouter.configured).toBe(true)
    expect(diag.openrouter.success).toBe(true)
    expect(diag.openrouter.message).toBe("ok")
  })
})
