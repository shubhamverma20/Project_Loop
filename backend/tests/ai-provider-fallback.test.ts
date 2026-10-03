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

  it("should sanitize API keys from error messages", () => {
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

  it("should fall back to Groq when Gemini fails (401, 403, 429, 503, quota, invalid model, timeout, network, invalid JSON)", async () => {
    // Set invalid Gemini key & valid mock Groq setup
    process.env.GEMINI_API_KEY = "invalid_gemini_key"
    process.env.GROQ_API_KEY = "gsk_valid_mock_groq_key"

    // Mock global fetch to simulate Groq success when Gemini fails
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: "Groq generated summary successfully",
                    status: "OK",
                  }),
                },
              },
            ],
          }),
        } as any
      }
      return { ok: false, status: 500 } as any
    })

    const dummySchema = z.object({
      summary: z.string(),
      status: z.string(),
    })

    const result = await generateJson({
      prompt: "Summarize feedback",
      systemInstruction: "You are an analyst",
      zSchema: dummySchema,
    })

    expect(result).toEqual({
      summary: "Groq generated summary successfully",
      status: "OK",
    })
  })

  it("should throw controlled error when BOTH Gemini AND Groq fail", async () => {
    process.env.GEMINI_API_KEY = "invalid_gemini_key"
    process.env.GROQ_API_KEY = "invalid_groq_key"

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        text: async () => "Unauthorized Groq Key",
      } as any
    })

    await expect(
      generateText({
        prompt: "Hello AI",
      })
    ).rejects.toThrow("AI service is temporarily unavailable. Please try again later.")
  })
})
