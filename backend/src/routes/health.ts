import { Router } from "express"
import { testAiDiagnostic } from "../lib/ai-provider.js"

const router = Router()

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

router.get("/health/ai", async (req, res) => {
  try {
    const diag = await testAiDiagnostic()
    res.status(200).json({
      status: "ok",
      ...diag
    })
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message || "Failed to run AI diagnostic" })
  }
})

export default router
