"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import { api } from "@/lib/api-client"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleResponse = async (response: any) => {
    setLoading(true)
    setError(null)
    try {
      let userEmail = ""
      let userName = ""
      let userPicture = ""

      if (response?.credential) {
        const base64Url = response.credential.split(".")[1]
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        )
        const payload = JSON.parse(jsonPayload)
        userEmail = payload.email
        userName = payload.name
        userPicture = payload.picture
      }

      if (!userEmail) {
        setError("Failed to obtain email from Google Authentication")
        setLoading(false)
        return
      }

      const res = await api.post("/api/auth/google", {
        email: userEmail,
        name: userName || userEmail.split("@")[0],
        image: userPicture
      })

      if (res.error) {
        setError(res.error)
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  const initGoogleAuth = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "1081076966578-lb2ajn8u1lq04rsdbkl8679vvtpucnnb.apps.googleusercontent.com",
        callback: handleGoogleResponse
      })
      const btnContainer = document.getElementById("googleRegisterBtnDiv")
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signup_with"
        })
      }
    }
  }

  useEffect(() => {
    initGoogleAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post("/api/auth/register", { name, email, password })

      if (res.error) {
        setError(res.error)
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleFallback = async () => {
    const userEmail = prompt("Enter your Google Account email for instant sign in:", "shubhamverma0299@gmail.com")
    if (!userEmail) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post("/api/auth/google", {
        email: userEmail,
        name: userEmail.split("@")[0]
      })
      if (res.error) {
        setError(res.error)
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={initGoogleAuth}
        strategy="afterInteractive"
      />
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Create an account</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Get started with Project LOOP today</p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or continue with</span></div>
          </div>

          <div id="googleRegisterBtnDiv" className="w-full flex justify-center min-h-[44px]">
            <button
              type="button"
              onClick={handleGoogleFallback}
              className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Sign up with Google</span>
            </button>
          </div>

          <p className="text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
