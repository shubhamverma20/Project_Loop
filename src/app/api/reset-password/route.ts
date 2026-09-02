import { NextResponse } from "next/server"
import { verifyAndResetPassword } from "@/app/actions/auth-otp"

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json()
    const formData = new FormData()
    formData.append("email", email || "")
    formData.append("otp", otp || "")
    formData.append("newPassword", newPassword || "")
    const result = await verifyAndResetPassword({}, formData)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
