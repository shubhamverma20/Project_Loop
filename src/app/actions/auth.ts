"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name is required"),
})

export async function registerUser(prevState: unknown, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries())
    const parsed = registerSchema.safeParse(data)

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message || "Validation error",
        success: false
      }
    }

    const { name, email, password, companyName } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return {
        error: "A user with this email already exists",
        success: false
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Run within a transaction to ensure both workspace and user are created or neither
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: companyName,
        }
      })

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.ADMIN,
          workspaceId: workspace.id
        }
      })
    })

    return {
      success: true,
      message: "Registration successful. You can now log in."
    }
  } catch (error) {
    console.error("Registration error:", error)
    return {
      error: "Something went wrong during registration",
      success: false
    }
  }
}
