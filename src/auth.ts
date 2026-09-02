import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow linking OAuth accounts to existing credential accounts
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.workspaceId = user.workspaceId as string | null
      }
      
      // Auto-create workspace for OAuth users if they don't have one
      if (token.id && !token.workspaceId) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          if (dbUser.workspaceId) {
            token.workspaceId = dbUser.workspaceId
            token.role = dbUser.role
          } else {
            const workspace = await prisma.workspace.create({
              data: { name: `${dbUser.name || 'Personal'} Workspace` }
            })
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { workspaceId: workspace.id, role: "ADMIN" }
            })
            token.workspaceId = workspace.id
            token.role = "ADMIN"
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.workspaceId = token.workspaceId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  }
})
