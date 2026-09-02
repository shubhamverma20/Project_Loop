import { z } from "zod"

export const UserSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const UserLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const FeedbackInputSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000, "Content too long"),
  channel: z.string().trim().optional().default("API"),
  customerLabel: z.string().trim().optional().nullable(),
  sourceRef: z.string().trim().optional().nullable(),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const VerifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
})

export const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})
