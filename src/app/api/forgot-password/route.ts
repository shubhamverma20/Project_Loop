import { NextResponse } from "next/server"
import { requestPasswordResetOtp } from "@/app/actions/auth-otp"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const formData = new FormData()
    formData.append("email", email)
    const result = await requestPasswordResetOtp({}, formData)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to process forgot password request" }, { status: 500 })
  }
}
