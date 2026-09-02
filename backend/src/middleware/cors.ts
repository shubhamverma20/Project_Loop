import cors from "cors"

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
const allowedOrigins = frontendUrl.split(",").map(url => url.trim())

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile/curl), localhost, vercel deployments, or listed FRONTEND_URL
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes("vercel.app") ||
      origin.includes("localhost") ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
})
