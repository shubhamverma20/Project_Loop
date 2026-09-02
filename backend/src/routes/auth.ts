import { Router } from "express"
import { registerUser, loginUser, googleAuthUser } from "../services/auth.js"
import { requestPasswordReset, verifyOtpAndResetPassword } from "../services/otp.js"
import { requireAuth, AuthRequest } from "../middleware/auth.js"

const router = Router()

router.post("/google", async (req, res, next) => {
  try {
    const { email, name, image } = req.body
    const result = await googleAuthUser({ email, name, image })
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.cookie("session_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/register", async (req, res, next) => {
  try {
    const result = await registerUser(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.cookie("session_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/login", async (req, res, next) => {
  try {
    const result = await loginUser(req.body)
    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }

    res.cookie("session_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post("/logout", (req, res) => {
  res.clearCookie("session_token")
  return res.status(200).json({ success: true, message: "Logged out successfully" })
})

router.get("/me", requireAuth, (req: AuthRequest, res) => {
  return res.status(200).json({ user: req.user })
})

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body
    const result = await requestPasswordReset(email)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ success: true, message: "OTP sent to your email address" })
  } catch (err) {
    next(err)
  }
})

router.post("/resend-otp", async (req, res, next) => {
  try {
    const { email } = req.body
    const result = await requestPasswordReset(email)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ success: true, message: "New OTP sent to your email address" })
  } catch (err) {
    next(err)
  }
})

router.post("/verify-otp", async (req, res, next) => {
  try {
    const result = await verifyOtpAndResetPassword(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ success: true, message: "Password reset successfully" })
  } catch (err) {
    next(err)
  }
})

router.post("/reset-password", async (req, res, next) => {
  try {
    const result = await verifyOtpAndResetPassword(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ success: true, message: "Password reset successfully" })
  } catch (err) {
    next(err)
  }
})

export default router
