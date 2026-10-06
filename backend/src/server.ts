import "dotenv/config"
import app from "./app.js"
import { validateEnv } from "./lib/env.js"
import { prisma } from "./lib/prisma.js"
import { getNvidiaApiKey, getOpenRouterApiKey, getNvidiaModel, getOpenRouterModel } from "./lib/ai-provider.js"

validateEnv()

const PORT = Number(process.env.PORT) || 5000

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Project LOOP Express Backend running on port ${PORT}`)
  console.log(`📡 CORS configured for origin: ${process.env.FRONTEND_URL || "https://project-loop-fu2f-two.vercel.app"}`)
  console.log(`[AI] NVIDIA_API_KEY configured: ${Boolean(getNvidiaApiKey())}`)
  console.log(`[AI] OPENROUTER_API_KEY configured: ${Boolean(getOpenRouterApiKey())}`)
  console.log(`[AI] NVIDIA_MODEL: ${getNvidiaModel()}`)
  console.log(`[AI] OPENROUTER_MODEL: ${getOpenRouterModel()}`)
})

// Graceful shutdown handling for always-on production service
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down server gracefully...`)
  server.close(async () => {
    try {
      await prisma.$disconnect()
      console.log("Database connection pool closed successfully.")
      process.exit(0)
    } catch (err) {
      console.error("Error during database disconnect:", err)
      process.exit(1)
    }
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
