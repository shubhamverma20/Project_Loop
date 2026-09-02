import cors from "cors"

const frontendUrl = process.env.FRONTEND_URL || "https://project-loop-fu2f-two.vercel.app,http://localhost:3000"
const allowedOrigins = frontendUrl.split(",").map(url => url.trim())

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile/curl), localhost, explicit FRONTEND_URL or vercel.app production domain
    if (!origin) {
      return callback(null, true)
    }

    const isAllowed = allowedOrigins.some(allowed => origin === allowed || allowed === "*") ||
      origin === "https://project-loop-fu2f-two.vercel.app" ||
      origin === "http://localhost:3000" ||
      (origin.startsWith("https://project-loop-") && origin.endsWith(".vercel.app"))

    if (isAllowed) {
      callback(null, true)
    } else {
      callback(new Error(`CORS policy violation: Origin ${origin} is not allowed.`))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
})
