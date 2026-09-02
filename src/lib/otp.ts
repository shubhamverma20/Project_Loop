import bcrypt from "bcryptjs"

export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashOtp(otp: string): Promise<string> {
  return await bcrypt.hash(otp, 10)
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(otp, hash)
}
