import { NextResponse } from "next/server"
import { verifyAndResetPassword } from "@/app/actions/auth-otp"

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json()
    if (!newPassword || typeof newPassword !== "string" || !newPassword.trim()) {
      return NextResponse.json({ error: "New password is required" }, { status: 400 })
    }
    const formData = new FormData()
    formData.append("email", email || "")
    formData.append("otp", otp || "")
    formData.append("newPassword", newPassword)
    const result = await verifyAndResetPassword({}, formData)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
  }
}
