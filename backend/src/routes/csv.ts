import { Router } from "express"
import { requireAuth, AuthRequest } from "../middleware/auth.js"
import { processCsvUpload } from "../services/csv.js"

const router = Router()

router.post("/csv", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId
    const { rows, type } = req.body

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: "Invalid CSV payload: 'rows' array is required" })
    }

    const result = await processCsvUpload(rows, workspaceId, type)
    if (!result.success) {
      return res.status(400).json({ error: result.error, detectedHeaders: result.detectedHeaders })
    }

    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

export default router
