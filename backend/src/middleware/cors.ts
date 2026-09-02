import cors from "cors"

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
const allowedOrigins = frontendUrl.split(",").map(url => url.trim())

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl or postman) or matching FRONTEND_URL or dev environment
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true)
    } else {
      callback(new Error(`CORS Error: Origin ${origin} not allowed by CORS security policy`))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
})

