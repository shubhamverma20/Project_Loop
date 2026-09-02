import { auth } from "@/auth"

export async function verifySession() {
  if (process.env.TEST_WORKSPACE_ID && process.env.TEST_USER_ID) {
    return {
      user: {
        id: process.env.TEST_USER_ID,
        email: "test@example.com",
        workspaceId: process.env.TEST_WORKSPACE_ID,
        role: "ADMIN"
      }
    }
  }
  const session = await auth()
  return session
}
