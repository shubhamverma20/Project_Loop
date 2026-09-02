import { prisma } from "../lib/prisma.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendInviteEmail } from "../lib/brevo.js"
import { z } from "zod"

export async function getSettingsData(workspaceId: string, userId: string) {
  try {
    const [workspace, currentUser, members] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, apiKey: true, apiKeyHash: true, createdAt: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, passwordHash: true }
      }),
      prisma.user.findMany({
        where: { workspaceId },
        select: { id: true, name: true, email: true, role: true, image: true },
        orderBy: { email: "asc" }
      })
    ])

    if (!workspace || !currentUser) {
      return { error: "Workspace or user profile not found", data: null }
    }

    return {
      error: null,
      data: {
        workspace,
        currentUser: {
          ...currentUser,
          hasPassword: Boolean(currentUser.passwordHash)
        },
        members
      }
    }
  } catch (err: unknown) {
    console.error("Failed to fetch settings:", err)
    return { error: "Failed to load settings data", data: null }
  }
}

export async function generateApiKey(workspaceId: string, userRole: string) {
  if (userRole !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can generate API keys", success: false, apiKey: null }
  }

  try {
    const rawApiKey = "loop_sk_" + crypto.randomBytes(32).toString("hex")
    const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex")

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        apiKeyHash,
        apiKey: rawApiKey
      }
    })

    return { success: true, error: null, apiKey: rawApiKey }
  } catch (err) {
    console.error("Generate API key error:", err)
    return { error: "Failed to generate API key", success: false, apiKey: null }
  }
}

export async function updateWorkspaceName(workspaceId: string, name: string, userRole: string) {
  if (userRole !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can update workspace settings", success: false }
  }

  if (!name || name.trim().length < 2) {
    return { error: "Workspace name must be at least 2 characters", success: false }
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name.trim() }
    })
    return { success: true, error: null, message: "Workspace name updated successfully" }
  } catch (err) {
    console.error("Update workspace error:", err)
    return { error: "Failed to update workspace name", success: false }
  }
}

export async function updateProfile(userId: string, name: string) {
  if (!name || name.trim().length < 2) {
    return { error: "Name must be at least 2 characters", success: false }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() }
    })
    return { success: true, error: null, message: "Profile updated successfully" }
  } catch (err) {
    console.error("Update profile error:", err)
    return { error: "Failed to update profile", success: false }
  }
}

export async function changePassword(userId: string, payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  if (payload.newPassword !== payload.confirmPassword) {
    return { error: "New passwords do not match", success: false }
  }

  if (!payload.newPassword || payload.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters", success: false }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true }
  })

  if (!user) return { error: "User not found", success: false }

  if (user.passwordHash) {
    if (!payload.currentPassword) {
      return { error: "Current password is required", success: false }
    }
    const isValid = await bcrypt.compare(payload.currentPassword, user.passwordHash)
    if (!isValid) {
      return { error: "Current password is incorrect", success: false }
    }
  }

  try {
    const newHash = await bcrypt.hash(payload.newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    })
    return { success: true, error: null, message: "Password changed successfully" }
  } catch (err) {
    console.error("Change password error:", err)
    return { error: "Failed to update password", success: false }
  }
}

export async function inviteTeamMember(workspaceId: string, userRole: string, payload: { email: string; name?: string; role: "ADMIN" | "ANALYST" | "VIEWER" }) {
  if (userRole !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can invite team members", success: false }
  }

  const email = payload.email.toLowerCase().trim()
  const role = payload.role || "VIEWER"

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true }
    })

    const tempPassword = crypto.randomBytes(16).toString("hex")

    if (existingUser) {
      if (existingUser.workspaceId === workspaceId) {
        return { error: "This user is already a member of your workspace", success: false }
      }
      if (existingUser.workspaceId) {
        return { error: "User already belongs to another workspace", success: false }
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { workspaceId, role }
      })
    } else {
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      await prisma.user.create({
        data: {
          email,
          name: payload.name || email.split("@")[0],
          role,
          workspaceId,
          passwordHash
        }
      })
    }

    await sendInviteEmail(email, tempPassword, workspace?.name || "Project Loop Workspace", role)
    return { success: true, error: null, message: `Successfully added ${email} to workspace as ${role}` }
  } catch (err) {
    console.error("Invite member error:", err)
    return { error: "Failed to invite team member", success: false }
  }
}

export async function updateMemberRole(workspaceId: string, currentUserId: string, currentUserRole: string, targetUserId: string, newRole: "ADMIN" | "ANALYST" | "VIEWER") {
  if (currentUserRole !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can manage member roles", success: false }
  }

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId }
    })

    if (!targetUser) {
      return { error: "Team member not found in this workspace", success: false }
    }

    if (targetUserId === currentUserId && newRole !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { workspaceId, role: "ADMIN" }
      })
      if (adminCount <= 1) {
        return { error: "Cannot demote yourself: You are the sole ADMIN of this workspace", success: false }
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole }
    })

    return { success: true, error: null, message: "Member role updated successfully" }
  } catch (err) {
    console.error("Update member role error:", err)
    return { error: "Failed to update member role", success: false }
  }
}

export async function removeTeamMember(workspaceId: string, currentUserId: string, currentUserRole: string, targetUserId: string) {
  if (currentUserRole !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can remove team members", success: false }
  }

  if (targetUserId === currentUserId) {
    return { error: "You cannot remove yourself from the workspace", success: false }
  }

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId }
    })

    if (!targetUser) {
      return { error: "Team member not found in this workspace", success: false }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { workspaceId: null, role: "VIEWER" }
    })

    return { success: true, error: null, message: "Team member removed from workspace" }
  } catch (err) {
    console.error("Remove team member error:", err)
    return { error: "Failed to remove team member", success: false }
  }
}
