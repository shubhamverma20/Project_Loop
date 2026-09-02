import { Router } from "express"
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.js"
import {
  getSettingsData,
  generateApiKey,
  updateWorkspaceName,
  updateProfile,
  changePassword,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember
} from "../services/settings.js"

const router = Router()

router.get("/settings", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, id: userId } = req.user!
    const result = await getSettingsData(workspaceId, userId)
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ data: result.data })
  } catch (err) {
    next(err)
  }
})

router.post("/settings/api-key", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, role } = req.user!
    const result = await generateApiKey(workspaceId, role)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/workspace", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, role } = req.user!
    const { name } = req.body
    const result = await updateWorkspaceName(workspaceId, name, role)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/profile", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id: userId } = req.user!
    const { name } = req.body
    const result = await updateProfile(userId, name)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/password", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id: userId } = req.user!
    const result = await changePassword(userId, req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/invite", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, role } = req.user!
    const result = await inviteTeamMember(workspaceId, role, req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/member-role", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, id: currentUserId, role: currentUserRole } = req.user!
    const { targetUserId, newRole } = req.body
    const result = await updateMemberRole(workspaceId, currentUserId, currentUserRole, targetUserId, newRole)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/settings/remove-member", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, id: currentUserId, role: currentUserRole } = req.user!
    const { targetUserId } = req.body
    const result = await removeTeamMember(workspaceId, currentUserId, currentUserRole, targetUserId)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

export default router
