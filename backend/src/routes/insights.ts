import { Router } from "express"
import { requireAuth, AuthRequest } from "../middleware/auth.js"
import { generateInsightsReport } from "../services/insights.js"
import { DateRange } from "../services/analytics.js"

const router = Router()

router.get("/insights", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const range = (req.query.range as DateRange) || "30d"
    const customStart = req.query.customStart as string | undefined
    const customEnd = req.query.customEnd as string | undefined

    const result = await generateInsightsReport(workspaceId, range, customStart, customEnd)
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    return res.status(200).json(result.data)
  } catch (err) {
    next(err)
  }
})

export default router
