import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("❌ Invalid backend environment variables:", result.error.flatten().fieldErrors)
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required backend environment variables for production startup")
    }
  }
  return result.data || process.env
}

export const env = validateEnv()
