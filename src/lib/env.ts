import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  GEMINI_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors)
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variables for production startup")
    }
  }
  return result.data
}

export const env = validateEnv()
