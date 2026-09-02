import type { NextAuthConfig } from 'next-auth'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/feedback',
  '/explorer',
  '/themes',
  '/settings',
  '/insights',
  '/reports',
  '/sources',
  '/data-sources',
]

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnProtectedArea = PROTECTED_ROUTES.some(route => nextUrl.pathname.startsWith(route))

      if (isOnProtectedArea) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login
      } else if (isLoggedIn) {
        if (
          nextUrl.pathname.startsWith('/login') ||
          nextUrl.pathname.startsWith('/signup') ||
          nextUrl.pathname.startsWith('/register') ||
          nextUrl.pathname.startsWith('/forgot-password')
        ) {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
      }
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
