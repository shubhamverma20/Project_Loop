import { prisma } from "../lib/prisma.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendOtpEmail } from "../lib/brevo.js"
import { subMinutes } from "date-fns"
import { z } from "zod"

const requestOtpSchema = z.object({
  email: z.string().email("Invalid email address")
})

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long")
})

function generateSecureOtp(): string {
  const num = crypto.randomInt(0, 1000000)
  return num.toString().padStart(6, "0")
}

export async function requestPasswordReset(emailInput: string) {
  const validated = requestOtpSchema.safeParse({ email: emailInput })
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || "Invalid email address" }
  }

  const normalizedEmail = emailInput.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (!user) {
    return { success: true }
  }

  // 1-minute rate limiting cooldown
  const oneMinuteAgo = subMinutes(new Date(), 1)
  const recentRequest = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      purpose: "PASSWORD_RESET",
      createdAt: { gte: oneMinuteAgo }
    }
  })

  if (recentRequest) {
    return { success: false, error: "Please wait before requesting another OTP." }
  }

  const otp = generateSecureOtp()
  const otpHash = await bcrypt.hash(otp, 10)

  // Invalidate old OTPs for password reset
  await prisma.otpVerification.deleteMany({
    where: {
      email: normalizedEmail,
      purpose: "PASSWORD_RESET"
    }
  })

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

  const emailSent = await sendOtpEmail(normalizedEmail, otp)
  if (!emailSent) {
    return { success: false, error: "Failed to send email. Please check configuration." }
  }

  return { success: true }
}

export async function verifyOtpAndResetPassword(payload: unknown) {
  const validated = verifyOtpSchema.safeParse(payload)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || "Invalid verification payload" }
  }

  const { email, otp, newPassword } = validated.data
  const normalizedEmail = email.toLowerCase().trim()

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
    return { success: false, error: "No active OTP found. Please request a new one." }
  }

  if (otpRecord.expiresAt < new Date()) {
    return { success: false, error: "OTP has expired. Please request a new one." }
  }

  if (otpRecord.attempts >= 5) {
    await prisma.otpVerification.delete({ where: { id: otpRecord.id } })
    return { success: false, error: "Too many failed attempts. Please request a new OTP." }
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash)
  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    })
    return { success: false, error: "Invalid OTP." }
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: { passwordHash: newPasswordHash }
  })

  await prisma.otpVerification.delete({ where: { id: otpRecord.id } })
  return { success: true }
}
