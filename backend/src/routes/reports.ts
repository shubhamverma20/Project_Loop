import { Router } from "express"
import { requireAuth, AuthRequest } from "../middleware/auth.js"
import { getReportsList, createNewReport } from "../services/reports.js"
import { DateRange } from "../services/analytics.js"

const router = Router()

router.get("/reports", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const result = await getReportsList(workspaceId)
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ data: result.data })
  } catch (err) {
    next(err)
  }
})

router.post("/reports/generate", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const { range } = req.body
    const result = await createNewReport(workspaceId, (range as DateRange) || "30d")
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(201).json(result.data)
  } catch (err) {
    next(err)
  }
})

export default router
