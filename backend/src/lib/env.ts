import { z } from "zod"
import dotenv from "dotenv"
import path from "path"
import fs from "fs"

const envPath = fs.existsSync(path.resolve(process.cwd(), ".env"))
  ? path.resolve(process.cwd(), ".env")
  : path.resolve(process.cwd(), "backend/.env")

dotenv.config({ path: envPath })
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || "default_dev_secret_key_32_chars_long"
}

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || ""
  const appUrl = process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || "http://localhost:3000"
  return { clientId, clientSecret, appUrl }
}

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

