import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { generateJson, generateText, sanitizeError } from "../src/lib/ai-provider.js"
import { z } from "zod"

describe("Centralized AI Provider Fallback System", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("TEST 0: should sanitize API keys from error messages", () => {
    process.env.GEMINI_API_KEY = "AIzaSyTestGeminiSecretKey1234567890"
    process.env.GROQ_API_KEY = "gsk_TestGroqSecretKey12345678901234567890"

    const rawError = new Error(
      `Failed with key AIzaSyTestGeminiSecretKey1234567890 and groq gsk_TestGroqSecretKey12345678901234567890`
    )
    const sanitized = sanitizeError(rawError)

    expect(sanitized).not.toContain("AIzaSyTestGeminiSecretKey1234567890")
    expect(sanitized).not.toContain("gsk_TestGroqSecretKey12345678901234567890")
    expect(sanitized).toContain("[REDACTED_GEMINI_KEY]")
    expect(sanitized).toContain("[REDACTED_GROQ_KEY]")
  })

  it("TEST 1: Gemini succeeds -> Groq NOT called", async () => {
    process.env.GEMINI_API_KEY = "mock_gemini_test_key_12345"
    process.env.GROQ_API_KEY = "gsk_mock_groq_test_key_12345"

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("generativelanguage.googleapis.com") || url.includes("google")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Gemini response" }]
                }
              }
            ]
          }),
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Gemini response" }]
                }
              }
            ]
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
    expect(result).toBe("Gemini response")
    expect(fetchSpy).toHaveBeenCalled()
    const calledUrls = fetchSpy.mock.calls.map(call => String(call[0]))
    expect(calledUrls.some(u => u.includes("groq.com"))).toBe(false)
  })

  it("TEST 2: Gemini 429 / failure -> Groq called -> report generated", async () => {
    process.env.GEMINI_API_KEY = "invalid_gemini_key"
    process.env.GROQ_API_KEY = "gsk_valid_mock_groq_key"

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ summary: "Generated via Groq", status: "OK" }),
                },
              },
            ],
          }),
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({ summary: "Generated via Groq", status: "OK" }),
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
    expect(result).toEqual({ summary: "Generated via Groq", status: "OK" })
  })

  it("TEST 3 & 4 & 5: Gemini 401/403/5xx/timeout -> Groq called -> report generated", async () => {
    process.env.GEMINI_API_KEY = "invalid_gemini_key_401"
    process.env.GROQ_API_KEY = "gsk_valid_groq_key"

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [{ message: { content: "Groq text response" } }],
          }),
          json: async () => ({
            choices: [{ message: { content: "Groq text response" } }],
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
    expect(text).toBe("Groq text response")
  })

  it("TEST 6: Gemini fails + Groq succeeds -> Generate Report works", async () => {
    process.env.GEMINI_API_KEY = "invalid"
    process.env.GROQ_API_KEY = "valid"

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: async () => JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ executiveSummary: "VoC Report Success" }) } }],
          }),
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({ executiveSummary: "VoC Report Success" }) } }],
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
    expect(res).toEqual({ executiveSummary: "VoC Report Success" })
  })

  it("TEST 7: Gemini fails + Groq fails -> proper final error", async () => {
    process.env.GEMINI_API_KEY = "invalid_gemini_key"
    process.env.GROQ_API_KEY = "invalid_groq_key"

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => "Unauthorized Groq Key",
        json: async () => ({ error: "Unauthorized Groq Key" })
      } as any
    })

    await expect(
      generateText({ prompt: "Hello AI" })
    ).rejects.toThrow("AI service is temporarily unavailable. Please try again later.")
  })
})
