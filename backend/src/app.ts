import express from "express"
import cookieParser from "cookie-parser"
import { corsMiddleware } from "./middleware/cors.js"
import { errorHandler } from "./middleware/error-handler.js"

import healthRouter from "./routes/health.js"
import authRouter from "./routes/auth.js"
import feedbackRouter from "./routes/feedback.js"
import csvRouter from "./routes/csv.js"
import analyticsRouter from "./routes/analytics.js"
import insightsRouter from "./routes/insights.js"
import reportsRouter from "./routes/reports.js"
import settingsRouter from "./routes/settings.js"

const app = express()

app.use(corsMiddleware)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Mount Routes
app.use("/", healthRouter)
app.use("/api/auth", authRouter)
app.use("/api", feedbackRouter)
app.use("/api", csvRouter)
app.use("/api", analyticsRouter)
app.use("/api", insightsRouter)
app.use("/api", reportsRouter)
app.use("/api", settingsRouter)

// Error Handler
app.use(errorHandler)

export default app
