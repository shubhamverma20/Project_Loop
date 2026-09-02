import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"

export interface AuthenticatedUser {
  id: string
  email: string
  workspaceId: string
  role: "ADMIN" | "ANALYST" | "VIEWER"
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : null)

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Session or token missing" })
    }

    const secret = process.env.AUTH_SECRET || "default_dev_secret_key_32_chars_long"
    const decoded = jwt.verify(token, secret) as AuthenticatedUser

    if (!decoded || !decoded.id || !decoded.workspaceId) {
      return res.status(401).json({ error: "Unauthorized: Invalid token payload" })
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, workspaceId: true, role: true }
    })

    if (!user || !user.workspaceId || !user.email) {
      return res.status(401).json({ error: "Unauthorized: User or workspace not found" })
    }

    req.user = {
      id: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      role: user.role
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Session expired or invalid" })
  }
}

export function requireRole(roles: Array<"ADMIN" | "ANALYST" | "VIEWER">) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient RBAC permissions" })
    }
    next()
  }
}
