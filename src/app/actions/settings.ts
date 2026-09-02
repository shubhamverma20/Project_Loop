"use server"

import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function getSettingsData() {
  const session = await verifySession()
  if (!session?.user?.workspaceId || !session?.user?.id) {
    return { error: "Unauthorized: Session missing", data: null }
  }

  const { workspaceId, id: userId } = session.user

  try {
    const [workspace, currentUser, members] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, apiKey: true, createdAt: true }
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

const workspaceNameSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters").max(60, "Workspace name is too long")
})

export async function updateWorkspaceName(name: string) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) return { error: "Unauthorized", success: false }

  if (session.user.role !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can update workspace settings", success: false }
  }

  const parsed = workspaceNameSchema.safeParse({ name })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid workspace name", success: false }
  }

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: { name: parsed.data.name }
    })
    revalidatePath("/settings")
    return { success: true, error: null, message: "Workspace name updated successfully" }
  } catch (err) {
    console.error("Update workspace error:", err)
    return { error: "Failed to update workspace name", success: false }
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long")
})

export async function updateProfile(name: string) {
  const session = await verifySession()
  if (!session?.user?.id) return { error: "Unauthorized", success: false }

  const parsed = profileSchema.safeParse({ name })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid name", success: false }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name }
    })
    revalidatePath("/settings")
    return { success: true, error: null, message: "Profile updated successfully" }
  } catch (err) {
    console.error("Update profile error:", err)
    return { error: "Failed to update profile", success: false }
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100, "Password too long"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"]
})

export async function changePassword(payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  const session = await verifySession()
  if (!session?.user?.id) return { error: "Unauthorized", success: false }

  const parsed = changePasswordSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid password payload", success: false }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash }
    })
    revalidatePath("/settings")
    return { success: true, error: null, message: "Password changed successfully" }
  } catch (err) {
    console.error("Change password error:", err)
    return { error: "Failed to update password", success: false }
  }
}

const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  name: z.string().trim().optional(),
  role: z.nativeEnum(Role)
})

export async function inviteTeamMember(payload: { email: string; name?: string; role: Role }) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) return { error: "Unauthorized", success: false }

  if (session.user.role !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can invite team members", success: false }
  }

  const parsed = inviteMemberSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid invitation details", success: false }
  }

  const { email, name, role } = parsed.data
  const workspaceId = session.user.workspaceId

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      if (existingUser.workspaceId === workspaceId) {
        return { error: "This user is already a member of your workspace", success: false }
      }
      if (existingUser.workspaceId) {
        return { error: "User already belongs to another workspace", success: false }
      }

      // Attach unassigned user to workspace
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { workspaceId, role }
      })
    } else {
      // Create new user record for invited team member
      const tempPassword = crypto.randomBytes(16).toString("hex")
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          role,
          workspaceId,
          passwordHash
        }
      })
    }

    revalidatePath("/settings")
    return { success: true, error: null, message: `Successfully added ${email} to workspace as ${role}` }
  } catch (err) {
    console.error("Invite member error:", err)
    return { error: "Failed to invite team member", success: false }
  }
}

export async function updateMemberRole(targetUserId: string, newRole: Role) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) return { error: "Unauthorized", success: false }

  if (session.user.role !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can manage member roles", success: false }
  }

  if (!Object.values(Role).includes(newRole)) {
    return { error: "Invalid role specified", success: false }
  }

  const workspaceId = session.user.workspaceId

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId }
    })

    if (!targetUser) {
      return { error: "Team member not found in this workspace", success: false }
    }

    // Demotion check: if self-demoting, ensure at least one other ADMIN exists
    if (targetUserId === session.user.id && newRole !== Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { workspaceId, role: Role.ADMIN }
      })
      if (adminCount <= 1) {
        return { error: "Cannot demote yourself: You are the sole ADMIN of this workspace", success: false }
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole }
    })

    revalidatePath("/settings")
    return { success: true, error: null, message: "Member role updated successfully" }
  } catch (err) {
    console.error("Update member role error:", err)
    return { error: "Failed to update member role", success: false }
  }
}

export async function removeTeamMember(targetUserId: string) {
  const session = await verifySession()
  if (!session?.user?.workspaceId) return { error: "Unauthorized", success: false }

  if (session.user.role !== "ADMIN") {
    return { error: "Forbidden: Only workspace admins can remove team members", success: false }
  }

  if (targetUserId === session.user.id) {
    return { error: "You cannot remove yourself from the workspace", success: false }
  }

  const workspaceId = session.user.workspaceId

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId }
    })

    if (!targetUser) {
      return { error: "Team member not found in this workspace", success: false }
    }

    // Disassociate user from workspace
    await prisma.user.update({
      where: { id: targetUserId },
      data: { workspaceId: null, role: Role.VIEWER }
    })

    revalidatePath("/settings")
    return { success: true, error: null, message: "Team member removed from workspace" }
  } catch (err) {
    console.error("Remove team member error:", err)
    return { error: "Failed to remove team member", success: false }
  }
}
