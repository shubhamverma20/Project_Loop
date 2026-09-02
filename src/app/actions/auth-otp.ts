"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendOtpEmail } from "@/lib/email"
import { subMinutes } from "date-fns"

const RequestOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
})

export type FormState = {
  success?: boolean
  error?: string
}

function generateSecureOtp(): string {
  // Generate a random number between 0 and 999999 securely
  const num = crypto.randomInt(0, 1000000)
  return num.toString().padStart(6, "0")
}

export async function requestPasswordResetOtp(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const email = formData.get("email") as string
    
    const validatedFields = RequestOtpSchema.safeParse({ email })
    if (!validatedFields.success) {
      return { error: validatedFields.error.issues[0].message }
    }

    const normalizedEmail = email.toLowerCase()

    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Don't leak that the user doesn't exist for security reasons, just pretend it worked
      // Or return generic error if you prefer. We will return generic success.
      return { success: true } 
    }

    // 2. Rate Limiting: Prevent spamming (e.g. only 1 request per minute)
    const oneMinuteAgo = subMinutes(new Date(), 1)
    const recentRequest = await prisma.otpVerification.findFirst({
      where: {
        email: normalizedEmail,
        purpose: "PASSWORD_RESET",
        createdAt: { gte: oneMinuteAgo }
      }
    })

    if (recentRequest) {
      return { error: "Please wait before requesting another OTP." }
    }

    // 3. Generate OTP and Hash
    const otp = generateSecureOtp()
    const otpHash = await bcrypt.hash(otp, 10)

    // 4. Invalidate old active OTPs for this purpose
    await prisma.otpVerification.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "PASSWORD_RESET"
      }
    })

    // 5. Save new OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.otpVerification.create({
      data: {
        email: normalizedEmail,
        otpHash,
        purpose: "PASSWORD_RESET",
        expiresAt,
        attempts: 0
      }
    })

    // 6. Send Email via Brevo
    const emailSent = await sendOtpEmail(normalizedEmail, otp)

    if (!emailSent) {
      // Rollback or notify failure
      return { error: "Failed to send email. Please check configuration." }
    }

    return { success: true }
  } catch (error) {
    console.error("OTP Request Error:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function verifyAndResetPassword(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const email = formData.get("email") as string
    const otp = formData.get("otp") as string
    const newPassword = formData.get("newPassword") as string

    const validatedFields = VerifyOtpSchema.safeParse({ email, otp, newPassword })
    
    if (!validatedFields.success) {
      return { error: validatedFields.error.issues[0].message }
    }

    const normalizedEmail = email.toLowerCase()

    // 1. Fetch the active OTP record
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email: normalizedEmail,
        purpose: "PASSWORD_RESET"
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    if (!otpRecord) {
      return { error: "No active OTP found. Please request a new one." }
    }

    // 2. Check if expired
    if (otpRecord.expiresAt < new Date()) {
      return { error: "OTP has expired. Please request a new one." }
    }

    // 3. Check attempt limit (max 5)
    if (otpRecord.attempts >= 5) {
      // Delete the record to force a new request
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } })
      return { error: "Too many failed attempts. Please request a new OTP." }
    }

    // 4. Verify OTP using bcrypt
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash)

    if (!isValid) {
      // Increment attempt counter
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      })
      return { error: "Invalid OTP." }
    }

    // 5. OTP is valid! Hash the new password.
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // 6. Update user password
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash: newPasswordHash }
    })

    // 7. Delete the OTP record (mark as used)
    await prisma.otpVerification.delete({ where: { id: otpRecord.id } })

    return { success: true }
  } catch (error) {
    console.error("OTP Verify Error:", error)
    return { error: "An unexpected error occurred." }
  }
}
