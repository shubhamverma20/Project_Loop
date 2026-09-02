import app from "./app.js"
import { validateEnv } from "./lib/env.js"

validateEnv()

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Project LOOP Express Backend running on port ${PORT}`)
  console.log(`📡 CORS configured for origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
})
