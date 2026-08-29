import { auth } from "@/auth"

export async function verifySession() {
  const session = await auth()
  return session
}
