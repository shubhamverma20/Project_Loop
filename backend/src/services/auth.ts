import { prisma } from "../lib/prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  workspaceName: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
})

export function generateToken(user: { id: string; email: string; workspaceId: string; role: string }) {
  const secret = process.env.AUTH_SECRET || "default_dev_secret_key_32_chars_long"
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      role: user.role
    },
    secret,
    { expiresIn: "7d" }
  )
}

export async function registerUser(body: unknown) {
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid registration payload" }
  }

  const { name, email, password, workspaceName } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (existingUser) {
    return { success: false, error: "An account with this email address already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const rawApiKey = "loop_sk_" + crypto.randomBytes(32).toString("hex")
  const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex")

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName || `${name}'s Workspace`,
      apiKey: rawApiKey,
      apiKeyHash: apiKeyHash
    }
  })

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "ADMIN",
      workspaceId: workspace.id
    }
  })

  const token = generateToken({
    id: user.id,
    email: user.email!,
    workspaceId: workspace.id,
    role: user.role
  })

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: workspace.id
    }
  }
}

export async function loginUser(body: unknown) {
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid login payload" }
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { workspace: true }
  })

  if (!user || !user.passwordHash || !user.workspaceId) {
    return { success: false, error: "Invalid email or password" }
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    return { success: false, error: "Invalid email or password" }
  }

  const token = generateToken({
    id: user.id,
    email: user.email!,
    workspaceId: user.workspaceId,
    role: user.role
  })

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId
    }
  }
}

export async function googleAuthUser(payload: { email: string; name?: string; image?: string }) {
  const { email, name, image } = payload
  if (!email) {
    return { success: false, error: "Email is required for Google authentication" }
  }

  const normalizedEmail = email.toLowerCase().trim()
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (!user) {
    // Create new workspace and user for Google OAuth login
    const rawApiKey = "loop_sk_" + crypto.randomBytes(32).toString("hex")
    const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex")

    const workspace = await prisma.workspace.create({
      data: {
        name: `${name || email.split("@")[0]}'s Workspace`,
        apiKey: rawApiKey,
        apiKeyHash: apiKeyHash
      }
    })

    user = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email: normalizedEmail,
        image: image || null,
        role: "ADMIN",
        workspaceId: workspace.id
      }
    })
  } else if (!user.workspaceId) {
    // Attach workspace if missing
    const rawApiKey = "loop_sk_" + crypto.randomBytes(32).toString("hex")
    const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex")

    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name || email.split("@")[0]}'s Workspace`,
        apiKey: rawApiKey,
        apiKeyHash: apiKeyHash
      }
    })

    user = await prisma.user.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id, role: "ADMIN" }
    })
  }

  const token = generateToken({
    id: user.id,
    email: user.email!,
    workspaceId: user.workspaceId!,
    role: user.role
  })

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId
    }
  }
}

