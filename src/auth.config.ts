import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') || 
                            nextUrl.pathname.startsWith('/feedback') || 
                            nextUrl.pathname.startsWith('/themes')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to unauthenticated page
      } else if (isLoggedIn) {
        if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup') || nextUrl.pathname.startsWith('/forgot-password')) {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
      }
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
