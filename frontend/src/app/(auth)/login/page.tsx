"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { api } from "@/lib/api-client"

declare global {
  interface Window {
    google?: any
  }
}

export default function LoginPage() {
  const router = useRouter()
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
        setError("Unable to sign in with Google. Please try again.")
        setLoading(false)
        return
      }

      const res = await api.post("/api/auth/google", {
        email: userEmail,
        name: userName || userEmail.split("@")[0],
        image: userPicture
      })

      if (res.error) {
        setError(res.error || "Unable to sign in with Google. Please try again.")
      } else {
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Unable to sign in with Google. Please try again.")
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
      const btnContainer = document.getElementById("googleBtnDiv")
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signin_with"
        })
      }
    }
  }

  useEffect(() => {
    initGoogleAuth()
  }, [])

  const handleGoogleFallbackClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to your Project LOOP workspace</p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-center">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-sm text-blue-600 dark:text-blue-400">
              Signing in with Google...
            </div>
          )}

          <div id="googleBtnDiv" className="w-full flex justify-center min-h-[44px]">
            <button
              type="button"
              onClick={handleGoogleFallbackClick}
              className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
