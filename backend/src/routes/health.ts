import { Router } from "express"

const router = Router()

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

router.get("/health/ai", (req, res) => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim()
  const isConfigured = Boolean(apiKey && !apiKey.startsWith("your_"))
  const isStandardFormat = apiKey.startsWith("AIzaSy")

  res.status(200).json({
    status: "ok",
    apiKeyConfigured: isConfigured ? "YES" : "NO",
    geminiClientInitialized: isConfigured ? "YES" : "NO",
    keyFormatValid: isStandardFormat ? "YES" : "NO",
    instructions: isStandardFormat 
      ? "Gemini API key is configured with standard format." 
      : "Invalid key format detected. Please generate a valid Gemini API Key starting with 'AIzaSy...' from https://aistudio.google.com and set GEMINI_API_KEY in backend/.env."
  })
})

export default router
